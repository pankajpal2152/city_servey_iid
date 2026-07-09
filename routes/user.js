const express = require('express');
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { getProcedureJsonValue } = require('../utils/procedureResponse');

const router = express.Router();

// GET /api/user/api-get-view-user-list-info
/**
 * @swagger
 * /api/user/api-get-view-user-list-info:
 *   get:
 *     tags:
 *       - User
 *     summary: View City Survey user list information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *           default: VIEW_ALL
 *         required: false
 *         description: User list view mode passed to the stored procedure
 *         example: VIEW_ALL
 *     responses:
 *       200:
 *         description: User list response from stored procedure
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.get('/api-get-view-user-list-info', auth, async (req, res) => {
  let conn;

  try {
    const item = req.query.ITEM || 'VIEW_ALL';

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_GET_USER_LIST_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_USER', item]
    );

    const result = getProcedureJsonValue(rows);

    if (!result) {
      return res.status(500).json({
        status: 'false',
        response: 'Oops!! something went wrong',
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/user/api-post-add-update-user
/**
 * @swagger
 * /api/user/api-post-add-update-user:
 *   post:
 *     tags:
 *       - User
 *     summary: Add or update a City Survey user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - ITEM
 *                 properties:
 *                   ITEM:
 *                     type: string
 *                     example: ADD_USER
 *                   USER_SYS_ID:
 *                     type: integer
 *                     example: 0
 *                   SYSTEM_ROLE_SYS_ID:
 *                     type: integer
 *                     example: 1
 *                   FIRST_NAME:
 *                     type: string
 *                     example: Sai
 *                   LAST_NAME:
 *                     type: string
 *                     example: Roy
 *                   GENDER:
 *                     type: string
 *                     example: Male
 *                   MOBILE_NO:
 *                     type: string
 *                     example: "7894561230"
 *                   EMAIL_ID:
 *                     type: string
 *                     example: sai@yopmail.com
 *                   ORGANISATION_SYS_ID:
 *                     type: string
 *                     example: "1"
 *                   PASSWORD:
 *                     type: string
 *                     example: Abc@1234
 *                   CREATED_BY:
 *                     type: string
 *                     example: "1"
 *               - type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: User add/update response from stored procedure
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.post('/api-post-add-update-user', auth, async (req, res) => {
  let conn;

  try {
    const requestPayload = Array.isArray(req.body) ? req.body[0] : req.body;
    const procedurePayload = Array.isArray(req.body) ? req.body : [requestPayload];

    if (!requestPayload || typeof requestPayload !== 'object' || !requestPayload.ITEM) {
      return res.status(400).json({
        status: 'false',
        response: 'ITEM is required',
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_POST_USER_PROFILE_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['ADD_UPDATE_USER', JSON.stringify(procedurePayload)]
    );

    const result = getProcedureJsonValue(rows);

    if (!result) {
      return res.status(500).json({
        status: 'false',
        response: 'Oops!! something went wrong',
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
});

/*
 * City Survey user route currently exposes the confirmed database handoff APIs:
 * - /api-get-view-user-list-info
 * - /api-post-add-update-user
 */

module.exports = router;
