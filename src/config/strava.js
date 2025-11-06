require('dotenv').config();

/**
 * Strava API Configuration
 * Validates environment variables and exports configuration object
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// Required environment variables
const requiredEnvVars = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET'
];

// Validate required environment variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
      `Please add it to your .env file.`
    );
  }
});

// Strava API Configuration
const stravaConfig = {
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  redirectUri: `${FRONTEND_URL}/callback`,
  authorizationUrl: 'https://www.strava.com/oauth/authorize',
  tokenUrl: 'https://www.strava.com/oauth/token',
  apiBaseUrl: 'https://www.strava.com/api/v3',
  scopes: 'activity:read_all,profile:read_all'
};

// Log successful configuration load (without exposing secrets)
console.log('[CONFIG]', new Date().toISOString(), 'Strava configuration loaded successfully');
console.log('[CONFIG] Client ID:', stravaConfig.clientId ? `${stravaConfig.clientId.slice(0, 10)}...` : 'MISSING');
console.log('[CONFIG] Redirect URI:', stravaConfig.redirectUri);
console.log('[CONFIG] API Base URL:', stravaConfig.apiBaseUrl);

module.exports = stravaConfig;

