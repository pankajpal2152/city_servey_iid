const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your mysql2 connection
const auth = require('../middlewares/auth');
const fs = require("fs");
const path = require("path");
// Define upload folder
const uploadDir = path.join(__dirname, "uploadedFiles");

// POST /api/file/api-post-add-update-file-upload
/**
 * @swagger
 * /api/file/api-post-add-update-file-upload:
 *   post:
 *     tags:
 *       - FileUpload
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
router.post('/api-post-add-update-file-upload', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const requestJson = JSON.stringify(req.body); // Convert request body to JSON string
    const [rows] = await conn.execute(
      "CALL USP_POST_FILE_UPLOAD_ACTIVITY(?, ?, @ERRNO, @ERRMSG);",
      ['FILE_UPLOAD', requestJson]
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

// GET /api/file/api-get-view-file-upload
/**
 * @swagger
 * /api/file/api-get-view-file-upload:
 *   get:
 *     tags:
 *       - FileUpload
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
 *       - in: query
 *         name: MODULE
 *         schema:
 *           type: string
 *         required: false
 *         example: image
 *       - in: query
 *         name: UPLOAD_FOR
 *         schema:
 *           type: string
 *         required: false
 *         example: image
 *     responses:
 *       200:
 *         description: JSON response from stored procedure
 */
router.get('/api-get-view-file-upload', auth, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { ITEM,EVENT_SYS_ID,MODULE,UPLOAD_FOR} = req.query;
    const [rows] = await conn.execute(
      "CALL USP_GET_FILE_UPLOAD_ACTIVITY(?, ?, ?,?,?,@ERRNO, @ERRMSG);",
      ['VIEW_FILE_UPLOAD', ITEM,EVENT_SYS_ID,MODULE,UPLOAD_FOR]
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

// -------------------- UPLOAD API --------------------
router.post("/upload",auth, async (req, res) => {
  try {
    if (!req.files || !req.files["files[]"]) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
 
    // ✅ Ensure upload folder exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true }); // create folder if missing
    }
 
    let uploadedFiles = req.files["files[]"];
    if (!Array.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];
 
    const savedFiles = [];
    for (const file of uploadedFiles) {
      const savePath = path.join(uploadDir, file.name);
 
      // Save file
      await file.mv(savePath);
 
      savedFiles.push({
        originalName: file.name,
        size: file.size,
        path: savePath
      });
    }
 
    res.json({ success: true, message: "Files uploaded", files: savedFiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// -------------------- DOWNLOAD API --------------------
// router.get("/download", auth, (req, res) => {
//   const filename = req.query.filename;  // read from query param
//   const filePath = path.join(uploadDir, filename);
 
//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({ success: false, message: "File not found" });
//   }
 
//   res.download(filePath, filename, (err) => {
//     if (err) {
//       res.status(500).json({ success: false, message: "Error downloading file" });
//     }
//   });
// });

router.get("/download",  (req, res) => {
  const filename = req.query.filename;  // read from query param
  const filePath = path.join(uploadDir, filename);
 
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }
 
  res.download(filePath, filename, (err) => {
    if (err) {
      res.status(500).json({ success: false, message: "Error downloading file" });
    }
  });
});

module.exports = router;