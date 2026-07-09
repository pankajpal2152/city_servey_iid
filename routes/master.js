const express = require('express');
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { getProcedureJsonValue } = require('../utils/procedureResponse');

const router = express.Router();

function getSystemRolePayload(body) {
  return Array.isArray(body) ? body[0] : body;
}

function parseNullableInt(value, fieldName) {
  if (value === undefined || value === null || value === '' || value === 'null') {
    return { value: null };
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    return { error: `${fieldName} must be an integer` };
  }

  return { value: parsedValue };
}

function validateSystemRolePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Request body must be a system role object';
  }

  if (!payload.ITEM) {
    return 'ITEM is required';
  }

  if (payload.ITEM === 'ADD') {
    const requiredFields = [
      'RECORD_SYS_ID',
      'ORGANIZATION_SYS_ID',
      'SYSTEM_ROLE',
      'ROLE_DESC',
      'USER_TYPE',
      'CREATED_BY',
    ];
    const missingField = requiredFields.find((field) => {
      const value = payload[field];
      return value === undefined || value === null || value === '';
    });

    if (missingField) {
      return `${missingField} is required`;
    }
  }

  return null;
}

// GET /api/master/api-get-view-master-system-roles
/**
 * @swagger
 * /api/master/api-get-view-master-system-roles:
 *   get:
 *     tags:
 *       - Master
 *     summary: View City Survey master system roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *           default: VIEW_ALL
 *         required: false
 *         description: Master data view mode passed to the stored procedure
 *         example: VIEW_ALL
 *       - in: query
 *         name: RECORD_SYS_ID
 *         schema:
 *           type: integer
 *           nullable: true
 *         required: false
 *         description: Optional role record id filter
 *       - in: query
 *         name: ORGANIZATION_SYS_ID
 *         schema:
 *           type: integer
 *           nullable: true
 *         required: false
 *         description: Optional organization id filter
 *     responses:
 *       200:
 *         description: System role master response from stored procedure
 *       400:
 *         description: Invalid query parameter
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.get('/api-get-view-master-system-roles', auth, async (req, res) => {
  let conn;

  try {
    const item = req.query.ITEM || 'VIEW_ALL';
    const recordSysId = parseNullableInt(req.query.RECORD_SYS_ID, 'RECORD_SYS_ID');
    const organizationSysId = parseNullableInt(req.query.ORGANIZATION_SYS_ID, 'ORGANIZATION_SYS_ID');

    if (recordSysId.error || organizationSysId.error) {
      return res.status(400).json({
        status: 'false',
        response: recordSysId.error || organizationSysId.error,
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_SYSTEM_ROLE', item, recordSysId.value, organizationSysId.value]
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

// POST /api/master/api-post-add-update-master-system-role
/**
 * @swagger
 * /api/master/api-post-add-update-master-system-role:
 *   post:
 *     tags:
 *       - Master
 *     summary: Add or update a City Survey master system role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM
 *               - RECORD_SYS_ID
 *               - ORGANIZATION_SYS_ID
 *               - SYSTEM_ROLE
 *               - ROLE_DESC
 *               - USER_TYPE
 *               - CREATED_BY
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD
 *               RECORD_SYS_ID:
 *                 type: string
 *                 example: "0"
 *               ORGANIZATION_SYS_ID:
 *                 type: string
 *                 example: "1"
 *               SYSTEM_ROLE:
 *                 type: string
 *                 example: Business Admin
 *               ROLE_DESC:
 *                 type: string
 *                 example: Business Admin
 *               USER_TYPE:
 *                 type: string
 *                 example: Internal
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: System role add/update response from stored procedure
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.post('/api-post-add-update-master-system-role', auth, async (req, res) => {
  let conn;

  try {
    const requestPayload = getSystemRolePayload(req.body);
    const validationError = validateSystemRolePayload(requestPayload);

    if (validationError) {
      return res.status(400).json({
        status: 'false',
        response: validationError,
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);',
      ['ADD_UPDATE_SYSTEM_ROLE', JSON.stringify(requestPayload)]
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

module.exports = router;
