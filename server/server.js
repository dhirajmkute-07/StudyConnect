// Fix: Node inherits a loopback DNS server (127.0.0.1) from the system config
// (set by VPN/WSL2/Docker DNS stub). Override to public resolvers so that
// mongoose's mongodb+srv SRV lookup succeeds — identical to what nslookup uses.
const dns = require('dns');
dns.setServers(['8.8.8.8', '4.2.2.2', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// ── MongoDB connection (cached for Vercel serverless warm starts) ──────────────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  isConnected = true;
  console.log('✅ MongoDB connected');
}

// Connect on startup (non-serverless); also called per-request in connectDB()
connectDB().catch(err => {
  // Sanitize error — strip any URI/credentials from the message
  const safe = err.message.replace(/mongodb(\+srv)?:\/\/[^@\s]*/gi, 'mongodb+srv://[redacted]');
  console.error('❌ MongoDB connection error:', safe);
  console.error('   Error code:', err.code || 'N/A');
  process.exit(1);
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Ensure DB is connected before handling any API request
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable. Please try again.' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/me',            require('./routes/profile'));
app.use('/api/profile',       require('./routes/profile'));
app.use('/api/subjects',      require('./routes/subjects'));
app.use('/api/timetable',     require('./routes/timetable'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/tests',         require('./routes/tests'));
app.use('/api/notifications', require('./routes/notifications'));

// ── SPA catch-all ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Local server (not used on Vercel) ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 StudyConnect running at http://localhost:${PORT}\n`);
  });
}

module.exports = app;
