const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');          // ← ADD for dynamic transporter
const db = require('../config/db');
const transporter = require('../config/smtpServer'); // global fallback

const DATA_DIR = path.join(__dirname, '../rsvpEmailData');
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const EMAIL_DELAY_MS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function personalizeBodyOld(template, recipient) {
    return template
        .replace(/{{PERSON_NAME}}/g, recipient.NAME || 'Guest')
        .replace(/{{EMAIL}}/g, recipient.EMAIL || '')
        .replace(/{{CONTACT_NO}}/g, recipient.CONTACT_NO || '')
        .replace(/{{EVENT_SYS_ID}}/g, recipient.EVENT_SYS_ID || '')
        .replace(/{{RSVP_INV_SYS_ID}}/g, recipient.RSVP_INV_SYS_ID || '')
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
        .replace(/{{EVENT_DESCRIPTION}}/g, recipient.EVENT_DESCRIPTION || '');
}

function personalizeBody(template, columnList, recipient, userDetails) {
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
    .replace(/{{EVENT_END_DATE}}/g, recipient.EVENT_END_DATE || '')
    .replace(/{{EVENT_DESCRIPTION}}/g, recipient.ABOUT_THE_EVENT || '');

  const allFields = [
    ...(userDetails.STANDARD_JSON_DOCUMENT || []),
    ...(userDetails.CUSTOM_JSON_DOCUMENT || [])
  ];

  allFields.forEach(field => {
    const label    = field.LABEL;
    const dbColumn = field.DATABASE_COLUMN;
    let value = '';
    if (userDetails[dbColumn] !== undefined && userDetails[dbColumn] !== null) {
      value = userDetails[dbColumn];
    } else if (userDetails.json_document && userDetails.json_document[dbColumn] !== undefined) {
      value = userDetails.json_document[dbColumn];
    }
    result = result.replace(new RegExp(`{{${label}}}`, 'g'), value || '');
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1 — unchanged
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAndStoreRSVPRecords(EVENT_SYS_ID) {
    let conn;
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        conn = await db.getConnection();
        const [result] = await conn.execute(
            "CALL USP_GET_EVENT_RSVP_INVITATION_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
            ['VIEW_EVENT_RSVP_INVITATION_LIST', "VIEW_ALL", EVENT_SYS_ID]
        );
        const decoded = result[0][0].JSON_VALUE;
        if (decoded.status !== 'true') {
            throw new Error(`SP returned error for EVENT_SYS_ID: ${EVENT_SYS_ID}`);
        }
        const records = decoded.response;
        const filePath = path.join(DATA_DIR, `rsvp_${EVENT_SYS_ID}.json`);
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
        console.log(`[RSVP] Stored ${records.length} records → ${filePath}`);
        return records.length;
    } finally {
        if (conn) conn.release();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2 — dynamic transporter added, rest unchanged
// ─────────────────────────────────────────────────────────────────────────────
async function sendRSVPEmailsFromFile(EVENT_SYS_ID) {
    const filePath = path.join(DATA_DIR, `rsvp_${EVENT_SYS_ID}.json`);
    let conn;
    let sent = 0;
    let failed = 0;

    try {
        conn = await db.getConnection();

        // ── Fetch email template (also contains SMTP fields) ──────────────
        const [mailResponse] = await conn.execute(
            "CALL USP_GET_MAIL_TEMPLATE_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
            ['VIEW_EMAIL_CONFIG_DETAILS', 'RSVP Invitation Email', EVENT_SYS_ID, 0]
        );
        const mailResponseDecoded = mailResponse[0][0].JSON_VALUE;
        if (mailResponseDecoded.status !== 'true') {
            throw new Error(`Email template SP error for EVENT_SYS_ID: ${EVENT_SYS_ID}`);
        }
        const emailTemplate = mailResponseDecoded.response[0];

        // ── Build dynamic transporter from SP SMTP fields ─────────────────
        // SP field names: SMTP_SERVER_NAME, SMTP_PORT, SMTP_USERNAME,
        //                 SMTP_PASSWORD, SENDER_NAME
        // Falls back to global transporter if any required field is missing.
        let activeTransporter;
        let fromAddress = `"IIDEAS Events" <Dev@cssoffice.sg>`; // default FROM

        if (emailTemplate.SMTP_SERVER_NAME && emailTemplate.SMTP_USERNAME && emailTemplate.SMTP_PASSWORD) {
            const port   = Number(emailTemplate.SMTP_PORT) || 587;
            const secure = port === 465;

            console.log(`[RSVP] Building dynamic transporter | ${emailTemplate.SMTP_SERVER_NAME}:${port}`);

            activeTransporter = nodemailer.createTransport({
                host:   emailTemplate.SMTP_SERVER_NAME,
                port:   port,
                secure: secure,
                auth: {
                    user: emailTemplate.SMTP_USERNAME,
                    pass: emailTemplate.SMTP_PASSWORD,
                },
                tls: { rejectUnauthorized: false },
            });

            // Verify once before the send loop — fail fast if creds are wrong
            await activeTransporter.verify();
            console.log(`[RSVP] ✅ SMTP verified | ${emailTemplate.SMTP_SERVER_NAME}`);

            // Build FROM from SP sender details
            fromAddress = emailTemplate.SENDER_NAME
                ? `"${emailTemplate.SENDER_NAME}" <${emailTemplate.SMTP_USERNAME}>`
                : `"IIDEAS Events" <${emailTemplate.SMTP_USERNAME}>`;

        } else {
            console.log(`[RSVP] SMTP fields missing in emailTemplate — using global transporter`);
            activeTransporter = transporter;
        }

        // ── Load recipients + event data ──────────────────────────────────
        const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`[RSVP] Starting send | EVENT=${EVENT_SYS_ID} | Total=${records.length} | BatchSize=${BATCH_SIZE}`);

        const [rows] = await conn.execute(
            "CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
            ['VIEW_EVENT_SPECIFIC_INFO', "SPECIFIC", EVENT_SYS_ID]
        );

        // ── Send loop — unchanged logic, just uses activeTransporter ─────
        for (let i = 0; i < records.length; i++) {
            const recipient = records[i];
            try {
                const eventResultData = rows[0][0].JSON_VALUE.response[0];
                const [userRows] = await conn.execute(
                    "CALL USP_GET_SPECIFIC_EVENT_AND_RSVP_WISE_DETAILS_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
                    ['VIEW_EVENT_AND_RSVP_WISE_DETAILS', "SPECIFIC", EVENT_SYS_ID, recipient.RSVP_INV_SYS_ID]
                );
                const userResultData = userRows[0][0].JSON_VALUE.response[0];

                const personalizedBody = personalizeBody(
                    emailTemplate.MAIL_BODY,
                    emailTemplate.ALL_COLUMN_LIST,
                    eventResultData,
                    userResultData
                );

                const unsubToken = crypto
                    .createHash('sha256')
                    .update(`${recipient.EMAIL}-${recipient.RSVP_INV_SYS_ID}-${EVENT_SYS_ID}`)
                    .digest('hex');

                await activeTransporter.sendMail({   // ← was: transporter.sendMail
                    from:    fromAddress,             // ← was: hardcoded string
                    to:      recipient.EMAIL,
                    subject: emailTemplate.SUBJECT,
                    html:    personalizedBody,
                    headers: {
                        'List-Unsubscribe':      `<mailto:unsubscribe@cssoffice.sg?subject=unsubscribe-${unsubToken}>`,
                        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                        'Message-ID':            `<rsvp-${EVENT_SYS_ID}-${recipient.RSVP_INV_SYS_ID}-${Date.now()}@cssoffice.sg>`,
                        'Precedence':            'bulk',
                        'X-Mailer':              'IIDEAS-Events-Mailer',
                    },
                });

                sent++;
                if (sent % 100 === 0) {
                    console.log(`[RSVP] EVENT=${EVENT_SYS_ID} | Sent=${sent}/${records.length}`);
                }
            } catch (mailErr) {
                failed++;
                console.error(`[RSVP] Failed #${i + 1} (${recipient.EMAIL}): ${mailErr.message}`);
            }

            const isEndOfBatch = (i + 1) % BATCH_SIZE === 0;
            const isLastEmail  = i === records.length - 1;

            if (isEndOfBatch && !isLastEmail) {
                console.log(`[RSVP] Batch complete (${i + 1}/${records.length}) — pausing ${BATCH_DELAY_MS}ms`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            } else {
                await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY_MS));
            }
        }

        console.log(`[RSVP] COMPLETED EVENT=${EVENT_SYS_ID} | Sent=${sent} | Failed=${failed}`);

    } catch (err) {
        console.error(`[RSVP] sendRSVPEmailsFromFile error: ${err.message}`);
    } finally {
        if (conn) conn.release();
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[RSVP] Cleaned up file: ${filePath}`);
        }
    }
}

module.exports = {
    fetchAndStoreRSVPRecords,
    sendRSVPEmailsFromFile
};