const express = require('express');
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { getProcedureJsonValue } = require('../utils/procedureResponse');

const router = express.Router();

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
 * City Survey API scope from the database handoff currently includes only
 * add/update user here. Previous read endpoints are inactive until the City
 * Survey database contract is confirmed:
 * - /api-get-view-user-profile-info
 * - /api-get-view-user-info
 */

module.exports = router;
