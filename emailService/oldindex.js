const db = require('../config/db');
const transporter = require('../config/smtpServer');
const crypto = require('crypto'); // built-in Node — no install needed

const FROM_ADDRESS = '"IIDEAS Events" <Dev@cssoffice.sg>';
// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Personalize the email body per recipient
// Your SP returns MAIL_BODY with placeholders like {{NAME}}, {{EMAIL}} etc.
// This replaces them with actual recipient data — makes every email unique.
// ─────────────────────────────────────────────────────────────────────────────


function personalizeBodyOld(template, columnList, recipient, userDetails) {

  // Replace static event placeholders
  let result = template
    .replace(/{{EVENT_NAME}}/g, recipient.EVENT_NAME || '')
    .replace(/{{EVENT_CATEGORY}}/g, recipient.EVENT_CATEGORY || '')
    .replace(
      /{{EVENT_ADDRESS}}/g,
      `${recipient.EVENT_PRIMARY_ADDRESS || ''}, ${recipient.EVENT_COUNTRY || ''}, ${recipient.EVENT_POSTCODE || ''}`
    )
    .replace(/{{EVENT_TYPE}}/g, recipient.EVENT_TYPE || '')
    .replace(
      /{{FULL_DATE}}/g,
      `${recipient.EVENT_START_DATE || ''} ${recipient.EVENT_START_TIME || ''} to ${recipient.EVENT_END_DATE || ''} ${recipient.EVENT_END_TIME || ''}`
    )
    .replace(/{{EVENT_VENUE}}/g, recipient.EVENT_VENUE || '')
    .replace(/{{START_TIME}}/g, recipient.EVENT_START_TIME || '')
    .replace(/{{END_TIME}}/g, recipient.EVENT_END_TIME || '')
    .replace(/{{START_DATE}}/g, recipient.EVENT_START_DATE || '')
    .replace(/{{END_DATE}}/g, recipient.EVENT_END_DATE || '')
    .replace(/{{EVENT_DESCRIPTION}}/g, recipient.ABOUT_THE_EVENT || '');

  // Merge STANDARD_JSON_DOCUMENT + CUSTOM_JSON_DOCUMENT
  const allFields = [
    ...(userDetails.STANDARD_JSON_DOCUMENT || []),
    ...(userDetails.CUSTOM_JSON_DOCUMENT || [])
  ];

  // Dynamic placeholder replace
  allFields.forEach(field => {

    const label = field.LABEL; // Example: NAME
    const dbColumn = field.DATABASE_COLUMN; // Example: PERSON_NAME

    let value = '';

    // First check main object
    if (userDetails[dbColumn] !== undefined && userDetails[dbColumn] !== null) {
      value = userDetails[dbColumn];
    }

    // Then check json_document
    else if (
      userDetails.json_document &&
      userDetails.json_document[dbColumn] !== undefined
    ) {
      value = userDetails.json_document[dbColumn];
    }

    // Replace {{NAME}}, {{EMAIL}}, etc.
    const regex = new RegExp(`{{${label}}}`, 'g');

    result = result.replace(regex, value || '');
  });

  return result;
}

