const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your mysql2 connection
const auth = require('../middlewares/auth');
const { 
  sendRegistrationSuccessfullNotification, 
  sendRegistrationApprovalNotification ,
  sendRegistrationRejectedNotification
} = require('../emailService/index');
// POST /api/event/api-post-add-update-event-new-registration-details

router.post('/api-post-add-update-event-new-registration-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    // ✅ Validate request body
    const requestJsonData = Array.isArray(req.body) ? req.body : [req.body];
    if (!requestJsonData || requestJsonData.length === 0) {
      return res.status(400).json({ status: 'false', response: 'Request body is empty or invalid' });
    }

    const requestJson = JSON.stringify(requestJsonData);

    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_NEW_REGISTRATION_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_NEW_REGISTRATION_DETAILS', requestJson]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      const firstItem = requestJsonData[0];

      if (firstItem?.ITEM == 'UPDATE_STATUS' && firstItem?.STATUS == 'Approved') {
        const obj = {
          EVENT_SYS_ID: firstItem.EVENT_SYS_ID,
          REGISTRATION_SYS_ID: firstItem.REGISTRATION_SYS_ID
        };
        const mailStatus = await sendRegistrationApprovalNotification(obj.EVENT_SYS_ID, obj.REGISTRATION_SYS_ID);
      }
      if (firstItem?.ITEM == 'UPDATE_STATUS' && firstItem?.STATUS == 'Rejected') {
        const obj = {
          EVENT_SYS_ID: firstItem.EVENT_SYS_ID,
          REGISTRATION_SYS_ID: firstItem.REGISTRATION_SYS_ID
        };
        const mailStatus = await sendRegistrationRejectedNotification(obj.EVENT_SYS_ID, obj.REGISTRATION_SYS_ID);
      }
       else if (firstItem?.ITEM == 'ADD') {
        const ids = result.REGISTRATION_SYS_IDS;
        for (const id of ids) {
          const obj = {
            EVENT_SYS_ID: result.EVENT_SYS_ID,
            REGISTRATION_SYS_ID: id
          };
          const mailStatus = await sendRegistrationSuccessfullNotification(obj.EVENT_SYS_ID, obj.REGISTRATION_SYS_ID);
          //return res.json(mailStatus);
        }

      }


      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error('Error:', error.message, '| Body:', JSON.stringify(req.body)); // ✅ log body too
    res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-registered-list
/**
 * @swagger
 * /api/event/api-get-view-event-registered-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: integar
 *         required: false
 *         example: 0
 *       - in: query
 *         name: PERSON_NAME
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: PERSON_EMAIL
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: PERSON_CONTACT_NO
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: CHECKED_IN_FLAG
 *         schema:
 *           type: integar
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-registered-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    let {
      ITEM,
      EVENT_SYS_ID,
      PERSON_NAME,
      PERSON_EMAIL,
      PERSON_CONTACT_NO,
      CHECKED_IN_FLAG
    } = req.query;

    // ✅ Convert undefined / empty to null
    ITEM = ITEM || null;
    EVENT_SYS_ID = EVENT_SYS_ID ? Number(EVENT_SYS_ID) : null;
    PERSON_NAME = PERSON_NAME || null;
    PERSON_EMAIL = PERSON_EMAIL || null;
    PERSON_CONTACT_NO = PERSON_CONTACT_NO || null;
    CHECKED_IN_FLAG = CHECKED_IN_FLAG ? Number(CHECKED_IN_FLAG) : null;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_REGISTERED_LIST(?, ?, ?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
      [
        'VIEW_EVENT_REGISTERED_LIST',
        ITEM,
        EVENT_SYS_ID,
        PERSON_NAME,
        PERSON_EMAIL,
        PERSON_CONTACT_NO,
        CHECKED_IN_FLAG
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({
        status: 'false',
        response: 'Oops!! something went wrong'
      });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-registered-specific-details
/**
 * @swagger
 * /api/event/api-get-view-event-registered-specific-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query  
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: SPECIFIC 
 *       - in: query
 *         name: REGISTRATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EMP_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-registered-specific-details', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, REGISTRATION_SYS_ID, EMP_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_REGISTERED_SPECIFIC_DETAILS(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_REGISTERED_SPECIFIC_DETAILS', ITEM, REGISTRATION_SYS_ID, EMP_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-event-registered-search-activity
/**
 * @swagger
 * /api/event/api-get-event-registered-search-activity:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: SPECIFIC
 *       - in: query
 *         name: SEARCH_TEXT
 *         schema:
 *           type: string
 *         required: false
 *         example: 123456
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-event-registered-search-activity', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, SEARCH_TEXT, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_REGISTERED_SEARCH_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_REGISTERED_SEARCH_ACTIVITY', ITEM, SEARCH_TEXT, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-event-setup-list-info
/**
 * @swagger
 * /api/event/api-get-view-pre-event-setup-list-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-event-setup-list-info',  async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_PRE_EVENT_SETUP_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_PRE_EVENT_SETUP_INFO', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-module-credentials-info
/**
 * @swagger
 * /api/event/api-get-view-event-module-credentials-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-module-credentials-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_MODULE_CREDENTIALS_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_MODULE_CREDENTIALS_INFO', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-security-and-auth-email-info
/**
 * @swagger
 * /api/event/api-get-view-event-security-and-auth-email-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-security-and-auth-email-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_SECURITY_AND_AUTH_EMAIL_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_SECURITY_AND_AUTH_EMAIL_INFO', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-security-and-auth-email
/**
 * @swagger
 * /api/event/api-post-add-update-event-security-and-auth-email:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-security-and-auth-email', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_SECURITY_AND_AUTH_EMAIL(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_SECURITY_AND_AUTH_EMAIL', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event
/**
 * @swagger
 * /api/event/api-post-add-update-event:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-list-info
/**
 * @swagger
 * /api/event/api-get-view-event-list-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: ALL_EVENT
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: NULL
 *       - in: query
 *         name: USER_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: NULL
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-list-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, USER_SYS_ID } = req.query;
    const [rows] = await conn.query(
      "CALL USP_GET_VIEW_EVENT_LIST_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_LIST_INFO', ITEM, ORGANIZATION_SYS_ID, USER_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }

});

// GET /api/event/api-get-view-event-specific-info
/**
 * @swagger
 * /api/event/api-get-view-event-specific-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: ALL_EVENT
 *       - in: query
 *         name: USER_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: NULL
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-specific-info', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_SPECIFIC_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_SPECIFIC_INFO', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-client-user-list-info
/**
 * @swagger
 * /api/event/api-get-view-event-client-user-list-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: SPECIFIC
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-client-user-list-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_CLIENT_USER_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_CLIENT_USER_INFO', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-client-user
/**
 * @swagger
 * /api/event/api-post-add-update-event-client-user:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-client-user', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_CLIENT_USER_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_CLIENT_USER', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-client-user-specific-info
/**
 * @swagger
 * /api/event/api-get-view-event-client-user-specific-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: SPECIFIC
 *       - in: query
 *         name: CLIENT_USER_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-client-user-specific-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, CLIENT_USER_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_SPECIFIC_CLIENT_USER(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_SPECIFIC_CLIENT_USER_INFO', ITEM, CLIENT_USER_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-payment-gateway
/**
 * @swagger
 * /api/event/api-post-add-update-event-payment-gateway:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-payment-gateway', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_PAYMENT_GATEWAY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_PAYMENT_GATEWAY', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-payment-gateway-activity
/**
 * @swagger
 * /api/event/api-get-view-event-payment-gateway-activity:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-payment-gateway-activity', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_PAYMENT_GATEWAY_ACTIVITY(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_PAYMENT_GATEWAY', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-seating-arrangement-plan
/**
 * @swagger
 * /api/event/api-post-add-update-event-seating-arrangement-plan:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-seating-arrangement-plan', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_SEATING_ARRANGEMENT_PLAN_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_SEATING_ARRANGEMENT_PLAN', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-seating-arrangement-plan
/**
 * @swagger
 * /api/event/api-get-view-event-seating-arrangement-plan:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-seating-arrangement-plan', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_SEATING_ARRANGEMENT_PLAN(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_SEATING_ARRANGEMENT_PLAN', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-pre-badge-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-pre-badge-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-pre-badge-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_PRE_BADGE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_PRE_BADGE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-badge-setup-list-info
/**
 * @swagger
 * /api/event/api-get-view-event-badge-setup-list-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-badge-setup-list-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_BADGE_SETUP_LIST(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_BADGE_SETUP_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-dashboard-count
/**
 * @swagger
 * /api/event/api-get-view-event-dashboard-count:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-dashboard-count', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_EVENT_DASHBOARD_COUNT_ACTIVITY(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_DASHBOARD_COUNT', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-prize-setup-info
/**
 * @swagger
 * /api/event/api-post-add-update-prize-setup-info:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-prize-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_PRIZE_SETUP_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_PRIZE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-prize-list
/**
 * @swagger
 * /api/event/api-get-view-event-prize-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-prize-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_PRIZE_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_PRIZE_LIST', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-lucky-draw-winner-info
/**
 * @swagger
 * /api/event/api-get-view-lucky-draw-winner-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-lucky-draw-winner-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_LUCKY_DRAW_WINNER_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_LUCKY_DRAW_WINNER_LIST', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-lucky-draw-participants-list
/**
 * @swagger
 * /api/event/api-get-view-lucky-draw-participants-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: PAGE_SIZE
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: PAGE_NO
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-lucky-draw-participants-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID = null, EVENT_SYS_ID, PAGE_SIZE, PAGE_NO } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_LUCKY_DRAW_PARTICIPANTS_LIST(?,?,?,?,?,?,@ERRNO, @ERRMSG);",
      ['VIEW_LUCKY_DRAW_PARTICIPANTS_LIST', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, PAGE_SIZE, PAGE_NO]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-lucky-draw-control-panel-view
/**
 * @swagger
 * /api/event/api-get-view-lucky-draw-control-panel-view:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: LUCKY_DRAW_TYPE
 *         schema:
 *           type: string
 *         required: false
 *         example: LIVE
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-lucky-draw-control-panel-view',  async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, LUCKY_DRAW_TYPE } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_LUCKY_DRAW_CONTROL_PANEL_VIEW(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_LUCKY_DRAW_CONTROL_PANEL', ITEM, EVENT_SYS_ID, LUCKY_DRAW_TYPE]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-lucky-draw-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-lucky-draw-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-lucky-draw-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_LUCKY_DRAW_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_LUCKY_DRAW_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-lucky-draw-participant
/**
 * @swagger
 * /api/event/api-post-add-update-lucky-draw-participant:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-lucky-draw-participant', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_LUCKY_DRAW_PARTICIPANT_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_LUCKY_DRAW_PARTICIPANT', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-finalize-lucky-draw-participants
/**
 * @swagger
 * /api/event/api-post-finalize-lucky-draw-participants:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-finalize-lucky-draw-participants', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_FINALISE_LUCKY_DRAW_PARTICIPANTS(?, ?, @ERRNO, @ERRMSG);",
      ['FINALISE_LD_PARTICIPANTS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-q-and-a-list
/**
 * @swagger
 * /api/event/api-get-view-event-q-and-a-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: QUESTION_BY
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-q-and-a-list', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      QUESTION_BY = null
    } = req.query;

    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    QUESTION_BY = safeParam(QUESTION_BY);

    console.log('Params:', { ITEM, EVENT_SYS_ID, QUESTION_BY });

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_Q_AND_A_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_Q_AND_A_LIST', ITEM, EVENT_SYS_ID, QUESTION_BY]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-q-and-a-details
/**
 * @swagger
 * /api/event/api-post-add-update-q-and-a-details:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-q-and-a-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_Q_AND_A_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_Q_AND_A_DETAILS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-wishing-message
/**
 * @swagger
 * /api/event/api-post-add-update-wishing-message:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-wishing-message', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_WISHING_MESSAGE_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_WISHING_MESSAGE', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-wishing-message-list
/**
 * @swagger
 * /api/event/api-get-view-wishing-message-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-wishing-message-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_WISHING_MESSAGE_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_WISHING_MESSAGE_LIST', ITEM, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-update-pre-template-setup
/**
 * @swagger
 * /api/event/api-post-update-pre-template-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-update-pre-template-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_PRE_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_PRE_TEMPLATE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-template-setup-info
/**
 * @swagger
 * /api/event/api-get-view-pre-template-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_CATEGORY_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-template-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,ORGANIZATION_SYS_ID,EVENT_CATEGORY_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_PRE_TEMPLATE_SETUP_LIST(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_PRE_TEMPLATE_SETUP_INFO', ITEM, ORGANIZATION_SYS_ID,EVENT_CATEGORY_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-badge-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-badge-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-badge-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_BADGE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_BADGE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-team-details
/**
 * @swagger
 * /api/event/api-post-add-update-event-team-details:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-team-details', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_TEAM_MEMBER_DETAILS(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_TEAM_MEMBER', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-team-list-info
/**
 * @swagger
 * /api/event/api-get-view-event-team-list-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-team-list-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_TEAM_LIST_ACTIVITY(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_TEAM_LIST_INFO', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-specific-event-badge-setup
/**
 * @swagger
 * /api/event/api-get-specific-event-badge-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: BADGE_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-specific-event-badge-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, BADGE_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_SPECIFIC_EVENT_BADGE_SETUP(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_BADGE_SETUP', ITEM, EVENT_SYS_ID, BADGE_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-selected-ld-participants-list
/**
 * @swagger
 * /api/event/api-get-view-selected-ld-participants-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: DRAW_TYPE
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-selected-ld-participants-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, DRAW_TYPE } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_SELECTED_LUCKY_DRAW_PARTICIPANTS_LIST(?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_SELECTED_LD_PARTICIPANTS_LIST', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, DRAW_TYPE]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-ld-winner-selection
/**
 * @swagger
 * /api/event/api-post-add-update-ld-winner-selection:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-ld-winner-selection', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_LUCKY_DRAW_WINNER_SELECTION(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_LD_WINNER_SELECTION', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-pre-lucky-draw-setup
/**
 * @swagger
 * /api/event/api-post-add-update-pre-lucky-draw-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-pre-lucky-draw-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_PRE_LUCKY_DRAW_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_PRE_LUCKY_DRAW_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-lucky-draw-setup-info
/**
 * @swagger
 * /api/event/api-get-view-pre-lucky-draw-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-lucky-draw-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_PRE_LUCKY_DRAW_SETUP_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_PRE_LUCKY_DRAW_SETUP_INFO', ITEM, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-bt-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-bt-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-bt-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_BACKDROP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_BT_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/api-get-view-event-bt-setup-list-info:
 *   get:
 *     tags:
 *       - Event
 *     summary: Get event backdrop template setup info
 *     description: Calls USP_GET_VIEW_EVENT_BACKDROP_TEMPLATE_SETUP_LIST to fetch specific event backdrop template setup details.
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: SPECIFIC
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successful response with backdrop template list
 *       500:
 *         description: Internal server error
 */


router.get("/api-get-view-event-bt-setup-list-info", async (req, res) => {
  let conn;
  try {
    const ITEM = req.query.ITEM || "SPECIFIC";
    const EVENT_SYS_ID = req.query.EVENT_SYS_ID || null;
    const ORGANIZATION_SYS_ID = req.query.ORGANIZATION_SYS_ID || null;
    conn = await db.getConnection();
    const [rows] = await conn.query(
      "CALL USP_GET_VIEW_EVENT_BACKDROP_TEMPLATE_SETUP_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ["VIEW_EVENT_BT_SETUP_INFO", ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/api-get-specific-event-bt-setup:
 *   get:
 *     tags:
 *       - Event
 *     summary: Get event backdrop template setup info
 *     description: Calls USP_GET_VIEW_EVENT_BACKDROP_TEMPLATE_SETUP_LIST to fetch specific event backdrop template setup details.
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: SPECIFIC
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *       - in: query
 *         name: BACKDROP_TEMPLATE_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successful response with backdrop template list
 *       500:
 *         description: Internal server error
 */


router.get("/api-get-specific-event-bt-setup", async (req, res) => {
  let conn;
  try {
    const ITEM = req.query.ITEM || "SPECIFIC";
    const EVENT_SYS_ID = req.query.EVENT_SYS_ID || null;
    const BACKDROP_TEMPLATE_SYS_ID = req.query.BACKDROP_TEMPLATE_SYS_ID || null;
    conn = await db.getConnection();
    const [rows] = await conn.query(
      "CALL USP_GET_SPECIFIC_EVENT_BACKDROP_TEMPLATE_SETUP(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ["VIEW_EVENT_BT_SETUP", ITEM, EVENT_SYS_ID, BACKDROP_TEMPLATE_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/api-get-specific-event-bt-ld-display:
 *   get:
 *     tags:
 *       - Event
 *     summary: Get event backdrop template setup info
 *     description: Calls USP_GET_SPECIFIC_EVENT_BACKDROP_TEMPLATE_LD_DISPLAY to fetch specific event backdrop template setup details.
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: SPECIFIC
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *       - in: query
 *         name: LUCKY_DRAW_TYPE
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Successful response with backdrop template list
 *       500:
 *         description: Internal server error
 */


router.get("/api-get-specific-event-bt-ld-display", async (req, res) => {
  let conn;
  try {
    const ITEM = req.query.ITEM || "SPECIFIC";
    const EVENT_SYS_ID = req.query.EVENT_SYS_ID || null;
    const LUCKY_DRAW_TYPE = req.query.LUCKY_DRAW_TYPE || null;
    conn = await db.getConnection();
    const [rows] = await conn.query(
      "CALL USP_GET_SPECIFIC_EVENT_BACKDROP_TEMPLATE_LD_DISPLAY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ["VIEW_EVENT_BT_LD_DISPLAY", ITEM, EVENT_SYS_ID, LUCKY_DRAW_TYPE]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});


// POST /api/event/api-post-add-update-event-pre-bt-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-pre-bt-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-pre-bt-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_PRE_BACKDROP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_PRE_BT_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/api-get-view-event-pre-bt-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     summary: Get event backdrop template setup info
 *     description: Calls USP_GET_SPECIFIC_EVENT_BACKDROP_TEMPLATE_LD_DISPLAY to fetch specific event backdrop template setup details.
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Successful response with backdrop template list
 *       500:
 *         description: Internal server error
 */


router.get("/api-get-view-event-pre-bt-setup-info", async (req, res) => {
  let conn;
  try {
    const ITEM = req.query.ITEM || "VIEW_ALL";
    const ORGANIZATION_SYS_ID = req.query.ORGANIZATION_SYS_ID || null;
    conn = await db.getConnection();
    const [rows] = await conn.query(
      "CALL USP_GET_VIEW_PRE_EVENT_BACKDROP_TEMPLATE_SETUP(?, ?, ?,@ERRNO, @ERRMSG);",
      ["VIEW_EVENT_PRE_BT_SETUP_INFO", ITEM, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-voting-details
/**
 * @swagger
 * /api/event/api-post-add-update-voting-details:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-voting-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_VOTING_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_VOTING_DETAILS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/api-get-view-event-voting-result-list:
 *   get:
 *     tags:
 *       - Event
 *     summary: Get event backdrop template setup info
 *     description: Calls USP_GET_SPECIFIC_EVENT_BACKDROP_TEMPLATE_LD_DISPLAY to fetch specific event backdrop template setup details.
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Successful response with backdrop template list
 *       500:
 *         description: Internal server error
 */


router.get("/api-get-view-event-voting-result-list", async (req, res) => {
  let conn;
  try {
    const ITEM = req.query.ITEM || "VIEW_ALL";
    const EVENT_SYS_ID = req.query.EVENT_SYS_ID || null;
    conn = await db.getConnection();
    const [rows] = await conn.query(
      "CALL USP_GET_EVENT_VOTING_RESULT_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ["VIEW_EVENT_VOTING_RESULT_LIST", ITEM, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/api-get-view-event-voting-question-answer-list:
 *   get:
 *     tags:
 *       - Event
 *     summary: Get event backdrop template setup info
 *     description: Calls USP_GET_SPECIFIC_EVENT_BACKDROP_TEMPLATE_LD_DISPLAY to fetch specific event backdrop template setup details.
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: false
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Successful response with backdrop template list
 *       500:
 *         description: Internal server error
 */


router.get("/api-get-view-event-voting-question-answer-list", async (req, res) => {
  let conn;
  try {
    const ITEM = req.query.ITEM || "VIEW_ALL";
    const EVENT_SYS_ID = req.query.EVENT_SYS_ID || null;
    conn = await db.getConnection();
    const [rows] = await conn.query(
      "CALL USP_GET_EVENT_VOTING_QUESTION_ANSWER_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ["VIEW_EVENT_VOTING_QUESTION_ANSWER_LIST", ITEM, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-pre-badge-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-pre-badge-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-pre-badge-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_PRE_BADGE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_PRE_BADGE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-pre-badge-setup
/**
 * @swagger
 * /api/event/api-get-view-event-pre-badge-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-pre-badge-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_PRE_BADGE_SETUP(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_PRE_BADGE_SETUP', ITEM, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-voting-details-external
/**
const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // adjust path if needed

/**
 * @swagger
 * /api/event/api-post-add-update-voting-details-external:
 *   post:
 *     tags:
 *       - Event
 *     summary: Add or update external voting details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 VOTING_SYS_ID:
 *                   type: integer
 *                   example: 0
 *                 EVENT_SYS_ID:
 *                   type: integer
 *                   example: 101
 *                 VOTER_NAME:
 *                   type: string
 *                   example: John Doe
 *                 VOTE_VALUE:
 *                   type: string
 *                   example: YES
 *     responses:
 *       200:
 *         description: Success response
 *       500:
 *         description: Internal server error
 */
router.post('/api-post-add-update-voting-details-external', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = JSON.stringify(req.body);

    const [rows] = await conn.execute(
      'CALL USP_POST_VOTING_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['ADD_UPDATE_VOTING_DETAILS', requestJson]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.json(rows[0][0].JSON_VALUE);
    }

    return res
      .status(500)
      .json({ status: 'false', response: 'Oops!! something went wrong' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-update-registration-checked-in-activity
/**
 * @swagger
 * /api/event/api-post-update-registration-checked-in-activity:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-update-registration-checked-in-activity', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_UPDATE_REGISTRATION_CHECKED_IN_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['UPDATE_CHECKED_IN', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-challenge-mst-question-setup
/**
 * @swagger
 * /api/event/api-post-add-update-challenge-mst-question-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-challenge-mst-question-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_CHALLENGE_MST_QUESTION_SETUP_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_MST_QUESTION_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-mst-station-list
/**
 * @swagger
 * /api/event/api-get-view-event-mst-station-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-mst-station-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_MST_STATION_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_MST_STATION_LIST', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-challenge-mst-question-list
/**
 * @swagger
 * /api/event/api-get-view-event-challenge-mst-question-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-challenge-mst-question-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_CHALLENGE_MST_QUESTION_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_CHALLENGE_MST_QUESTION_LIST', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-mst-station-activity
/**
 * @swagger
 * /api/event/api-post-add-update-mst-station-activity:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-mst-station-activity', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_MST_STATION_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_MST_STATION', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-specific-challenge-question-activity
/**
 * @swagger
 * /api/event/api-get-view-event-specific-challenge-question-activity:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: SPECIFIC
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: STATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-specific-challenge-question-activity', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_SPECIFIC_CHALLENGE_QUESTION_ACTIVITY(?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_SPECIFIC_CHALLENGE_ACTIVITY', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-submit-challenge-answer-details
/**
 * @swagger
 * /api/event/api-post-submit-challenge-answer-details:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-submit-challenge-answer-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_CHALLENGE_ANSWER_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['SUBMIT_CHALLENGE_ANSWER_DETAILS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-challenge-participants-score
/**
 * @swagger
 * /api/event/api-get-view-event-challenge-participants-score:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: STATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-challenge-participants-score', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_CHALLENGE_PARTICIPANT_SCORES(?, ?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_CHALLENGE_PARTICIPANT_SCORES', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});


/**
 * @swagger
 * /api/event/api-get-view-event-participant-wise-challenge-details:
 *   get:
 *     tags:
 *       - Event
 *     summary: View participant-wise challenge details
 *     description: Fetch challenge details based on participant, event, organization, and station
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: SPECIFIC
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: true
 *         schema:
 *           type: integer
 *           example: 33
 *       - in: query
 *         name: STATION_SYS_ID
 *         required: true
 *         schema:
 *           type: integer
 *           example: 27
 *       - in: query
 *         name: PARTICIPANTS_NAME
 *         required: true
 *         schema:
 *           type: string
 *           example: Piyali Bera
 *     responses:
 *       200:
 *         description: Participant-wise challenge details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.get("/api-get-view-event-participant-wise-challenge-details", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const ITEM = req.query.ITEM || "SPECIFIC";
    const {
      ORGANIZATION_SYS_ID,
      EVENT_SYS_ID,
      STATION_SYS_ID,
      PARTICIPANTS_NAME
    } = req.query;

    if (
      !ORGANIZATION_SYS_ID ||
      !EVENT_SYS_ID ||
      !STATION_SYS_ID ||
      !PARTICIPANTS_NAME
    ) {
      return res.status(400).json({
        success: false,
        message: "ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID, and PARTICIPANTS_NAME are required"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_GET_EVENT_PARTICIPANT_WISE_CHALLENGE_DETAILS(?, ?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
      [
        "VIEW_EVENT_PARTICIPANT_WISE_CHALLENGE",
        ITEM,
        ORGANIZATION_SYS_ID,
        EVENT_SYS_ID,
        STATION_SYS_ID,
        PARTICIPANTS_NAME
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Participant Wise Challenge API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});




/**
 * @swagger
 * /api/event/api-post-add-update-event-website-design-setup:
 *   post:
 *     tags:
 *       - Event Website
 *     description: Manage event website design JSON configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD_UPDATE_WEBSITE_DESIGN_SETUP
 *               ORGANIZATION_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               WEBSITE_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               json_document:
 *                 type: object
 *                 description: Complete website design JSON
 *     responses:
 *       200:
 *         description: Website design setup processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation completed successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.post("/api-post-add-update-event-website-design-setup", async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = req.body;

    if (!requestJson || !requestJson.ITEM) {
      return res.status(400).json({
        success: false,
        message: "ITEM is required in request body"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_POST_EVENT_WEBSITE_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      [
        "ADD_UPDATE_EVENT_WEBSITE_DESIGN_SETUP",
        JSON.stringify(requestJson)
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(200).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});


/**
 * @swagger
 * /api/event/api-get-view-event-website-design-setup-info:
 *   get:
 *     tags:
 *       - Event Website
 *     description: Fetch event website design setup information by event and organization
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         required: false
 *         schema:
 *           type: string
 *           example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         required: true
 *         schema:
 *           type: integer
 *           example: 33
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Event website design setup fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.get("/api-get-view-event-website-design-setup-info", async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const ITEM = req.query.ITEM || "VIEW_ALL";
    const { EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    if (!EVENT_SYS_ID || !ORGANIZATION_SYS_ID) {
      return res.status(400).json({
        success: false,
        message: "EVENT_SYS_ID and ORGANIZATION_SYS_ID are required"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_GET_VIEW_EVENT_WEBSITE_DESIGN_SETUP_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      [
        "VIEW_EVENT_WEBSITE_DESIGN_SETUP_INFO",
        ITEM,
        EVENT_SYS_ID,
        ORGANIZATION_SYS_ID
      ]
    );

    // if (rows && rows[0] && rows[0][0]?.JSON_VALUE?.response) {
    //   return res.status(200).json({
    //     success: true,
    //     data: rows[0][0].JSON_VALUE.response
    //   });
    // }

    // return res.status(200).json({
    //   success: false,
    //   message: "No data found"
    // });

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("View Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-challenge-participants-score
/**
 * @swagger
 * /api/event/api-get-view-event-challenge-participants-score:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: STATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-challenge-participants-score', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_CHALLENGE_PARTICIPANT_SCORES(?, ?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_CHALLENGE_PARTICIPANT_SCORES', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-challenge-result-summary
/**
 * @swagger
 * /api/event/api-get-view-event-challenge-result-summary:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: STATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-challenge-result-summary', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_CHALLENGE_RESULT_SUMMARY(?, ?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_CHALLENGE_RESULT_SUMMARY', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID, STATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/event/api-post-add-update-event-registration-form-design-setup:
 *   post:
 *     tags:
 *       - Event Website
 *     description: Manage event website design JSON configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD_UPDATE_WEBSITE_DESIGN_SETUP
 *               ORGANIZATION_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               WEBSITE_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               json_document:
 *                 type: object
 *                 description: Complete website design JSON
 *     responses:
 *       200:
 *         description: Website design setup processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation completed successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.post("/api-post-add-update-event-registration-form-design-setup", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = req.body;

    if (!requestJson || !requestJson.ITEM) {
      return res.status(400).json({
        success: false,
        message: "ITEM is required in request body"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_POST_EVENT_REGISTRATION_FORM_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      [
        "ADD_UPDATE_EVENT_REGISTRATION_FORM_DESIGN_SETUP",
        JSON.stringify(requestJson)
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(200).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-registration-form-design-setup
/**
 * @swagger
 * /api/event/api-get-view-event-registration-form-design-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-registration-form-design-setup', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_REGISTRATION_FORM_DESIGN_LIST(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_REGISTRATION_FORM_DESIGN_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/event/api-post-add-update-event-email-template-design:
 *   post:
 *     tags:
 *       - Event Website
 *     description: Manage event website design JSON configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD_UPDATE_WEBSITE_DESIGN_SETUP
 *               ORGANIZATION_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               WEBSITE_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               json_document:
 *                 type: object
 *                 description: Complete website design JSON
 *     responses:
 *       200:
 *         description: Website design setup processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation completed successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.post("/api-post-add-update-event-email-template-design", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = req.body;

    if (!requestJson || !requestJson.ITEM) {
      return res.status(400).json({
        success: false,
        message: "ITEM is required in request body"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_POST_EVENT_EMAIL_TEMPLATE_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      [
        "ADD_UPDATE_EVENT_EMAIL_TEMPLATE_DESIGN",
        JSON.stringify(requestJson)
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(200).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-email-template-design-info
/**
 * @swagger
 * /api/event/api-get-view-event-email-template-design-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 0
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-email-template-design-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_EMAIL_TEMPLATE_DESIGN_LIST(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_EMAIL_TEMPLATE_DESIGN_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-attendees-registration-header-list
/**
 * @swagger
 * /api/event/api-get-view-event-attendees-registration-header-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-attendees-registration-header-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_ATTENDEES_REGISTATION_HEADER_LIST(?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ATTENDEES_REGISTATION_HEADER', ITEM]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/event/api-post-add-update-pre-website-design-setup:
 *   post:
 *     tags:
 *       - Event Website
 *     description: Manage event website design JSON configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD_UPDATE_WEBSITE_DESIGN_SETUP
 *               ORGANIZATION_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               WEBSITE_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               json_document:
 *                 type: object
 *                 description: Complete website design JSON
 *     responses:
 *       200:
 *         description: Website design setup processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation completed successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.post("/api-post-add-update-pre-website-design-setup", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = req.body;

    if (!requestJson || !requestJson.ITEM) {
      return res.status(400).json({
        success: false,
        message: "ITEM is required in request body"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_POST_PRE_WEBSITE_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      [
        "ADD_UPDATE_PRE_WEBSITE_DESIGN_SETUP",
        JSON.stringify(requestJson)
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(200).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-website-design-info
/**
 * @swagger
 * /api/event/api-get-view-pre-website-design-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-website-design-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_PRE_WEBSITE_DESIGN_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_PRE_WEBSITE_DESIGN_INFO', ITEM, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/event/api-post-add-update-pre-email-template-design:
 *   post:
 *     tags:
 *       - Event Website
 *     description: Manage event website design JSON configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD_UPDATE_WEBSITE_DESIGN_SETUP
 *               ORGANIZATION_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               WEBSITE_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               json_document:
 *                 type: object
 *                 description: Complete website design JSON
 *     responses:
 *       200:
 *         description: Website design setup processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation completed successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.post("/api-post-add-update-pre-email-template-design", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = req.body;

    if (!requestJson || !requestJson.ITEM) {
      return res.status(400).json({
        success: false,
        message: "ITEM is required in request body"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_POST_PRE_EMAIL_TEMPLATE_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      [
        "ADD_UPDATE_PRE_EMAIL_TEMPLATE_DESIGN",
        JSON.stringify(requestJson)
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(200).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-email-template-design-info
/**
 * @swagger
 * /api/event/api-get-view-pre-email-template-design-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-email-template-design-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_PRE_EMAIL_TEMPLATE_DESIGN_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_PRE_EMAIL_TEMPLATE_DESIGN_INFO', ITEM, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/event/api-post-add-update-event-road-show-ld-reg-form-design:
 *   post:
 *     tags:
 *       - Event Website
 *     description: Manage event website design JSON configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD_UPDATE_WEBSITE_DESIGN_SETUP
 *               ORGANIZATION_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               EVENT_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               WEBSITE_SYS_ID:
 *                 type: integer
 *                 example: 33
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               json_document:
 *                 type: object
 *                 description: Complete website design JSON
 *     responses:
 *       200:
 *         description: Website design setup processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operation completed successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

router.post("/api-post-add-update-event-road-show-ld-reg-form-design", auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const requestJson = req.body;

    if (!requestJson || !requestJson.ITEM) {
      return res.status(400).json({
        success: false,
        message: "ITEM is required in request body"
      });
    }

    const [rows] = await conn.query(
      "CALL USP_POST_EVENT_ROAD_SHOW_LD_REG_FORM_SETUP(?, ?, @ERRNO, @ERRMSG);",
      [
        "ADD_UPDATE_EVENT_ROAD_SHOW_LD_REG_FORM_DESIGN_SETUP",
        JSON.stringify(requestJson)
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      return res.status(200).json({
        success: true,
        data: rows[0][0].JSON_VALUE.response
      });
    }
    else {
      return res.status(200).json({ status: 'false', response: 'Oops!! something went wrong' });
    }

  } catch (error) {
    console.error("Event Website Design Setup API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-road-show-ld-reg-form-design-setup
/**
 * @swagger
 * /api/event/api-get-view-event-road-show-ld-reg-form-design-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-road-show-ld-reg-form-design-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_ROAD_SHOW_LD_REG_FORM_DESIGN_LIST(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ROAD_SHOW_LD_REG_FORM_DESIGN_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-road-show-ld-registration
/**
 * @swagger
 * /api/event/api-post-add-update-event-road-show-ld-registration:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-road-show-ld-registration', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_ROAD_SHOW_LD_REGISTRATION_DETAILS(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_ROAD_SHOW_LD_REGISTRATION_DETAILS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-road-show-ld-registered-list
/**
 * @swagger
 * /api/event/api-get-view-event-road-show-ld-registered-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-road-show-ld-registered-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_ROAD_SHOW_LD_REGISTERED_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_REGISTERED_LIST', ITEM, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-whatsapp-template-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-whatsapp-template-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-whatsapp-template-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_WHATSAPP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_WHATSAPP_TEMPLATE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-whatsapp-template-setup-info
/**
 * @swagger
 * /api/event/api-get-view-event-whatsapp-template-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-whatsapp-template-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_WHATSAPP_TEMPLATE_SETUP(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_WHATSAPP_TEMPLATE_SETUP_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-attendees-bt-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-attendees-bt-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-attendees-bt-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_ATTENDEES_BACKDROP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_ATTENDEES_BT_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-attendees-bt-setup-info
/**
 * @swagger
 * /api/event/api-get-view-event-attendees-bt-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-attendees-bt-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_ATTENDEES_BACKDROP_TEMPLATE_SETUP(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ATTENDEES_BT_SETUP_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-road-show-ld-prize-setup-info
/**
 * @swagger
 * /api/event/api-post-add-update-road-show-ld-prize-setup-info:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-road-show-ld-prize-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ROAD_SHOW_LD_PRIZE_SETUP_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_ROAD_SHOW_LD_PRIZE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-road-show-ld-prize-list
/**
 * @swagger
 * /api/event/api-get-view-event-road-show-ld-prize-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-road-show-ld-prize-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_ROAD_SHOW_LD_PRIZE_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ROAD_SHOW_LD_PRIZE_LIST', ITEM, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-pre-whatsapp-template-setup
/**
 * @swagger
 * /api/event/api-post-add-update-pre-whatsapp-template-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-pre-whatsapp-template-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_PRE_WHATSAPP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_PRE_WHATSAPP_TEMPLATE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-whatsapp-template-setup-info
/**
 * @swagger
 * /api/event/api-get-view-pre-whatsapp-template-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-whatsapp-template-setup-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_PRE_WHATSAPP_TEMPLATE_SETUP(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_PRE_WHATSAPP_TEMPLATE_SETUP_INFO', ITEM, ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-attendees-seating-arrangement-details
/**
 * @swagger
 * /api/event/api-get-view-attendees-seating-arrangement-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *       - in: query
 *         name: EMP_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *       - in: query
 *         name: TABLE_NO
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-attendees-seating-arrangement-details', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID, EMP_ID, TABLE_NO } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_ATTENDEES_SEATING_ARRANGEMENT_DETAILS(?, ?, ?, ?,?,@ERRNO, @ERRMSG);",
      ['VIEW_ATTENDEES_SEATING_ARRANGEMENT_DETAILS', ITEM, EVENT_SYS_ID, EMP_ID, TABLE_NO]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-road-show-winner-selection
/**
 * @swagger
 * /api/event/api-post-add-update-road-show-winner-selection:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-road-show-winner-selection', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ROAD_SHOW_WINNER_SELECTION(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_ROAD_SHOW_WINNER_SELECTION', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-road-show-winner-info
/**
 * @swagger
 * /api/event/api-get-view-road-show-winner-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-road-show-winner-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_ROAD_SHOW_WINNER_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_ROAD_SHOW_WINNER_LIST', ITEM, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-feedback-details
/**
 * @swagger
 * /api/event/api-post-add-update-event-feedback-details:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-feedback-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_FEEDBACK_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_FEEDBACK', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-feedback-details
/**
 * @swagger
 * /api/event/api-get-view-event-feedback-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-feedback-details',  async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_FEEDBACK_ACTIVITY(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      [
        'VIEW_EVENT_FEEDBACK',
        ITEM ?? null,
        ORGANIZATION_SYS_ID ?? null,
        EVENT_SYS_ID ?? null
      ]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-feedback-form-design-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-feedback-form-design-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-feedback-form-design-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_FEEDBACK_FORM_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_FEEDBACK_FORM_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-feedback-form-design-setup
/**
 * @swagger
 * /api/event/api-get-view-event-feedback-form-design-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 2
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-feedback-form-design-setup', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID } = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_FEEDBACK_FORM_DESIGN_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_FEEDBACK_FORM_DESIGN', ITEM, ORGANIZATION_SYS_ID, EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-event-feedback-form-checked-column-list
/**
 * @swagger
 * /api/event/api-post-add-event-feedback-form-checked-column-list:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-event-feedback-form-checked-column-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_FEEDBACK_FORM_CHECKED_COLUMN_LIST(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_EVENT_FEEDBACK_FORM_CHECKED_COLUMN', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-event-registration-form-checked-column-list
/**
 * @swagger
 * /api/event/api-post-add-event-registration-form-checked-column-list:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-event-registration-form-checked-column-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_REGISTRATION_FORM_CHECKED_COLUMN_LIST(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_EVENT_REGISTRATION_FORM_CHECKED_COLUMN', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-pre-feedback-template-setup
/**
 * @swagger
 * /api/event/api-post-add-update-pre-feedback-template-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-pre-feedback-template-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_PRE_FEEDBACK_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_PRE_FEEDBACK_TEMPLATE_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-pre-feedback-template-setup-info
/**
 * @swagger
 * /api/event/api-get-view-pre-feedback-template-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-pre-feedback-template-setup-info', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,ORGANIZATION_SYS_ID} = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_FEEDBACK_FORM_DESIGN_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_FEEDBACK_FORM_DESIGN', ITEM,ORGANIZATION_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-rsvp-invitation-list
/**
 * @swagger
 * /api/event/api-post-add-update-event-rsvp-invitation-list:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-rsvp-invitation-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_RSVP_INVITATION_LIST_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_RSVP_INVITATION_LIST_ACTIVITY', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-rsvp-invitation-list
/**
 * @swagger
 * /api/event/api-get-view-event-rsvp-invitation-list:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-rsvp-invitation-list', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,EVENT_SYS_ID} = req.query;

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_RSVP_INVITATION_LIST(?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_RSVP_INVITATION_LIST', ITEM,EVENT_SYS_ID]
    );

    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-q-and-a-bt-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-q-and-a-bt-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-q-and-a-bt-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_Q_AND_A_BACKDROP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_Q_AND_A_BT_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-q-and-a-bt-setup-info
/**
 * @swagger
 * /api/event/api-get-view-event-q-and-a-bt-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-q-and-a-bt-setup-info', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      ORGANIZATION_SYS_ID = null
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);

    console.log('Params:', { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID });

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_Q_AND_A_BACKDROP_TEMPLATE_SETUP(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_Q_AND_A_BT_SETUP_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-wishing-wall-bt-setup-info
/**
 * @swagger
 * /api/event/api-get-view-event-wishing-wall-bt-setup-info:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-wishing-wall-bt-setup-info', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      ORGANIZATION_SYS_ID = null
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);

    console.log('Params:', { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID });

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_WISHING_WALL_BACKDROP_TEMPLATE_SETUP(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_WISHING_WALL_BT_SETUP_INFO', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-wishing-wall-bt-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-wishing-wall-bt-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-wishing-wall-bt-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_WISHING_WALL_BACKDROP_TEMPLATE_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_WISHING_WALL_BT_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-ticket-classes
/**
 * @swagger
 * /api/event/api-post-add-update-event-ticket-classes:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-ticket-classes', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_TICKET_CLASSES(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_TICKET_CLASSES', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-ticket-classes
/**
 * @swagger
 * /api/event/api-get-view-event-ticket-classes:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-ticket-classes', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      ORGANIZATION_SYS_ID = null
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);

    console.log('Params:', { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID });

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_TICKET_CLASSES(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_TICKETS', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-ticket-background-design-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-ticket-background-design-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-ticket-background-design-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_TICKET_BACKGROUND_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_TICKET_BACKGROUND_DESIGN', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-ticket-background-design-setup
/**
 * @swagger
 * /api/event/api-get-view-event-ticket-background-design-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: EVENT_TICKET_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-ticket-background-design-setup', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      ORGANIZATION_SYS_ID = null,
      EVENT_TICKET_SYS_ID=null,
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);
    EVENT_TICKET_SYS_ID=safeParam(EVENT_TICKET_SYS_ID)
    console.log('Params:', { ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID,EVENT_TICKET_SYS_ID });

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_TICKET_BACKGROUND_DESIGN_SETUP(?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_TICKET_BACKGROUND_DESIGN', ITEM, EVENT_SYS_ID, ORGANIZATION_SYS_ID,EVENT_TICKET_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-reg-noti-form-design-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-reg-noti-form-design-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-reg-noti-form-design-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_REG_NOTIFICATION_FORM_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_REG_NOTI_FORM_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-reg-notification-form-design-setup
/**
 * @swagger
 * /api/event/api-get-view-event-reg-notification-form-design-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 
 *       - in: query
 *         name: REGISTRATION_FORM_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *      
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-reg-notification-form-design-setup', async (req, res) => {

  let conn;

  try {

    conn = await db.getConnection();

    let {
      ITEM = null,
      ORGANIZATION_SYS_ID = null,
      EVENT_SYS_ID = null,
      REGISTRATION_FORM_SYS_ID=null
    } = req.query;

    // SAFE NULL HANDLING
    const safeParam = (val) => {
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        val === 'undefined'
      ) {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    REGISTRATION_FORM_SYS_ID=safeParam(REGISTRATION_FORM_SYS_ID)

    console.log('Params:', {
      ITEM,
      ORGANIZATION_SYS_ID,
      EVENT_SYS_ID,
      REGISTRATION_FORM_SYS_ID
    });

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_REGISTRATION_NOTIFICATION_FORM_DESIGN_LIST(?, ?, ?, ?, ?,@ERRNO, @ERRMSG);",
      [
        'VIEW_EVENT_REGISTRATION_FORM_DESIGN',
        ITEM,
        ORGANIZATION_SYS_ID,
        EVENT_SYS_ID,
        REGISTRATION_FORM_SYS_ID
      ]
    );

    if (rows?.[0]?.[0]) {

      let result = rows[0][0].JSON_VALUE;

      // SAFE JSON PARSE
      try {
        result =
          typeof result === 'string'
            ? JSON.parse(result)
            : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      // ✅ RETURN DIRECT RESULT
      return res.status(200).json(result);
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {

    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {

    if (conn) conn.release();

  }

});

// POST /api/event/api-post-add-update-event-feedback-noti-form-design-setup
/**
 * @swagger
 * /api/event/api-post-add-update-event-feedback-noti-form-design-setup:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-feedback-noti-form-design-setup', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_FEEDBACK_NOTIFICATION_FORM_DESIGN_SETUP(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_FEEDBACK_NOTI_FORM_SETUP', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-feedback-notification-form-design-setup
/**
 * @swagger
 * /api/event/api-get-view-event-feedback-notification-form-design-setup:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *      
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-feedback-notification-form-design-setup', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      ORGANIZATION_SYS_ID = null,
      EVENT_SYS_ID = null
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
   

    console.log('Params:', { ITEM,ORGANIZATION_SYS_ID, EVENT_SYS_ID});

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_FEEDBACK_NOTIFICATION_FORM_DESIGN_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_FEEDBACK_FORM_DESIGN', ITEM,ORGANIZATION_SYS_ID, EVENT_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-registration-form-design-setup-new
/**
 * @swagger
 * /api/event/api-post-add-update-event-registration-form-design-setup-new:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-registration-form-design-setup-new', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_REGISTRATION_FORM_DESIGN_SETUP_NEW(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_REGISTRATION_FORM_DESIGN_SETUP_NEW', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-registration-form-design-setup-new
/**
 * @swagger
 * /api/event/api-get-view-event-registration-form-design-setup-new:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: REGISTRATION_FORM_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *      
 *      
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-registration-form-design-setup-new', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      ORGANIZATION_SYS_ID = null,
      REGISTRATION_FORM_SYS_ID=null,

    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    ORGANIZATION_SYS_ID = safeParam(ORGANIZATION_SYS_ID);
    REGISTRATION_FORM_SYS_ID = safeParam(REGISTRATION_FORM_SYS_ID);

    console.log('Params:', { ITEM,EVENT_SYS_ID,ORGANIZATION_SYS_ID,REGISTRATION_FORM_SYS_ID});

    const [rows] = await conn.execute(
      "CALL USP_GET_VIEW_EVENT_REGISTRATION_FORM_DESIGN_LIST_NEW(?, ?, ?, ?, ?, @ERRNO, @ERRMSG);",
      ['VIEW_EVENT_REGISTRATION_FORM_DESIGN_INFO_NEW', ITEM,EVENT_SYS_ID,ORGANIZATION_SYS_ID,REGISTRATION_FORM_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-specific-event-wise-qr-details
/**
 * @swagger
 * /api/event/api-get-specific-event-wise-qr-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: MODULE_NAME
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-specific-event-wise-qr-details', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      MODULE_NAME =null
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    MODULE_NAME=safeParam(MODULE_NAME)

    const [rows] = await conn.execute(
      "CALL USP_GET_SPECIFIC_EVENT_WISE_QR_DETAILS_ACTIVITY(?, ?, ?,?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_WISE_QR_DETAILS', ITEM,EVENT_SYS_ID,MODULE_NAME]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-order-details
/**
 * @swagger
 * /api/event/api-post-add-update-event-order-details:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-order-details', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_ORDER_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_ORDER_DETAILS', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-event-wise-order-details
/**
 * @swagger
 * /api/event/api-get-event-wise-order-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-event-wise-order-details', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);

    console.log('Params:', { ITEM,EVENT_SYS_ID});

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_WISE_ORDER_DETAILS_ACTIVITY(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_WISE_ORDER_DETAILS', ITEM,EVENT_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-download-ticket
/**
 * @swagger
 * /api/event/api-post-download-ticket:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-download-ticket', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_DOWNLOAD_TICKET_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['UPDATE_CHECKED_IN', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-add-update-event-website-url
/**
 * @swagger
 * /api/event/api-post-add-update-event-website-url:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-add-update-event-website-url', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_WEBSITE_URL_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_WEBSITE_URL', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-view-event-website-url
/**
 * @swagger
 * /api/event/api-get-view-event-website-url:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: WEBSITE_SUFFIX
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-event-website-url', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      WEBSITE_SUFFIX = null,
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    WEBSITE_SUFFIX=safeParam(WEBSITE_SUFFIX)

    console.log('Params:', { ITEM,EVENT_SYS_ID,WEBSITE_SUFFIX});

    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_WEBSITE_URL_ACTIVITY(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_WEBSITE_URL', ITEM,EVENT_SYS_ID,WEBSITE_SUFFIX]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-specific-event-and-registration-wise-details
/**
 * @swagger
 * /api/event/api-get-specific-event-and-registration-wise-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: REGISTRATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-specific-event-and-registration-wise-details', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      REGISTRATION_SYS_ID = null,
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    REGISTRATION_SYS_ID=safeParam(REGISTRATION_SYS_ID)

    console.log('Params:', { ITEM,EVENT_SYS_ID,REGISTRATION_SYS_ID});

    const [rows] = await conn.execute(
      "CALL USP_GET_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS_ACTIVITY(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS', ITEM,EVENT_SYS_ID,REGISTRATION_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-specific-event-wise-qr-details
/**
 * @swagger
 * /api/event/api-get-specific-event-and-registration-wise-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: REGISTRATION_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-specific-event-and-registration-wise-details', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      REGISTRATION_SYS_ID = null,
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    REGISTRATION_SYS_ID=safeParam(REGISTRATION_SYS_ID)

    console.log('Params:', { ITEM,EVENT_SYS_ID,REGISTRATION_SYS_ID});

    const [rows] = await conn.execute(
      "CALL USP_GET_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS_ACTIVITY(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_SPECIFIC_EVENT_AND_REGISTRATION_WISE_DETAILS', ITEM,EVENT_SYS_ID,REGISTRATION_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

// POST /api/event/api-post-retrieve-event-registered-person
/**
 * @swagger
 * /api/event/api-post-retrieve-event-registered-person:
 *   post:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       200:
 *         description: Success Response
 */
router.post('/api-post-retrieve-event-registered-person',async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_RETRIEVE_EVENT_REGISTERED_PERSON_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['FIND_THE_PERSON_FOR_THE_EVENT', requestJson]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  finally {
    if (conn) conn.release();
  }
});

// GET /api/event/api-get-specific-event-and-rsvp-wise-details
/**
 * @swagger
 * /api/event/api-get-specific-event-and-rsvp-wise-details:
 *   get:
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *         example: VIEW_ALL
 *       - in: query
 *         name: EVENT_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *       - in: query
 *         name: RSVP_INV_SYS_ID
 *         schema:
 *           type: string
 *         required: false
 *         example: 1
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-specific-event-and-rsvp-wise-details', async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

    let {
      ITEM = null,
      EVENT_SYS_ID = null,
      RSVP_INV_SYS_ID = null,
    
    } = req.query;

    // ✅ Same null handling function
    const safeParam = (val) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') {
        return null;
      }
      return val;
    };

    ITEM = safeParam(ITEM);
    EVENT_SYS_ID = safeParam(EVENT_SYS_ID);
    RSVP_INV_SYS_ID=safeParam(RSVP_INV_SYS_ID)


    const [rows] = await conn.execute(
      "CALL USP_GET_SPECIFIC_EVENT_AND_RSVP_WISE_DETAILS_ACTIVITY(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_AND_RSVP_WISE_DETAILS', ITEM,EVENT_SYS_ID,RSVP_INV_SYS_ID]
    );

    if (rows?.[0]?.[0]) {
      let result = rows[0][0].JSON_VALUE;

      // ✅ Safe JSON parse (same as first API)
      try {
        result = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (e) {
        console.warn('JSON parse failed');
      }

      return res.status(200).json({
        status: 'true',
        response: result
      });
    }

    return res.status(500).json({
      status: 'false',
      response: 'No data found'
    });

  } catch (error) {
    console.error('API Error:', error);

    return res.status(500).json({
      status: 'false',
      message: 'Exception occurred',
      error: error.message
    });

  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;