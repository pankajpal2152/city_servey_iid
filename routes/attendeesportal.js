const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your mysql2 connection
const auth = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
// POST /api/attendeesportal/api-post-add-update-attendees-agenda
/**
 * @swagger
 * /api/attendeesportal/api-post-add-update-attendees-agenda:
 *   post:
 *     tags:
 *       - Attendees Portal
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
router.post('/api-post-add-update-attendees-agenda', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_ATTENDEES_AGENDA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_ATTENDEES_AGENDA', requestJson]
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

// GET /api/attendeesportal/api-get-view-event-attendees-agenda-list
/**
 * @swagger
 * /api/attendeesportal/api-get-view-event-attendees-agenda-list:
 *   get:
 *     tags:
 *       - Attendees Portal
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
router.get('/api-get-view-event-attendees-agenda-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,EVENT_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_ATTENDEES_AGENDA_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ATTENDEES_AGENDA_LIST', ITEM,EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong'});
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
    finally {
    if (conn) conn.release();
  }
});

// POST /api/attendeesportal/api-post-add-update-attendees-doc-download
/**
 * @swagger
 * /api/attendeesportal/api-post-add-update-attendees-doc-download:
 *   post:
 *     tags:
 *       - Attendees Portal
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
router.post('/api-post-add-update-attendees-doc-download', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_ATTENDEES_DOC_DOWNLOAD(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_ATTENDEES_DOC_DOWNLOAD', requestJson]
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

// GET /api/attendeesportal/api-get-view-event-attendees-document-list
/**
 * @swagger
 * /api/attendeesportal/api-get-view-event-attendees-document-list:
 *   get:
 *     tags:
 *       - Attendees Portal
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
router.get('/api-get-view-event-attendees-document-list', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,EVENT_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_ATTENDEES_DOCUMENT_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ATTENDEES_DOCUMENT_LIST', ITEM,EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong'});
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
    finally {
    if (conn) conn.release();
  }
});

// GET /api/attendeesportal/api-get-view-event-attendees-document-list-without
/**
 * @swagger
 * /api/attendeesportal/api-get-view-event-attendees-document-list-without:
 *   get:
 *     tags:
 *       - Attendees Portal
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
router.get('/api-get-view-event-attendees-document-list-without', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,EVENT_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_EVENT_ATTENDEES_DOCUMENT_LIST(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_ATTENDEES_DOCUMENT_LIST', ITEM,EVENT_SYS_ID]
    );
    if (rows && rows[0] && rows[0][0]) {
      const result = rows[0][0].JSON_VALUE;
      return res.json(result);
    } else {
      return res.status(500).json({ status: 'false', response: 'Oops!! something went wrong'});
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
    finally {
    if (conn) conn.release();
  }
});


module.exports = router;