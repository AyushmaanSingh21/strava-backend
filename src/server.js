require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
const roastRoutes = require('./routes/roast');
app.use('/api/roast', roastRoutes);

const proxyRoutes = require('./routes/proxy');
app.use('/api/proxy', proxyRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


