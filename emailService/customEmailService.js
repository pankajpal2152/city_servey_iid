'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const transporter = require('../config/smtpServer'); // global fallback
const { generateBadgePdfBuffer } = require('./pdfMaker.js');

const DATA_DIR = path.join(__dirname, '../customEmailData');
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const EMAIL_DELAY_MS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — personalizeBody  (mirrors standard emailService exactly)
// Replaces event-level tokens AND per-attendee dynamic field tokens
// ─────────────────────────────────────────────────────────────────────────────
function personalizeBody(template, columnList, recipient, userDetails, REGISTRATION_SYS_ID) {
    function generateRandom8Digits() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    let result = template
        .replace(/{{EVENT_NAME}}/g, recipient.EVENT_NAME || '')
        .replace(/{{EVENT_CATEGORY}}/g, recipient.EVENT_CATEGORY || '')
        .replace(/{{EVENT_ADDRESS}}/g, `${recipient.EVENT_PRIMARY_ADDRESS || ''}, ${recipient.EVENT_COUNTRY || ''}, ${recipient.EVENT_POSTCODE || ''}`)
        .replace(/{{EVENT_TYPE}}/g, recipient.EVENT_TYPE || '')
        .replace(/{{FULL_DATE}}/g, `${recipient.EVENT_START_DATE || ''} ${recipient.EVENT_START_TIME || ''} to ${recipient.EVENT_END_DATE || ''} ${recipient.EVENT_END_TIME || ''}`)
        .replace(/{{EVENT_VENUE}}/g, recipient.EVENT_VENUE || '')
        .replace(/{{START_TIME}}/g, recipient.EVENT_START_TIME || '')
        .replace(/{{END_TIME}}/g, recipient.EVENT_END_TIME || '')
        .replace(/{{START_DATE}}/g, recipient.EVENT_START_DATE || '')
        .replace(/{{END_DATE}}/g, recipient.EVENT_END_DATE || '')
        .replace(/{{EVENT_DESCRIPTION}}/g, recipient.ABOUT_THE_EVENT || '');

    // ── Dynamic login URL injection (only when access auth is NOT required) ──
    const accessFlag = recipient.ACCESS_AUTHORIZATION_FLAG;
    const isAuthRequired = accessFlag == '1' || accessFlag == 1;

    if (!isAuthRequired) {
        const registrationSysId = REGISTRATION_SYS_ID || '';
        if (registrationSysId) {
            result = result.replace(
                /(href=")(https?:\/\/[^"]*?\/\d+\/login)\/?(")/g,
                (match, prefix, url, suffix) => {
                    const first8 = generateRandom8Digits();
                    const last8 = generateRandom8Digits();
                    return `${prefix}${url}/${first8}${registrationSysId}${last8}${suffix}`;
                }
            );
        }
    }

    // ── Per-attendee fields from STANDARD + CUSTOM JSON documents ──────────
    const allFields = [
        ...(userDetails.STANDARD_JSON_DOCUMENT || []),
        ...(userDetails.CUSTOM_JSON_DOCUMENT || []),
    ];
    allFields.forEach(field => {
        const label = field.LABEL;
        const dbColumn = field.DATABASE_COLUMN;
        let value = '';
        if (userDetails[dbColumn] !== undefined && userDetails[dbColumn] !== null) {
            value = userDetails[dbColumn];
        } else if (userDetails.json_document?.[dbColumn] !== undefined) {
            value = userDetails.json_document[dbColumn];
        }
        result = result.replace(new RegExp(`{{${label}}}`, 'g'), value || '');
    });

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — bindTokens  (used during queue build — event + attendee tokens)
// ─────────────────────────────────────────────────────────────────────────────
function bindTokens(text, attendee, eventInfo, standardFields) {
    if (!text) return '';
    let result = text;

    if (Array.isArray(standardFields)) {
        for (const field of standardFields) {
            const col = field.DATABASE_COLUMN;
            const val = attendee[col] ?? '';
            result = result.replace(new RegExp(`\\{\\{${col}\\}\\}`, 'gi'), val);
        }
    }

    if (attendee.json_document && typeof attendee.json_document === 'object') {
        for (const [key, val] of Object.entries(attendee.json_document)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), val ?? '');
        }
    }

    result = result.replace(/\{\{REGISTRATION_QR_CODE\}\}/gi, attendee.REGISTRATION_QR_CODE ?? '');
    result = result.replace(/\{\{REGISTRATION_SYS_ID\}\}/gi, attendee.REGISTRATION_SYS_ID ?? '');
    result = result.replace(/\{\{EMP_ID\}\}/gi, attendee.EMP_ID ?? '');

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

    result = result.replace(/\{\{[^}]+\}\}/g, '');
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — resolveTemplate
// ─────────────────────────────────────────────────────────────────────────────
function resolveTemplate(templates, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME) {
    if (!templates || !templates.length) return null;

    if (EMAIL_TRIGGER_EVENT && TEMPLATE_NAME) {
        const match = templates.find(t =>
            t.EMAIL_TRIGGER_EVENT?.trim().toLowerCase() === EMAIL_TRIGGER_EVENT.trim().toLowerCase() &&
            t.TEMPLATE_NAME?.trim().toLowerCase() === TEMPLATE_NAME.trim().toLowerCase()
        );
        if (match) return match;
    }

    return templates[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — buildTransporter  (mirrors standard emailService)
// Builds a per-event SMTP transporter from SP fields; falls back to global
// ─────────────────────────────────────────────────────────────────────────────
async function buildTransporter(smtpConfig) {
    const { SMTP_SERVER_NAME, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD } = smtpConfig;

    if (SMTP_SERVER_NAME && SMTP_USERNAME && SMTP_PASSWORD) {
        const port = Number(SMTP_PORT) || 587;
        const secure = port === 465;

        console.log(`[CUSTOM-EMAIL] Building transporter | ${SMTP_SERVER_NAME}:${port} secure=${secure}`);

        const t = nodemailer.createTransport({
            host: SMTP_SERVER_NAME,
            port,
            secure,
            auth: { user: SMTP_USERNAME, pass: SMTP_PASSWORD },
            tls: { rejectUnauthorized: false },
        });

        await t.verify();
        console.log(`[CUSTOM-EMAIL] ✅ SMTP verified | ${SMTP_SERVER_NAME}`);
        return t;
    }

    console.log(`[CUSTOM-EMAIL] SMTP fields missing — using global transporter`);
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1 — Fetch all data from SPs → save queue file
// Returns { filePath, totalQueued, totalSkipped, templateName, emailSubject }
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAndStoreCustomEmailRecords(EVENT_SYS_ID, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME) {
    let conn;
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        conn = await db.getConnection();

        // ── 3 SPs in parallel ──────────────────────────────────────────────────
        const [attendeesResult, eventInfoResult, templatesResult, smtpResult] = await Promise.all([

            conn.execute(
                'CALL USP_GET_EVENT_REGISTERED_LIST(?, ?, ?, ?, ?, ?, ?, @ERRNO, @ERRMSG);',
                ['VIEW_EVENT_REGISTERED_LIST', 'VIEW_ALL', EVENT_SYS_ID, null, null, null, null]
            ),

            conn.execute(
                'CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);',
                ['VIEW_EVENT_SPECIFIC_INFO', 'SPECIFIC', EVENT_SYS_ID]
            ),

            conn.execute(
                'CALL USP_GET_VIEW_EVENT_EMAIL_TEMPLATE_DESIGN_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);',
                ['VIEW_EVENT_EMAIL_TEMPLATE_DESIGN_INFO', 'VIEW_ALL', EVENT_SYS_ID, '1']
            ),

            conn.execute(
                "CALL USP_GET_SPECIFIC_EVENT_WISE_SMTP_CREDENTIALS_ACTIVITY(?, ?, ?,@ERRNO, @ERRMSG);",
                ['VIEW_SMTP_CREDENTIALS', 'SPECIFIC', EVENT_SYS_ID]
            ),
    ]);

        // ── Parse SP 1: Attendees ──────────────────────────────────────────────
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

        // ── Parse SP 2: Event info ─────────────────────────────────────────────
        const eventInfoDecoded = eventInfoResult[0][0][0].JSON_VALUE;
        let eventInfo = null;
        if (Array.isArray(eventInfoDecoded)) {
            eventInfo = eventInfoDecoded[0] ?? null;
        } else if (eventInfoDecoded?.status === 'true') {
            const resp = eventInfoDecoded.response;
            eventInfo = Array.isArray(resp) ? resp[0] : resp;
        }

        // ── Parse SP 3: Email templates ────────────────────────────────────────
        const templatesDecoded = templatesResult[0][0][0].JSON_VALUE;
        if (templatesDecoded.status !== 'true') {
            throw new Error(`Email templates SP error for EVENT_SYS_ID: ${EVENT_SYS_ID}`);
        }
        const templates = templatesDecoded.response ?? [];

        const template = resolveTemplate(templates, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME);
        if (!template) throw new Error('No matching email template found.');
        if (!template.raw_html_json_document) {
            throw new Error(`Template "${template.TEMPLATE_NAME}" has no HTML content.`);
        }

        // ── Capture SMTP + badge config from template row ──────────────────────
        let smtpDetails = smtpResult[0][0][0].JSON_VALUE.response[0];
        console.log(`[CUSTOM-EMAIL] smtpDetails ${smtpDetails}`, smtpDetails);
        // Expected fields on template: SMTP_SERVER_NAME, SMTP_PORT, SMTP_USERNAME,
        //   SMTP_PASSWORD, SENDER_NAME, ATTACH_BADGE_PDF
        const smtpConfig = {
            SMTP_SERVER_NAME: smtpDetails.SMTP_SERVER_NAME || null,
            SMTP_PORT: smtpDetails.SMTP_PORT || null,
            SMTP_USERNAME: smtpDetails.SMTP_USERNAME || null,
            SMTP_PASSWORD: smtpDetails.SMTP_PASSWORD || null,
            SENDER_NAME: smtpDetails.SENDER_NAME || null,
            ATTACH_BADGE_PDF: template.ATTACH_BADGE_PDF || '0',
        };

        // ── Build per-attendee queue records ───────────────────────────────────
        const queue = [];
        for (const attendee of attendees) {
            if (!attendee.PERSON_EMAIL) continue;

            queue.push({
                EVENT_SYS_ID,
                REGISTRATION_SYS_ID: attendee.REGISTRATION_SYS_ID,
                PERSON_NAME: attendee.PERSON_NAME,
                to: attendee.PERSON_EMAIL,
                subject: bindTokens(
                    template.EMAIL_SUBJECT || template.json_document?.subject || 'Event Notification',
                    attendee, eventInfo, standardFields
                ),
                // Store raw HTML — personalizeBody runs per-send with live attendee data
                rawHtml: template.raw_html_json_document,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            });
        }

        const filePath = path.join(DATA_DIR, `custom_${EVENT_SYS_ID}_${Date.now()}.json`);
        fs.writeFileSync(
            filePath,
            JSON.stringify({ filePath, smtpConfig, standardFields, eventInfo, queue }, null, 2),
            'utf8'
        );

        console.log(`[CUSTOM-EMAIL] Queued ${queue.length} record(s) → ${filePath}`);
        console.log(`[CUSTOM-EMAIL] Template: "${template.TEMPLATE_NAME}" | Trigger: "${template.EMAIL_TRIGGER_EVENT || 'Manual'}" | Badge: ${smtpConfig.ATTACH_BADGE_PDF}`);

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
    let conn;

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`[CUSTOM-EMAIL] Queue file not found: ${filePath}`);
            return;
        }

        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const queue = fileData.queue ?? [];
        const smtpConfig = fileData.smtpConfig ?? {};
        const standardFields = fileData.standardFields ?? [];
        const eventInfo = fileData.eventInfo ?? null;

        console.log(`[CUSTOM-EMAIL] Starting send | EVENT=${EVENT_SYS_ID} | Total=${queue.length} | BatchSize=${BATCH_SIZE}`);
        console.log(`[CUSTOM-EMAIL] SMTP: ${smtpConfig.SMTP_SERVER_NAME || '(global)'} | Badge: ${smtpConfig.ATTACH_BADGE_PDF}`);

        // ── Build transporter once for the whole batch ─────────────────────────
        const activeTransporter = await buildTransporter(smtpConfig);

        const fromAddress = smtpConfig.SENDER_NAME && smtpConfig.SMTP_USERNAME
            ? `"${smtpConfig.SENDER_NAME}" <${smtpConfig.SMTP_USERNAME}>`
            : smtpConfig.SMTP_USERNAME
                ? `"Events" <${smtpConfig.SMTP_USERNAME}>`
                : '';

        const shouldAttachBadge = smtpConfig.ATTACH_BADGE_PDF == '1' || smtpConfig.ATTACH_BADGE_PDF == 1;

        conn = await db.getConnection();

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];

            try {
                // ── Fetch live attendee details per registration ──────────────────
                const [userRows] = await conn.execute(
                    'CALL USP_GET_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);',
                    ['VIEW_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS', 'SPECIFIC', EVENT_SYS_ID, item.REGISTRATION_SYS_ID]
                );
                const userResult = userRows[0][0].JSON_VALUE.response[0];

                // ── Personalize body with correct standard emailService logic ─────
                const personalizedHtml = personalizeBody(
                    item.rawHtml,
                    standardFields,
                    eventInfo,
                    userResult,
                    item.REGISTRATION_SYS_ID
                );

                // ── Badge PDF ─────────────────────────────────────────────────────
                let attachments = [];
                if (shouldAttachBadge) {
                    try {
                        const pdfBuffer = await generateBadgePdfBuffer(
                            EVENT_SYS_ID,
                            '1',          // ORGANIZATION_SYS_ID — static
                            eventInfo,
                            userResult
                        );
                        if (pdfBuffer) {
                            const attendeeName = (userResult.FULL_NAME || userResult.PERSON_NAME || 'Attendee')
                                .replace(/\s+/g, '_');
                            attachments = [{
                                filename: `${attendeeName}_Badge.pdf`,
                                content: pdfBuffer,
                                contentType: 'application/pdf',
                            }];
                            console.log(`[CUSTOM-EMAIL] ✅ Badge attached for ${item.to} | ${pdfBuffer.length} bytes`);
                        } else {
                            console.warn(`[CUSTOM-EMAIL] ⚠️ Badge PDF null for ${item.to} — sending without`);
                        }
                    } catch (pdfErr) {
                        // PDF failure must NOT block the email
                        console.error(`[CUSTOM-EMAIL] ⚠️ Badge PDF error (${item.to}): ${pdfErr.message}`);
                    }
                }

                // ── Unique Message-ID token ───────────────────────────────────────
                const unsubToken = crypto
                    .createHash('sha256')
                    .update(`${item.to}-${item.REGISTRATION_SYS_ID}-${EVENT_SYS_ID}`)
                    .digest('hex');

                await activeTransporter.sendMail({
                    from: fromAddress,
                    to: item.to,
                    subject: item.subject,
                    html: personalizedHtml,
                    attachments,
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

            // ── Batching delays ───────────────────────────────────────────────────
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
        if (conn) conn.release();
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