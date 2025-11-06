const axios = require('axios');
const stravaConfig = require('../config/strava');

/**
 * Proxy requests to Strava API
 * Securely forwards requests from frontend to Strava API with proper authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const proxyStravaRequest = async (req, res) => {
  try {
    // Extract authorization token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization token',
        details: 'Please provide a valid Bearer token in the Authorization header'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenPrefix = token ? `${token.slice(0, 10)}...` : 'MISSING';

    // Extract endpoint from request path
    // Example: /api/strava/athlete -> /athlete
    const endpoint = req.path;
    const fullUrl = `${stravaConfig.apiBaseUrl}${endpoint}`;

    // Log the request (without exposing full token)
    console.log('[STRAVA API]', new Date().toISOString(), `${req.method} ${endpoint}`);
    console.log('[STRAVA API] Token prefix:', tokenPrefix);

    // Build request options
    const requestConfig = {
      method: req.method,
      url: fullUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: req.query, // Forward query parameters
      timeout: 10000 // 10 second timeout
    };

    // Add request body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.body && Object.keys(req.body).length > 0) {
        requestConfig.data = req.body;
      }
    }

    // Make request to Strava API
    const response = await axios(requestConfig);

    // Log successful response
    console.log('[STRAVA API]', new Date().toISOString(), `Response: ${response.status} ${response.statusText}`);

    // Return Strava's response as-is
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[STRAVA API ERROR]', new Date().toISOString(), 'Proxy request failed:', error.message);

    // Handle Strava API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Map common Strava error codes
      let errorMessage = 'Strava API error';
      let errorDetails = data.message || data.errors || 'Unknown error';

      if (status === 401) {
        errorMessage = 'Unauthorized';
        errorDetails = 'Token is invalid or expired. Please refresh your token.';
      } else if (status === 403) {
        errorMessage = 'Forbidden';
        errorDetails = 'You do not have permission to access this resource.';
      } else if (status === 404) {
        errorMessage = 'Not Found';
        errorDetails = 'The requested resource was not found.';
      } else if (status === 429) {
        errorMessage = 'Rate Limit Exceeded';
        errorDetails = 'Too many requests. Please wait before making more requests.';
      } else if (status >= 500) {
        errorMessage = 'Strava API Error';
        errorDetails = 'Strava API is experiencing issues. Please try again later.';
      }

      return res.status(status).json({
        error: errorMessage,
        message: errorDetails,
        statusCode: status
      });
    }

    // Handle network errors
    if (error.request) {
      console.error('[STRAVA API ERROR]', 'Network error - no response received');
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to reach Strava API',
        details: 'Please check your internet connection and try again'
      });
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'The request to Strava API timed out',
        details: 'Please try again'
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while proxying the request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  proxyStravaRequest
};

