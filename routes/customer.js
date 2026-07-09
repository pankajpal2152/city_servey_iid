const express = require('express');
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { getProcedureJsonValue } = require('../utils/procedureResponse');

const router = express.Router();

function getCustomerPayload(body) {
  return Array.isArray(body) ? body[0] : body;
}

function validateCustomerPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Request body must be a customer object';
  }

  if (!payload.ITEM) {
    return 'ITEM is required';
  }

  if (payload.ITEM === 'ADD') {
    const requiredFields = ['CUSTOMER_TYPE', 'CUSTOMER_NAME', 'BILLING_ADDRESS', 'CREATED_BY'];
    const missingField = requiredFields.find((field) => {
      const value = payload[field];
      return value === undefined || value === null || value === '';
    });

    if (missingField) {
      return `${missingField} is required`;
    }
  }

  if (payload.PIC !== undefined && !Array.isArray(payload.PIC)) {
    return 'PIC must be an array';
  }

  return null;
}

// GET /api/customer/api-get-view-list-customer-details
/**
 * @swagger
 * /api/customer/api-get-view-list-customer-details:
 *   get:
 *     tags:
 *       - Customer
 *     summary: View City Survey customer list details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *           default: VIEW_ALL
 *         required: false
 *         description: Customer list view mode passed to the stored procedure
 *         example: VIEW_ALL
 *     responses:
 *       200:
 *         description: Customer list response from stored procedure
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.get('/api-get-view-list-customer-details', auth, async (req, res) => {
  let conn;

  try {
    const item = req.query.ITEM || 'VIEW_ALL';

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_GET_LIST_CUSTOMER_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_CUSTOMER', item]
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

// POST /api/customer/api-post-add-update-customer-details
/**
 * @swagger
 * /api/customer/api-post-add-update-customer-details:
 *   post:
 *     tags:
 *       - Customer
 *     summary: Add or update City Survey customer details
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
 *               - CUSTOMER_TYPE
 *               - CUSTOMER_NAME
 *               - BILLING_ADDRESS
 *               - CREATED_BY
 *             properties:
 *               ITEM:
 *                 type: string
 *                 example: ADD
 *               CUSTOMER_TYPE:
 *                 type: string
 *                 example: Individual
 *               CUSTOMER_NAME:
 *                 type: string
 *                 example: Ravi
 *               BILLING_ADDRESS:
 *                 type: string
 *                 example: Kolkata
 *               CREATED_BY:
 *                 type: integer
 *                 example: 1
 *               PIC:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     FULL_NAME:
 *                       type: string
 *                       example: Ranjan
 *                     CONTACT_NO:
 *                       type: string
 *                       example: "7875585"
 *                     EMAIL_ID:
 *                       type: string
 *                       example: ranjan@gmail.com
 *                     DEPARTMENT:
 *                       type: string
 *                       example: Back Office
 *                     DESIGNATION:
 *                       type: string
 *                       example: Employee
 *     responses:
 *       200:
 *         description: Customer add/update response from stored procedure
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Authorization token missing
 *       403:
 *         description: Authorization token invalid
 */
router.post('/api-post-add-update-customer-details', auth, async (req, res) => {
  let conn;

  try {
    const requestPayload = getCustomerPayload(req.body);
    const validationError = validateCustomerPayload(requestPayload);

    if (validationError) {
      return res.status(400).json({
        status: 'false',
        response: validationError,
      });
    }

    conn = await db.getConnection();
    const [rows] = await conn.execute(
      'CALL USP_POST_CUSTOMER_DETAILS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
      ['ADD_UPDATE_CUSTOMER', JSON.stringify(requestPayload)]
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
