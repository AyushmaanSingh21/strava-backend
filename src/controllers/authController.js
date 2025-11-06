const axios = require('axios');
const stravaConfig = require('../config/strava');

/**
 * Exchange OAuth authorization code for access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exchangeToken = async (req, res) => {
  try {
    const { code } = req.body;

    // Validate code
    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code',
        message: 'Authorization code is required',
        details: 'Please provide a valid authorization code from Strava'
      });
    }

    console.log('[AUTH]', new Date().toISOString(), 'Token exchange requested');

    // Prepare token exchange request
    const tokenData = {
      client_id: stravaConfig.clientId,
      client_secret: stravaConfig.clientSecret,
      code: code,
      grant_type: 'authorization_code'
    };

    // Make request to Strava token endpoint
    const response = await axios.post(stravaConfig.tokenUrl, tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    // Extract athlete info (sanitize if needed)
    const athleteData = athlete ? {
      id: athlete.id,
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      profile: athlete.profile || athlete.profile_medium,
      city: athlete.city,
      state: athlete.state,
      country: athlete.country
    } : null;

    console.log('[AUTH]', new Date().toISOString(), 'Token exchange successful for athlete:', athleteData?.id);

    // Return tokens and athlete data
    res.json({
      access_token,
      refresh_token,
      expires_at,
      athlete: athleteData
    });

  } catch (error) {
    console.error('[AUTH ERROR]', new Date().toISOString(), 'Token exchange failed:', error.message);

    // Handle Strava API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      return res.status(status).json({
        error: 'Token exchange failed',
        message: data.message || 'Failed to exchange authorization code',
        details: data.errors || 'Invalid or expired authorization code'
      });
    }

    // Handle network errors
    if (error.request) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to reach Strava API',
        details: 'Please check your internet connection and try again'
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during token exchange',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh expired access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Validate refresh_token
    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required',
        details: 'Please provide a valid refresh token'
      });
    }

    console.log('[AUTH]', new Date().toISOString(), 'Token refresh requested');
    console.log('[AUTH] Refresh token prefix:', refresh_token ? `${refresh_token.slice(0, 10)}...` : 'MISSING');

    // Prepare token refresh request
    const tokenData = {
      client_id: stravaConfig.clientId,
      client_secret: stravaConfig.clientSecret,
      refresh_token: refresh_token,
      grant_type: 'refresh_token'
    };

    // Make request to Strava token endpoint
    const response = await axios.post(stravaConfig.tokenUrl, tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token: new_refresh_token, expires_at } = response.data;

    console.log('[AUTH]', new Date().toISOString(), 'Token refresh successful');

    // Return new tokens
    res.json({
      access_token,
      refresh_token: new_refresh_token || refresh_token, // Use new refresh token if provided, otherwise keep old one
      expires_at
    });

  } catch (error) {
    console.error('[AUTH ERROR]', new Date().toISOString(), 'Token refresh failed:', error.message);

    // Handle Strava API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      return res.status(status === 401 ? 401 : 400).json({
        error: 'Token refresh failed',
        message: data.message || 'Failed to refresh token',
        details: data.errors || 'Invalid or expired refresh token'
      });
    }

    // Handle network errors
    if (error.request) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to reach Strava API',
        details: 'Please check your internet connection and try again'
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during token refresh',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  exchangeToken,
  refreshToken
};

