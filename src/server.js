require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- USER STATS ROUTES ---

// 1. Track User (Upsert)
app.post('/api/users/track', async (req, res) => {
  try {
    const { stravaId, firstname, lastname, profile } = req.body;
    
    if (!stravaId) return res.status(400).json({ error: 'Missing stravaId' });

    // Update if exists, Insert if new (upsert)
    await User.findOneAndUpdate(
      { stravaId },
      { 
        stravaId, 
        firstname, 
        lastname, 
        profile,
        lastLogin: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking user:', error);
    res.status(500).json({ error: 'Failed to track user' });
  }
});

// 2. Get User Count
app.get('/api/users/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    // Return at least 100 to match your "Trusted by 100+" claim initially ;)
    // But realistically, return the real count + some offset if you want
    res.json({ count });
  } catch (error) {
    console.error('Error counting users:', error);
    res.status(500).json({ error: 'Failed to count users' });
  }
});

// Routes
const roastRoutes = require('./routes/roast');
app.use('/api/roast', roastRoutes);

const proxyRoutes = require('./routes/proxy');
app.use('/api/proxy', proxyRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


