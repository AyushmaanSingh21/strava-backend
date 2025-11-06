const express = require('express');
const router = express.Router();
const { exchangeToken, refreshToken } = require('../controllers/authController');

/**
 * Route logging middleware
 */
router.use((req, res, next) => {
  console.log(`[AUTH ROUTE] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/auth/exchange
 * Exchange OAuth authorization code for access token
 */
router.post('/exchange', exchangeToken);

/**
 * POST /api/auth/refresh
 * Refresh expired access token
 */
router.post('/refresh', refreshToken);

module.exports = router;

