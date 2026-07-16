const express = require('express');
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { getProcedureJsonValue } = require('../utils/procedureResponse');

const router = express.Router();

function getProjectPayload(body) {
  return Array.isArray(body) ? body[0] : body;
}

function parseRequiredInt(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return { error: `${fieldName} is required` };
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    return { error: `${fieldName} must be an integer` };
  }

  return { value: parsedValue };
}

function validateProjectPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Request body must be a project object';
  }

  if (!payload.ITEM) {
    return 'ITEM is required';
  }

  if (payload.ITEM === 'ADD') {
    const requiredFields = [
      'CUSTOMER_SYS_ID',
      'PIC_SYS_ID',
      'SITE_ADDRESS',
      'ASSIGNED_SURVEYOR_SYS_ID',
      'ASSIGNED_SURVEYOR',
      'SURVEY_TYPE_SYS_ID',
      'PROPERTY_TYPE_SYS_ID',
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

// GET /api/project/api-get-view-list-project-details
/**
 * @swagger
 * /api/project/api-get-view-list-project-details:
 *   get:
 *     tags:
 *       - Project
 *     summary: View City Survey project list details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *           default: VIEW_ALL
 *         required: false
 *         description: Project list view mode passed to the stored procedure
 *         example: VIEW_ALL
 *     responses:
 *       200:
 *         description: Project list response from stored procedure
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.get('/api-get-view-list-project-details', auth, async (req, res) => {
  let conn;

  try {
    const item = req.query.ITEM || 'VIEW_ALL';

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_GET_LIST_PROJECT_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_PROJECT', item]
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

// GET /api/project/api-get-view-specific-project-details
/**
 * @swagger
 * /api/project/api-get-view-specific-project-details:
 *   get:
 *     tags:
 *       - Project
 *     summary: View specific City Survey project details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *           default: SPECIFIC
 *         required: false
 *         description: Specific project view mode passed to the stored procedure
 *         example: SPECIFIC
 *       - in: query
 *         name: PROJECT_SYS_ID
 *         schema:
 *           type: integer
 *         required: true
 *         description: Project record id
 *         example: 2
 *     responses:
 *       200:
 *         description: Specific project details response from stored procedure
 *       400:
 *         description: Invalid request parameter
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.get('/api-get-view-specific-project-details', auth, async (req, res) => {
  let conn;

  try {
    const item = req.query.ITEM || 'SPECIFIC';
    const projectSysId = parseRequiredInt(req.query.PROJECT_SYS_ID, 'PROJECT_SYS_ID');

    if (projectSysId.error) {
      return res.status(400).json({
        status: 'false',
        response: projectSysId.error,
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_GET_SPECIFIC_PROJECT_ACTIVITY(?, ?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_PROJECT', item, projectSysId.value]
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

// POST /api/project/api-post-add-update-project
/**
 * @swagger
 * /api/project/api-post-add-update-project:
 *   post:
 *     tags:
 *       - Project
 *     summary: Add or update a City Survey project
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
 *               - CUSTOMER_SYS_ID
 *               - PIC_SYS_ID
 *               - SITE_ADDRESS
 *               - ASSIGNED_SURVEYOR_SYS_ID
 *               - ASSIGNED_SURVEYOR
 *               - SURVEY_TYPE_SYS_ID
 *               - PROPERTY_TYPE_SYS_ID
 *               - CREATED_BY
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD
 *               CUSTOMER_SYS_ID:
 *                 type: integer
 *                 example: 17
 *               PIC_SYS_ID:
 *                 type: integer
 *                 example: 22
 *               SITE_ADDRESS:
 *                 type: string
 *                 example: 51 Jalan Kukoh 01-37, 1620051, Singapore
 *               ASSIGNED_SURVEYOR_SYS_ID:
 *                 type: integer
 *                 example: 1
 *               ASSIGNED_SURVEYOR:
 *                 type: string
 *                 example: Marcus Koh
 *               SURVEY_TYPE_SYS_ID:
 *                 type: integer
 *                 example: 5
 *               PROPERTY_TYPE_SYS_ID:
 *                 type: integer
 *                 example: 15
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Project add/update response from stored procedure
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.post('/api-post-add-update-project', auth, async (req, res) => {
  let conn;

  try {
    const requestPayload = getProjectPayload(req.body);
    const validationError = validateProjectPayload(requestPayload);

    if (validationError) {
      return res.status(400).json({
        status: 'false',
        response: validationError,
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_POST_PROJECT_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['ADD_UPDATE_PROJECT', JSON.stringify(requestPayload)]
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
