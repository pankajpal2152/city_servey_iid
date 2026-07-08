const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your mysql2 connection
const auth = require('../middlewares/auth');

// POST /api/master/add-update-master-name
/**
 * @swagger
 * /api/master/add-update-master-name:
 *   post:
 *     tags:
 *       - Master
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
router.post('/add-update-master-name', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_MASTER_NAME', requestJson]
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

// GET /api/master/api-get-view-master-details
/**
 * @swagger
 * /api/master/api-get-view-master-details:
 *   get:
 *     tags:
 *       - Master
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
 *         name: RECORD_SYS_ID
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
router.get('/api-get-view-master-details', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, RECORD_SYS_ID,ORGANIZATION_SYS_ID } = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?,?, @ERRNO, @ERRMSG);",
      ['VIEW_MASTER_NAME', ITEM, RECORD_SYS_ID,ORGANIZATION_SYS_ID]
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



// GET /api/master/api-get-view-country-info
/**
 * @swagger
 * /api/master/api-get-view-country-info:
 *   get:
 *     tags:
 *       - Master
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: RECORD_SYS_ID
 *         schema:
 *           type: string
 *         required: false
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
router.get('/api-get-view-country-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, RECORD_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const params = [
      'VIEW_COUNTRY_NAME',
      ITEM ?? null,
      RECORD_SYS_ID ?? null,
      ORGANIZATION_SYS_ID ?? null
    ];

    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      params
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

// GET /api/master/api-get-view-event-category
/**
 * @swagger
 * /api/master/api-get-view-event-category:
 *   get:
 *     tags:
 *       - Master
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: RECORD_SYS_ID
 *         schema:
 *           type: string
 *         required: false
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
router.get('/api-get-view-event-category', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, RECORD_SYS_ID = null,ORGANIZATION_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?,? ,@ERRNO, @ERRMSG);",
      ['VIEW_EVENT_CATEGORY', ITEM, RECORD_SYS_ID,ORGANIZATION_SYS_ID]
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

// POST /api/master/api-post-add-update-country
/**
 * @swagger
 * /api/master/api-post-add-update-country:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-country', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_COUNTRY', requestJson]
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

// POST /api/master/api-post-add-update-event-category
/**
 * @swagger
 * /api/master/api-post-add-update-event-category:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-event-category', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_EVENT_CATEGORY', requestJson]
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

// POST /api/master/api-post-add-update-master-system-role
/**
 * @swagger
 * /api/master/api-post-add-update-master-system-role:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-master-system-role', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_SYSTEM_ROLE', requestJson]
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

// GET /api/master/api-get-view-master-system-roles
/**
 * @swagger
 * /api/master/api-get-view-master-system-roles:
 *   get:
 *     tags:
 *       - Master
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: RECORD_SYS_ID
 *         schema:
 *           type: string
 *         required: false
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
router.get('/api-get-view-master-system-roles', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, RECORD_SYS_ID, ORGANIZATION_SYS_ID } = req.query;
    
    // Convert undefined to null for SQL compatibility
    const params = [
      'VIEW_SYSTEM_ROLE',
      ITEM ?? null,
      RECORD_SYS_ID ?? null,
      ORGANIZATION_SYS_ID ?? null
    ];

    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      params
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

// POST /api/master/api-post-add-update-master-project-role
/**
 * @swagger
 * /api/master/api-post-add-update-master-project-role:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-master-project-role', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_PROJECT_ROLE', requestJson]
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

// GET /api/master/api-get-view-master-project-role
/**
 * @swagger
 * /api/master/api-get-view-master-project-role:
 *   get:
 *     tags:
 *       - Master
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ITEM
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: RECORD_SYS_ID
 *         schema:
 *           type: string
 *         required: false
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
router.get('/api-get-view-master-project-role', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, RECORD_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const params = [
      'VIEW_PROJECT_ROLE',
      ITEM ?? null,
      RECORD_SYS_ID ?? null,
      ORGANIZATION_SYS_ID ?? null
    ];

    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      params
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

// POST /api/master/api-post-add-update-master-organization
/**
 * @swagger
 * /api/master/api-post-add-update-master-organization:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-master-organization', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_ORGANIZATION', requestJson]
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

// GET /api/master/api-get-view-master-organization
/**
 * @swagger
 * /api/master/api-get-view-master-organization:
 *   get:
 *     tags:
 *       - Master
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
 *         name: RECORD_SYS_ID
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
router.get('/api-get-view-master-organization', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,RECORD_SYS_ID = null,ORGANIZATION_SYS_ID = null} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_ORGANIZATION', ITEM,RECORD_SYS_ID,ORGANIZATION_SYS_ID]
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

// GET /api/master/api-get-view-master-lucky-draw-type
/**
 * @swagger
 * /api/master/api-get-view-master-lucky-draw-type:
 *   get:
 *     tags:
 *       - Master
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
 *         name: RECORD_SYS_ID
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
router.get('/api-get-view-master-lucky-draw-type', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM, RECORD_SYS_ID, ORGANIZATION_SYS_ID } = req.query;

    const params = [
      'VIEW_LUCKY_DRAW_TYPE',
      ITEM ?? null,
      RECORD_SYS_ID ?? null,
      ORGANIZATION_SYS_ID ?? null
    ];

    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?, @ERRNO, @ERRMSG);",
      params
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

// GET /api/master/api-get-view-master-sub-lucky-draw-type
/**
 * @swagger
 * /api/master/api-get-view-master-sub-lucky-draw-type:
 *   get:
 *     tags:
 *       - Master
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
 *         name: RECORD_SYS_ID
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
router.get('/api-get-view-master-sub-lucky-draw-type', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,RECORD_SYS_ID,ORGANIZATION_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_ALL_MASTER_DATA(?, ?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_SUB_LUCKY_DRAW_TYPE', ITEM,RECORD_SYS_ID,ORGANIZATION_SYS_ID]
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

// POST /api/master/api-post-add-update-master-lucky-draw-type
/**
 * @swagger
 * /api/master/api-post-add-update-master-lucky-draw-type:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-master-lucky-draw-type', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_LUCKY_DRAW_TYPE', requestJson]
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

// POST /api/master/api-post-add-update-master-sub-lucky-draw-type
/**
 * @swagger
 * /api/master/api-post-add-update-master-sub-lucky-draw-type:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-master-sub-lucky-draw-type', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_SUB_LUCKY_DRAW_TYPE', requestJson]
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

// POST /api/master/api-post-add-update-master-lucky
/**
 * @swagger
 * /api/master/api-post-add-update-master-lucky:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-master-lucky', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_ALL_MASTER_DATA(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_SUB_LUCKY_DRAW_TYPE', requestJson]
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

// POST /api/master/api-post-add-update-event-smtp-credentials
/**
 * @swagger
 * /api/master/api-post-add-update-event-smtp-credentials:
 *   post:
 *     tags:
 *       - Master
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
router.post('/api-post-add-update-event-smtp-credentials', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_EVENT_SMTP_CREDENTIALS_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['ADD_UPDATE_SMTP_CREDENTIALS', requestJson]
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

// GET /api/master/api-get-specific-event-wise-smtp-credentials-info
/**
 * @swagger
 * /api/master/api-get-specific-event-wise-smtp-credentials-info:
 *   get:
 *     tags:
 *       - Master
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
router.get('/api-get-specific-event-wise-smtp-credentials-info', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,EVENT_SYS_ID} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_SPECIFIC_EVENT_WISE_SMTP_CREDENTIALS_ACTIVITY(?, ?, ?,@ERRNO, @ERRMSG);",
      ['VIEW_SMTP_CREDENTIALS', ITEM,EVENT_SYS_ID]
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
