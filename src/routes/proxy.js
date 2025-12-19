const express = require('express');
const router = express.Router();
const https = require('https');

/**
 * Proxy endpoint to fetch images from Strava CDN
 * This bypasses CORS restrictions
 */
router.get('/image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing image URL' });
    }

    // Basic validation to ensure it's a URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).json({ error: 'Failed to fetch image' });
      }

      const contentType = response.headers['content-type'];
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      response.pipe(res);
    }).on('error', (error) => {
      console.error('Image proxy error:', error);
      res.status(500).json({ error: 'Failed to proxy image' });
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

module.exports = router;
