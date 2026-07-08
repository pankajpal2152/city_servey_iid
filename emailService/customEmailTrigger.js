const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const transporter = require('../config/smtpServer');

const DATA_DIR = path.join(__dirname, '../customEmailData');
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const EMAIL_DELAY_MS = 100;
// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Personalize the email body per recipient
// Your SP returns MAIL_BODY with placeholders like {{NAME}}, {{EMAIL}} etc.
// This replaces them with actual recipient data — makes every email unique.
// ─────────────────────────────────────────────────────────────────────────────
function personalizeBody(template, recipient) {
    return template
        .replace(/{{EVENT_NAME}}/g, recipient.EVENT_NAME || '')
        .replace(/{{EVENT_CATEGORY}}/g, recipient.EVENT_CATEGORY || '')
        .replace(/{{EVENT_ADDRESS}}/g, `${recipient.EVENT_PRIMARY_ADDRESS},${recipient.EVENT_COUNTRY},${recipient.EVENT_POSTCODE},` || '')
        .replace(/{{EVENT_TYPE}}/g, recipient.EVENT_TYPE || '')
        .replace(/{{FULL_DATE}}/g, `${recipient.EVENT_START_DATE} ${recipient.EVENT_START_TIME} to ${recipient.EVENT_END_DATE}${recipient.EVENT_END_TIME}` || '')
        .replace(/{{EVENT_VENUE}}/g, recipient.EVENT_VENUE || '')
        .replace(/{{START_TIME}}/g, recipient.EVENT_START_TIME || '')
        .replace(/{{END_TIME}}/g, recipient.EVENT_END_TIME || '')
        .replace(/{{START_DATE}}/g, recipient.EVENT_START_DATE || '')
        .replace(/{{END_DATE}}/g, recipient.EVENT_END_DATE || '')
        .replace(/{{EVENT_DESCRIPTION}}/g, recipient.ABOUT_THE_EVENT || '')
}
// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Replace {{TOKEN}} placeholders in HTML body & subject
// Uses STANDARD_JSON_DOCUMENT mapping + event info + attendee fields
// ─────────────────────────────────────────────────────────────────────────────
function bindTokens(text, attendee, eventInfo, standardFields) {
    if (!text) return '';
    let result = text;

    // 1️⃣  Standard fields from SP mapping: { LABEL, DATABASE_COLUMN }
    //     Replace {{PERSON_NAME}}, {{PERSON_EMAIL}}, {{PERSON_CONTACT_NO}} etc.
    if (Array.isArray(standardFields)) {
        for (const field of standardFields) {
            const col = field.DATABASE_COLUMN;
            const val = attendee[col] ?? '';
            result = result.replace(new RegExp(`\\{\\{${col}\\}\\}`, 'gi'), val);
        }
    }

    // 2️⃣  json_document sub-fields (same keys, nested inside attendee row)
    if (attendee.json_document && typeof attendee.json_document === 'object') {
        for (const [key, val] of Object.entries(attendee.json_document)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), val ?? '');
        }
    }

    // 3️⃣  QR code & registration tokens
    result = result.replace(/\{\{REGISTRATION_QR_CODE\}\}/gi, attendee.REGISTRATION_QR_CODE ?? '');
    result = result.replace(/\{\{REGISTRATION_SYS_ID\}\}/gi, attendee.REGISTRATION_SYS_ID ?? '');
    result = result.replace(/\{\{EMP_ID\}\}/gi, attendee.EMP_ID ?? '');

    // 4️⃣  Event-level tokens
    if (eventInfo) {
        const eventTokens = {
            EVENT_NAME: eventInfo.EVENT_NAME ?? '',
            EVENT_DATE: eventInfo.EVENT_START_DATE ?? '',
            EVENT_START_DATE: eventInfo.EVENT_START_DATE ?? '',
            EVENT_END_DATE: eventInfo.EVENT_END_DATE ?? '',
            EVENT_START_TIME: eventInfo.EVENT_START_TIME ?? '',
            EVENT_END_TIME: eventInfo.EVENT_END_TIME ?? '',
            EVENT_VENUE: eventInfo.EVENT_VENUE ?? '',
            EVENT_LOCATION: eventInfo.EVENT_VENUE ?? '',
            EVENT_COUNTRY: eventInfo.EVENT_COUNTRY ?? '',
            EVENT_CATEGORY: eventInfo.EVENT_CATEGORY ?? '',
            EVENT_PRIMARY_ADDRESS: eventInfo.EVENT_PRIMARY_ADDRESS ?? '',
            ABOUT_THE_EVENT: eventInfo.ABOUT_THE_EVENT ?? '',
        };
        for (const [token, val] of Object.entries(eventTokens)) {
            result = result.replace(new RegExp(`\\{\\{${token}\\}\\}`, 'gi'), val);
        }
    }

    // 5️⃣  Clean up any remaining unmatched {{...}} tokens
    result = result.replace(/\{\{[^}]+\}\}/g, '');

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Pick the right template from the list
// Priority: EMAIL_TRIGGER_EVENT match → TEMPLATE_NAME match → first template
// ─────────────────────────────────────────────────────────────────────────────
function resolveTemplate(templates, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME) {
    if (!templates || !templates.length) return null;

    // First: try matching BOTH conditions (AND)
    if (EMAIL_TRIGGER_EVENT && TEMPLATE_NAME) {
        const match = templates.find(t =>
            t.EMAIL_TRIGGER_EVENT?.trim().toLowerCase() === EMAIL_TRIGGER_EVENT.trim().toLowerCase() &&
            t.TEMPLATE_NAME?.trim().toLowerCase() === TEMPLATE_NAME.trim().toLowerCase()
        );
        if (match) return match;
    }

    return templates[0]; // fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1 — Fetch all data from SPs → save queue file
// Returns { totalQueued, templateName, emailSubject }
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAndStoreCustomEmailRecords(EVENT_SYS_ID, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME) {
    let conn;
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        conn = await db.getConnection();

        // ── Call all 3 SPs in parallel ──────────────────────────────────────
        const [attendeesResult, eventInfoResult, templatesResult] = await Promise.all([

            // SP 1: All registered attendees
            conn.execute(
                "CALL USP_GET_EVENT_REGISTERED_LIST(?, ?, ?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
                ['VIEW_EVENT_REGISTERED_LIST', 'VIEW_ALL', EVENT_SYS_ID, null, null, null, null]
            ),

            // SP 2: Event-specific details (name, venue, dates)
            conn.execute(
                "CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
                ['VIEW_EVENT_SPECIFIC_INFO', 'SPECIFIC', EVENT_SYS_ID]
            ),

            // SP 3: All email templates for this event
            conn.execute(
                "CALL USP_GET_VIEW_EVENT_EMAIL_TEMPLATE_DESIGN_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
                ['VIEW_EVENT_EMAIL_TEMPLATE_DESIGN_INFO', 'VIEW_ALL', EVENT_SYS_ID, '1']
            ),
        ]);

        // ── Parse SP 1: Attendees ────────────────────────────────────────────
        const attendeesDecoded = attendeesResult[0][0][0].JSON_VALUE;
        if (attendeesDecoded.status !== 'true') {
            throw new Error(`Attendees SP error for EVENT_SYS_ID: ${EVENT_SYS_ID}`);
        }
        const attendees = (attendeesDecoded.response ?? []).map(a => ({
            ...a,
            json_document:
                typeof a.json_document === 'string'
                    ? JSON.parse(a.json_document)
                    : (a.json_document ?? {}),
        }));
        const standardFields = attendeesDecoded.STANDARD_JSON_DOCUMENT ?? [];

        // ── Parse SP 2: Event info ───────────────────────────────────────────
        const eventInfoDecoded = eventInfoResult[0][0][0].JSON_VALUE;
        let eventInfo = null;
        if (Array.isArray(eventInfoDecoded)) {
            eventInfo = eventInfoDecoded[0] ?? null;
        } else if (eventInfoDecoded?.status === 'true') {
            const resp = eventInfoDecoded.response;
            eventInfo = Array.isArray(resp) ? resp[0] : resp;
        }

        // ── Parse SP 3: Email templates ──────────────────────────────────────
        const templatesDecoded = templatesResult[0][0][0].JSON_VALUE;
        if (templatesDecoded.status !== 'true') {
            throw new Error(`Email templates SP error for EVENT_SYS_ID: ${EVENT_SYS_ID}`);
        }
        const templates = templatesDecoded.response ?? [];

        // ── Resolve which template to use ────────────────────────────────────
        const template = resolveTemplate(templates, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME);
        if (!template) {
            throw new Error('No matching email template found.');
        }
        if (!template.raw_html_json_document) {
            throw new Error(`Template "${template.TEMPLATE_NAME}" has no HTML content.`);
        }

        // ── Build per-attendee queue records ─────────────────────────────────
        const queue = [];
        for (const attendee of attendees) {
            if (!attendee.PERSON_EMAIL) continue; // skip rows with no email

            queue.push({
                EVENT_SYS_ID,
                REGISTRATION_SYS_ID: attendee.REGISTRATION_SYS_ID,
                PERSON_NAME: attendee.PERSON_NAME,
                to: attendee.PERSON_EMAIL,
                subject: bindTokens(
                    template.EMAIL_SUBJECT || template.json_document?.subject || 'Event Notification',
                    attendee, eventInfo, standardFields
                ),
                html: bindTokens(
                    template.raw_html_json_document,
                    attendee, eventInfo, standardFields
                ),
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            });
        }

        // ── Write queue to file ───────────────────────────────────────────────
        const filePath = path.join(DATA_DIR, `custom_${EVENT_SYS_ID}_${Date.now()}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ filePath, queue }, null, 2), 'utf8');

        console.log(`[CUSTOM-EMAIL] Queued ${queue.length} record(s) → ${filePath}`);
        console.log(`[CUSTOM-EMAIL] Template: "${template.TEMPLATE_NAME}" | Trigger: "${template.EMAIL_TRIGGER_EVENT || 'Manual'}"`);

        return {
            filePath,
            totalQueued: queue.length,
            totalSkipped: attendees.length - queue.length,
            templateName: template.TEMPLATE_NAME,
            emailSubject: template.EMAIL_SUBJECT || template.json_document?.subject,
        };

    } finally {
        if (conn) conn.release();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2 — Read queue file → Send emails in batches (background)
// ─────────────────────────────────────────────────────────────────────────────
async function sendCustomEmailsFromFile(filePath, EVENT_SYS_ID) {
    let sent = 0;
    let failed = 0;

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`[CUSTOM-EMAIL] Queue file not found: ${filePath}`);
            return;
        }

        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const queue = fileData.queue ?? [];

        console.log(`[CUSTOM-EMAIL] Starting send | EVENT=${EVENT_SYS_ID} | Total=${queue.length} | BatchSize=${BATCH_SIZE}`);
        const [rows] = await conn.execute(
            "CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
            ['VIEW_EVENT_SPECIFIC_INFO', "SPECIFIC", EVENT_SYS_ID]
        );
        let personalizeBody = null;
        if (rows && rows[0] && rows[0][0]) {
            const result = rows[0][0].JSON_VALUE.response[0];
            personalizedBody = personalizeBody(item.html, result);
        }
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            const [userRows] = await conn.execute(
                "CALL USP_GET_EVENT_REGISTERED_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
                [
                    'VIEW_EVENT_REGISTERED_LIST',
                    "SPECIFIC",
                    EVENT_SYS_ID,
                    item.REGISTRATION_SYS_ID,
                ]
            );
            const userResponseData = userRows[0][0].JSON_VALUE;

            try {
                // Unique token for unsubscribe / Message-ID (mirrors rsvpInvitationEmail pattern)
                const unsubToken = crypto
                    .createHash('sha256')
                    .update(`${item.to}-${item.REGISTRATION_SYS_ID}-${EVENT_SYS_ID}`)
                    .digest('hex');

                await transporter.sendMail({
                    from: `"IIDEAS Events" <Dev@cssoffice.sg>`,
                    to: item.to,
                    subject: item.subject,
                    html: personalizeBody,
                    headers: {
                        'List-Unsubscribe': `<mailto:unsubscribe@cssoffice.sg?subject=unsubscribe-${unsubToken}>`,
                        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                        'Message-ID': `<custom-${EVENT_SYS_ID}-${item.REGISTRATION_SYS_ID}-${Date.now()}@cssoffice.sg>`,
                        'Precedence': 'bulk',
                        'X-Mailer': 'IIDEAS-Events-Mailer',
                    },
                });

                sent++;
                if (sent % 100 === 0) {
                    console.log(`[CUSTOM-EMAIL] EVENT=${EVENT_SYS_ID} | Sent=${sent}/${queue.length}`);
                }

            } catch (mailErr) {
                failed++;
                console.error(`[CUSTOM-EMAIL] Failed #${i + 1} (${item.to}): ${mailErr.message}`);
            }

            // Batching: long pause every BATCH_SIZE, short pause between each email
            const isEndOfBatch = (i + 1) % BATCH_SIZE === 0;
            const isLastEmail = i === queue.length - 1;

            if (isEndOfBatch && !isLastEmail) {
                console.log(`[CUSTOM-EMAIL] Batch complete (${i + 1}/${queue.length}) — pausing ${BATCH_DELAY_MS}ms`);
                await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
            } else {
                await new Promise(r => setTimeout(r, EMAIL_DELAY_MS));
            }
        }

        console.log(`[CUSTOM-EMAIL] COMPLETED EVENT=${EVENT_SYS_ID} | Sent=${sent} | Failed=${failed}`);

    } catch (err) {
        console.error(`[CUSTOM-EMAIL] sendCustomEmailsFromFile error: ${err.message}`);
    } finally {
        // Clean up queue file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[CUSTOM-EMAIL] Cleaned up file: ${filePath}`);
        }
    }
}

module.exports = {
    fetchAndStoreCustomEmailRecords,
    sendCustomEmailsFromFile,
};