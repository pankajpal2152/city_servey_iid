const express = require('express');

const router = express.Router();

// GET /health
/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check whether the City Survey API is running
 *     security: []
 *     responses:
 *       200:
 *         description: API health response
 */
router.get('/', (req, res) => {
  return res.json({
    status: 'true',
    response: 'City Survey API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
