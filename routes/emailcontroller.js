const express = require("express");
const router = express.Router();
const {
  sendRegistrationSuccessfullNotification,
  sendRegistrationApprovalNotification
} = require("../emailService/index");
const {
  fetchAndStoreRSVPRecords,
  sendRSVPEmailsFromFile
} = require("../emailService/rsvpInvitationEmail");
const {
  fetchAndStoreCustomEmailRecords,
  sendCustomEmailsFromFile
} = require("../emailService/customEmailService");
const { json } = require("body-parser");



/**
 * @swagger
 * /api/email-service/send-registration-successfull-notification:
 *   post:
 *     tags:
 *       - Email Service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/send-registration-successfull-notification', async (req, res) => {
  try {
    const requestJsonData = JSON.parse(JSON.stringify(req.body));
    await sendRegistrationSuccessfullNotification(requestJsonData.EVENT_SYS_ID,requestJsonData.REGISTRATION_SYS_ID);
    return res.status(200).json({ status: true, message: 'Email sent.'});
  } catch (error) {
    console.error('Error:', error.message, '| Body:', JSON.stringify(req.body)); // ✅ log body too
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/email-service/send-registration-approval-notification:
 *   post:
 *     tags:
 *       - Email Service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/send-registration-approval-notification', async (req, res) => {
  try {
    const requestJsonData = JSON.parse(JSON.stringify(req.body));
    await sendRegistrationApprovalNotification(requestJsonData.EVENT_SYS_ID,requestJsonData.REGISTRATION_SYS_ID);
    return res.status(200).json({ status: true, message: 'Email sent.'});
  } catch (error) {
    console.error('Error:', error.message, '| Body:', JSON.stringify(req.body)); // ✅ log body too
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/email-service/send-rsvp-invitation-email-notification:
 *   post:
 *     tags:
 *       - Email Service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/send-rsvp-invitation-email-notification', async (req, res) => {
    try {
        const { EVENT_SYS_ID } = req.body;

        if (!EVENT_SYS_ID) {
            return res.status(400).json({ status: false, message: 'EVENT_SYS_ID is required.' });
        }

        // STEP 1 — Call SP → save recipients to JSON file (awaited)
        const totalRecords = await fetchAndStoreRSVPRecords(EVENT_SYS_ID);

        // STEP 2 — Fire background email sending (NOT awaited)
        sendRSVPEmailsFromFile(EVENT_SYS_ID).catch(err => {
            console.error(`[RSVP] Background send error EVENT=${EVENT_SYS_ID}: ${err.message}`);
        });

        // STEP 3 — Return immediately
        return res.status(200).json({
            status: true,
            message: 'RSVP invitation emails are being sent in the background.',
            data: {
                EVENT_SYS_ID,
                TOTAL_RECORDS: totalRecords,
            },
        });

    } catch (error) {
        console.error('[RSVP] trigger-send-rsvp-invitation Error:', error.message);
        return res.status(500).json({ status: false, error: error.message });
    }
});

/**
 * @swagger
 * /api/email-service/send-custom-template-email-notification:
 *   post:
 *     tags:
 *       - Email Service
 *     summary: Send a custom / standard trigger email template to all registered attendees
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - EVENT_SYS_ID
 *             properties:
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 62
 *               EMAIL_TRIGGER_EVENT:
 *                 type: string
 *                 example: "Event Reminder Email"
 *               TEMPLATE_NAME:
 *                 type: string
 *                 example: "Updated Event Date Notification"
 *     responses:
 *       200:
 *         description: Emails queued and sending in background
 */
router.post('/send-custom-template-email-notification', async (req, res) => {
  try {
    const { EVENT_SYS_ID, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME } = req.body;

    if (!EVENT_SYS_ID) {
      return res.status(400).json({ status: false, message: 'EVENT_SYS_ID is required.' });
    }

    // STEP 1 — Fetch all SP data, resolve template, build & write per-attendee queue file (awaited)
    const { filePath, totalQueued, totalSkipped, templateName, emailSubject } =
      await fetchAndStoreCustomEmailRecords(EVENT_SYS_ID, EMAIL_TRIGGER_EVENT, TEMPLATE_NAME);

    if (totalQueued === 0) {
      return res.status(200).json({
        status: false,
        message: 'No attendees with valid email addresses found.',
        data: { EVENT_SYS_ID, TOTAL_QUEUED: 0 },
      });
    }

    // STEP 2 — Fire background email sending (NOT awaited — returns immediately)
    sendCustomEmailsFromFile(filePath, EVENT_SYS_ID).catch(err => {
      console.error(`[CUSTOM-EMAIL] Background send error EVENT=${EVENT_SYS_ID}: ${err.message}`);
    });

    // STEP 3 — Return immediately
    return res.status(200).json({
      status: true,
      message: `${totalQueued} email(s) are being sent in the background.`,
      data: {
        EVENT_SYS_ID,
        TEMPLATE_NAME:  templateName,
        EMAIL_SUBJECT:  emailSubject,
        TOTAL_QUEUED:   totalQueued,
        TOTAL_SKIPPED:  totalSkipped,
      },
    });

  } catch (error) {
    console.error('[CUSTOM-EMAIL] send-custom-template-email-notification Error:', error.message);
    return res.status(500).json({ status: false, error: error.message });
  }
});



module.exports = router;
