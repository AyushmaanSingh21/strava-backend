const express = require('express');
const router = express.Router();
const { proxyStravaRequest } = require('../controllers/stravaController');

/**
 * Route logging middleware
 */
router.use((req, res, next) => {
  console.log(`[STRAVA ROUTE] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/strava/*
 * Proxy GET requests to Strava API
 * Examples:
 *   GET /api/strava/athlete -> GET /athlete on Strava
 *   GET /api/strava/athlete/activities -> GET /athlete/activities on Strava
 */
router.get('*', proxyStravaRequest);

/**
 * POST /api/strava/*
 * Proxy POST requests to Strava API
 */
router.post('*', proxyStravaRequest);

/**
 * PUT /api/strava/*
 * Proxy PUT requests to Strava API
 */
router.put('*', proxyStravaRequest);

/**
 * DELETE /api/strava/*
 * Proxy DELETE requests to Strava API
 */
router.delete('*', proxyStravaRequest);

module.exports = router;