function personalizeBody(template, columnList, recipient, userDetails, REGISTRATION_SYS_ID) {

  // ── Helper ───────────────────────────────────────────────────────────────
  function generateRandom8Digits() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }

  // Replace static event placeholders
  let result = template
    .replace(/{{EVENT_NAME}}/g, recipient.EVENT_NAME || '')
    .replace(/{{EVENT_CATEGORY}}/g, recipient.EVENT_CATEGORY || '')
    .replace(
      /{{EVENT_ADDRESS}}/g,
      `${recipient.EVENT_PRIMARY_ADDRESS || ''}, ${recipient.EVENT_COUNTRY || ''}, ${recipient.EVENT_POSTCODE || ''}`
    )
    .replace(/{{EVENT_TYPE}}/g, recipient.EVENT_TYPE || '')
    .replace(
      /{{FULL_DATE}}/g,
      `${recipient.EVENT_START_DATE || ''} ${recipient.EVENT_START_TIME || ''} to ${recipient.EVENT_END_DATE || ''} ${recipient.EVENT_END_TIME || ''}`
    )
    .replace(/{{EVENT_VENUE}}/g, recipient.EVENT_VENUE || '')
    .replace(/{{START_TIME}}/g, recipient.EVENT_START_TIME || '')
    .replace(/{{END_TIME}}/g, recipient.EVENT_END_TIME || '')
    .replace(/{{START_DATE}}/g, recipient.EVENT_START_DATE || '')
    .replace(/{{END_DATE}}/g, recipient.EVENT_END_DATE || '')
    .replace(/{{EVENT_DESCRIPTION}}/g, recipient.ABOUT_THE_EVENT || '');

  // ── Attendee Portal URL replacement ──────────────────────────────────────
  const accessFlag = recipient.ACCESS_AUTHORIZATION_FLAG;

  const isAuthRequired = accessFlag == "1" || accessFlag == 1;

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
  // ─────────────────────────────────────────────────────────────────────────

  // Merge STANDARD_JSON_DOCUMENT + CUSTOM_JSON_DOCUMENT
  const allFields = [
    ...(userDetails.STANDARD_JSON_DOCUMENT || []),
    ...(userDetails.CUSTOM_JSON_DOCUMENT || [])
  ];

  // Dynamic placeholder replace
  allFields.forEach(field => {

    const label    = field.LABEL;
    const dbColumn = field.DATABASE_COLUMN;

    let value = '';

    // First check main object
    if (userDetails[dbColumn] !== undefined && userDetails[dbColumn] !== null) {
      value = userDetails[dbColumn];
    }

    // Then check json_document
    else if (
      userDetails.json_document &&
      userDetails.json_document[dbColumn] !== undefined
    ) {
      value = userDetails.json_document[dbColumn];
    }

    // Replace {{NAME}}, {{EMAIL}}, etc.
    const regex = new RegExp(`{{${label}}}`, 'g');
    result = result.replace(regex, value || '');
  });

  return result;
}
// ─────────────────────────────────────────────────────────────────────────────
// CORE HELPER — Fetch template from SP and send email
// All 3 functions use the same pattern — extracted here to avoid repetition
// ─────────────────────────────────────────────────────────────────────────────
async function fetchTemplateAndSendEmail(templateKey, EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  let conn;
  try {
    conn = await db.getConnection();

    const [mailResponse] = await conn.execute(
      "CALL USP_GET_MAIL_TEMPLATE_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EMAIL_CONFIG_DETAILS', templateKey, EVENT_SYS_ID, REGISTRATION_SYS_ID]
    );

    const mailResponseDecoded = mailResponse[0][0].JSON_VALUE;
    console.log("mailResponseDecoded", mailResponseDecoded)
    //return mailResponseDecoded;

    if (mailResponseDecoded.status !== 'true') {
      console.warn(`[EmailService] SP returned false for template=${templateKey} | EVENT=${EVENT_SYS_ID} | REG=${REGISTRATION_SYS_ID}`);
      return false;
    }

    const emailData = mailResponseDecoded.response?.[0];

    //console.log("emailData",emailData)

    if (!emailData || !emailData.TO_EMAIL) {
      console.warn(`[EmailService] No email data or missing TO_EMAIL | template=${templateKey}`);
      return false;
    }
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_SPECIFIC_INFO', "SPECIFIC", EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE.response[0];
      console.log("eventResult", result)
      const [userRows] = await conn.execute(
        "CALL USP_GET_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
        ['VIEW_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS', "SPECIFIC", EVENT_SYS_ID, REGISTRATION_SYS_ID]
      );
      const userResult = userRows[0][0].JSON_VALUE.response[0];
      console.log("userResult", userResult)
      const personalizedBody = personalizeBody(emailData.MAIL_BODY, emailData.ALL_COLUMN_LIST, result, userResult, REGISTRATION_SYS_ID);
      // ✅ Unique token per email — helps spam filters confirm this is individually addressed
      const msgToken = crypto
        .createHash('sha256')
        .update(`${templateKey}-${EVENT_SYS_ID}-${REGISTRATION_SYS_ID}-${Date.now()}`)
        .digest('hex')
        .slice(0, 24);

      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: emailData.TO_EMAIL,
        subject: emailData.SUBJECT,
        html: personalizedBody,

        headers: {
          // ✅ Unique Message-ID — prevents spam grouping / deduplication flags
          'Message-ID': `<${templateKey}-${msgToken}@cssoffice.sg>`,

          // ✅ Marks as transactional (single user-triggered email) — not bulk
          // This tells Gmail/Outlook it's a direct response to a user action
          'Precedence': 'first-class',
          'X-Mailer': 'IIDEAS-Events-Mailer',
          'X-Transaction-Type': templateKey,
        },
      });

    }

    return true;

  } catch (error) {
    // ✅ Always log errors — empty catch blocks hide real problems
    console.error(`[EmailService] Failed | template=${templateKey} | EVENT=${EVENT_SYS_ID} | REG=${REGISTRATION_SYS_ID} | Error: ${error.message}`);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1 — Send OTP to attendee
// ─────────────────────────────────────────────────────────────────────────────
async function sendOtpToAttendee(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('GENERATE_OTP_FOR_ATTENDEES', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2 — Send registration successful notification
// ─────────────────────────────────────────────────────────────────────────────
async function sendRegistrationSuccessfullNotification(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('Successful Registration Notification', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 3 — Send registration approval notification
// ─────────────────────────────────────────────────────────────────────────────
async function sendRegistrationApprovalNotification(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('Successful Approval Notification', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 3 — Send registration approval notification
// ─────────────────────────────────────────────────────────────────────────────
async function sendRegistrationRejectedNotification(EVENT_SYS_ID, REGISTRATION_SYS_ID) {
  return fetchTemplateAndSendEmail('Registration Rejected Notification', EVENT_SYS_ID, REGISTRATION_SYS_ID);
}

module.exports = {
  sendOtpToAttendee,
  sendRegistrationSuccessfullNotification,
  sendRegistrationApprovalNotification,
  sendRegistrationRejectedNotification
};