const express = require('express');
const router = express.Router();
const { generateRoast, chatWithAI } = require('../controllers/roastController');

router.post('/generate', generateRoast);
router.post('/chat', chatWithAI);

module.exports = router;


