'use strict';

const db          = require('../config/db');
const nodemailer  = require('nodemailer');
const transporter = require('../config/smtpServer'); // global fallback
const crypto      = require('crypto');
const { generateBadgePdfBuffer } = require('./pdfMaker.js');

const FROM_ADDRESS = '"Events" <Dev@cssoffice.sg>';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — personalizeBody (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function personalizeBody(template, columnList, recipient, userDetails, REGISTRATION_SYS_ID) {
  function generateRandom8Digits() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  let result = template
    .replace(/{{EVENT_NAME}}/g,        recipient.EVENT_NAME        || '')
    .replace(/{{EVENT_CATEGORY}}/g,    recipient.EVENT_CATEGORY    || '')
    .replace(/{{EVENT_ADDRESS}}/g,     `${recipient.EVENT_PRIMARY_ADDRESS || ''}, ${recipient.EVENT_COUNTRY || ''}, ${recipient.EVENT_POSTCODE || ''}`)
    .replace(/{{EVENT_TYPE}}/g,        recipient.EVENT_TYPE        || '')
    .replace(/{{FULL_DATE}}/g,         `${recipient.EVENT_START_DATE || ''} ${recipient.EVENT_START_TIME || ''} to ${recipient.EVENT_END_DATE || ''} ${recipient.EVENT_END_TIME || ''}`)
    .replace(/{{EVENT_VENUE}}/g,       recipient.EVENT_VENUE       || '')
    .replace(/{{START_TIME}}/g,        recipient.EVENT_START_TIME  || '')
    .replace(/{{END_TIME}}/g,          recipient.EVENT_END_TIME    || '')
    .replace(/{{START_DATE}}/g,        recipient.EVENT_START_DATE  || '')
    .replace(/{{END_DATE}}/g,          recipient.EVENT_END_DATE    || '')
    .replace(/{{EVENT_DESCRIPTION}}/g, recipient.ABOUT_THE_EVENT   || '');

  const accessFlag = recipient.ACCESS_AUTHORIZATION_FLAG;
  const isAuthRequired = accessFlag == '1' || accessFlag == 1;

  if (!isAuthRequired) {
    const registrationSysId = REGISTRATION_SYS_ID || '';
    if (registrationSysId) {
      result = result.replace(
        /(href=")(https?:\/\/[^"]*?\/\d+\/login)\/?(")/g,
        (match, prefix, url, suffix) => {
          const first8 = generateRandom8Digits();
          const last8  = generateRandom8Digits();
          return `${prefix}${url}/${first8}${registrationSysId}${last8}${suffix}`;
        }
      );
    }
  }

  const allFields = [
    ...(userDetails.STANDARD_JSON_DOCUMENT || []),
    ...(userDetails.CUSTOM_JSON_DOCUMENT   || []),
  ];
  allFields.forEach(field => {
    const label    = field.LABEL;
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
// CORE — fetch template → generate badge PDF → send email
// ─────────────────────────────────────────────────────────────────────────────
async function fetchTemplateAndSendEmail(templateKey, EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  let conn;
  try {
    conn = await db.getConnection();

    // ── 1. Fetch email template from SP ──────────────────────────────────
    const [mailResponse] = await conn.execute(
      'CALL USP_GET_MAIL_TEMPLATE_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_EMAIL_CONFIG_DETAILS', templateKey, EVENT_SYS_ID, REGISTRATION_SYS_ID]
    );

    const mailResponseDecoded = mailResponse[0][0].JSON_VALUE;
    if (mailResponseDecoded.status !== 'true') {
      console.warn(`[EmailService] SP false | template=${templateKey}`);
      return false;
    }

    const emailData = mailResponseDecoded.response?.[0];
    console.log('emailData',emailData)
    if (!emailData || !emailData.TO_EMAIL) {
      console.warn(`[EmailService] Missing TO_EMAIL | template=${templateKey}`);
      return false;
    }

    // SP field names confirmed from your response:
    //   SMTP_SERVER_NAME, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SENDER_NAME
    //   ATTACH_BADGE_PDF  → "1" = attach badge,  anything else = no badge
    console.log('[EmailService] SMTP config from SP:', {
      SMTP_SERVER_NAME: emailData.SMTP_SERVER_NAME || '(not set)',
      SMTP_PORT:        emailData.SMTP_PORT        || '(not set)',
      SMTP_USERNAME:    emailData.SMTP_USERNAME    || '(not set)',
      SMTP_PASSWORD:    emailData.SMTP_PASSWORD    ? '***' : '(not set)',
      SENDER_NAME:      emailData.SENDER_NAME      || '(not set)',
      ATTACH_BADGE_PDF: emailData.ATTACH_BADGE_PDF || '(not set)',
    });

    // ── 2. Fetch event details ────────────────────────────────────────────
    const [rows] = await conn.execute(
      'CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_EVENT_SPECIFIC_INFO', 'SPECIFIC', EVENT_SYS_ID]
    );
    if (!rows?.[0]?.[0]) return false;
    const eventResult = rows[0][0].JSON_VALUE.response[0];

    // ── 3. Fetch attendee details ─────────────────────────────────────────
    const [userRows] = await conn.execute(
      'CALL USP_GET_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS', 'SPECIFIC', EVENT_SYS_ID, REGISTRATION_SYS_ID]
    );
    const userResult = userRows[0][0].JSON_VALUE.response[0];

    // ── 4. Personalize email body ─────────────────────────────────────────
    const personalizedBody = personalizeBody(
      emailData.MAIL_BODY,
      emailData.ALL_COLUMN_LIST,
      eventResult,
      userResult,
      REGISTRATION_SYS_ID
    );

    // ── 5. Generate badge PDF — only if ATTACH_BADGE_PDF === "1" or 1 ─────
    let attachments = [];
    const shouldAttachBadge = emailData.ATTACH_BADGE_PDF == '1' || emailData.ATTACH_BADGE_PDF == 1;

    if (shouldAttachBadge) {
      console.log(`[EmailService] ATTACH_BADGE_PDF=1 → generating badge PDF...`);
      try {
        const pdfBuffer = await generateBadgePdfBuffer(
          EVENT_SYS_ID,
          '1',          // ORGANIZATION_SYS_ID always static
          eventResult,
          userResult
        );

        if (pdfBuffer) {
          const attendeeName = (userResult.FULL_NAME || userResult.PERSON_NAME || 'Attendee')
            .replace(/\s+/g, '_');
          attachments = [{
            filename:    `${attendeeName}_Badge.pdf`,
            content:     pdfBuffer,
            contentType: 'application/pdf',
          }];
          console.log(`[EmailService] ✅ Badge PDF attached | ${pdfBuffer.length} bytes`);
        } else {
          console.warn(`[EmailService] ⚠️ Badge PDF buffer was null — sending without attachment`);
        }
      } catch (pdfErr) {
        // PDF failure must NOT block the email
        console.error(`[EmailService] ⚠️ Badge PDF error — sending email without it | ${pdfErr.message}`);
      }
    } else {
      console.log(`[EmailService] ATTACH_BADGE_PDF=${emailData.ATTACH_BADGE_PDF} → skipping badge attachment`);
    }

    // ── 6. Build transporter from SP SMTP fields ──────────────────────────
    // Field names from your SP response:
    //   SMTP_SERVER_NAME  →  host
    //   SMTP_PORT         →  port
    //   SMTP_USERNAME     →  auth.user
    //   SMTP_PASSWORD     →  auth.pass  (encrypted/plain — your SP handles decryption)
    //   SENDER_NAME       →  display name in FROM
    let activeTransporter;

    if (emailData.SMTP_SERVER_NAME && emailData.SMTP_USERNAME && emailData.SMTP_PASSWORD) {
      const port   = Number(emailData.SMTP_PORT) || 587;
      const secure = port === 465;

      console.log(`[EmailService] Building transporter | ${emailData.SMTP_SERVER_NAME}:${port} secure=${secure}`);

      activeTransporter = nodemailer.createTransport({
        host:   emailData.SMTP_SERVER_NAME,
        port:   port,
        secure: secure,
        auth: {
          user: emailData.SMTP_USERNAME,
          pass: emailData.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify before sending so a bad config fails loudly here, not silently
      await activeTransporter.verify();
      console.log(`[EmailService] ✅ SMTP verified | ${emailData.SMTP_SERVER_NAME}`);

    } else {
      // Fallback to the global static transporter (smtpServer.js)
      console.log(`[EmailService] SMTP fields missing in emailData — using global transporter`);
      activeTransporter = transporter;
    }

    // ── 7. Compose FROM address ───────────────────────────────────────────
    // Use SENDER_NAME from SP if available, otherwise fall back to global constant
    const fromAddress = emailData.SENDER_NAME && emailData.SMTP_USERNAME
      ? `"${emailData.SENDER_NAME}" <${emailData.SMTP_USERNAME}>`
      : (emailData.SMTP_USERNAME
          ? `"Events" <${emailData.SMTP_USERNAME}>`
          : FROM_ADDRESS);

    // ── 8. Send the email ─────────────────────────────────────────────────
    const msgToken = crypto
      .createHash('sha256')
      .update(`${templateKey}-${EVENT_SYS_ID}-${REGISTRATION_SYS_ID}-${Date.now()}`)
      .digest('hex')
      .slice(0, 24);

    await activeTransporter.sendMail({
      from:        fromAddress,
      to:          emailData.TO_EMAIL,
      subject:     emailData.SUBJECT,
      html:        personalizedBody,
      attachments,   // [] = no attachment | [{ pdf }] = badge attached
      headers: {
        'Message-ID':         `<${templateKey}-${msgToken}@cssoffice.sg>`,
        'Precedence':         'first-class',
        'X-Mailer':           'IIDEAS-Events-Mailer',
        'X-Transaction-Type': templateKey,
      },
    });

    console.log(`[EmailService] ✅ Email sent → ${emailData.TO_EMAIL} | badge=${shouldAttachBadge}`);
    return true;

  } catch (error) {
    console.error(`[EmailService] ❌ Failed | template=${templateKey} | EVENT=${EVENT_SYS_ID} | REG=${REGISTRATION_SYS_ID} | ${error.message}`);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC FUNCTIONS — signatures unchanged
// ─────────────────────────────────────────────────────────────────────────────
async function sendOtpToAttendee(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('GENERATE_OTP_FOR_ATTENDEES', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

async function sendRegistrationSuccessfullNotification(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('Successful Registration Notification', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

async function sendRegistrationApprovalNotification(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('Successful Approval Notification', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

async function sendRegistrationRejectedNotification(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('Registration Rejected Notification', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

module.exports = {
  sendOtpToAttendee,
  sendRegistrationSuccessfullNotification,
  sendRegistrationApprovalNotification,
  sendRegistrationRejectedNotification,
};