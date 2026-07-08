const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const {
  compactObject,
  getProcedureJsonValue,
  isProcedureSuccess,
} = require('../utils/procedureResponse');

const router = express.Router();

function normalizeAuthenticatePayload(body) {
  const items = Array.isArray(body) ? body : [body];

  return items.map((item) => ({
    ...item,
    USER_NAME: item?.USER_NAME ?? item?.username ?? item?.email ?? item?.EMAIL_ID,
    PASSWORD: item?.PASSWORD ?? item?.password,
  }));
}

function getJwtUserPayload(result, requestPayload) {
  const requestUserName = requestPayload?.[0]?.USER_NAME;

  return compactObject({
    USER_ID: result.USER_ID,
    USER_SYS_ID: result.USER_SYS_ID,
    FIRST_NAME: result.FIRST_NAME,
    LAST_NAME: result.LAST_NAME,
    EMAIL_ID: result.EMAIL_ID ?? requestUserName,
    MOBILE_NO: result.MOBILE_NO,
    SYSTEM_ROLE_SYS_ID: result.SYSTEM_ROLE_SYS_ID,
    SYSTEM_ROLE_NAME: result.SYSTEM_ROLE_NAME,
    ORGANISATION_SYS_ID: result.ORGANISATION_SYS_ID,
  });
}

async function authenticateUser(req, res) {
  let conn;

  try {
    const requestPayload = normalizeAuthenticatePayload(req.body);
    const credentials = requestPayload[0];

    if (!credentials?.USER_NAME || !credentials?.PASSWORD) {
      return res.status(400).json({
        status: 'false',
        response: 'USER_NAME and PASSWORD are required',
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_POST_USER_AUTHENTICATE_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['AUTHENTICATE_USER', JSON.stringify(requestPayload)]
    );

    const procedureResult = getProcedureJsonValue(rows);
    const result = Array.isArray(procedureResult) ? procedureResult[0] : procedureResult;

    if (!result) {
      return res.status(500).json({
        status: 'false',
        response: 'Oops!! something went wrong',
      });
    }

    if (!isProcedureSuccess(result)) {
      return res.status(401).json(result);
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        status: 'false',
        response: 'JWT secret is not configured',
      });
    }

    const token = jwt.sign(getJwtUserPayload(result, requestPayload), process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({ Token: token, ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    if (conn) conn.release();
  }
}

// POST /api/auth/api-post-authenticate-user
/**
 * @swagger
 * /api/auth/api-post-authenticate-user:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Authenticate a City Survey user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - USER_NAME
 *                     - PASSWORD
 *                   properties:
 *                     USER_NAME:
 *                       type: string
 *                       example: sai@yopmail.com
 *                     PASSWORD:
 *                       type: string
 *                       example: Abc@1234
 *               - type: object
 *                 required:
 *                   - USER_NAME
 *                   - PASSWORD
 *                 properties:
 *                   USER_NAME:
 *                     type: string
 *                     example: sai@yopmail.com
 *                   PASSWORD:
 *                     type: string
 *                     example: Abc@1234
 *     responses:
 *       200:
 *         description: User authenticated and JWT returned
 *       401:
 *         description: Invalid credentials
 */
router.post('/api-post-authenticate-user', authenticateUser);

// Legacy login alias kept inactive for City Survey API naming.
// router.post('/login', authenticateUser);

/*
 * City Survey currently exposes only user authentication from this router.
 * Previous event/attendee auth endpoints are intentionally not registered:
 * - /api-post-authenticate-module-credentials
 * - /api-post-attendees-otp-verification
 * - /api-post-attendees-qr-code-verification
 * - /api-post-authenticate-client-user
 * - /api-post-attendees-direct-login
 */

module.exports = router;
