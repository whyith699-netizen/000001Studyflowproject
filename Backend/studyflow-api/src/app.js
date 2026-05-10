/**
 * app.js — Konfigurasi Express untuk StudyFlow API
 */
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// Konfigurasi Database
const { testConnection } = require('./config/database');

// Routes
const authRouter       = require('./routes/auth');
const usersRouter      = require('./routes/users');
const classesRouter    = require('./routes/classes');
const tasksRouter      = require('./routes/tasks');
const studyToolsRouter = require('./routes/studyTools');
const studySessionsRouter = require('./routes/studySessions');
const calendarEventsRouter = require('./routes/calendarEvents');
const uniformsRouter = require('./routes/uniforms');
const achievementsRouter = require('./routes/achievements');
const friendsRouter = require('./routes/friends');
const inboxRouter = require('./routes/inbox');

const app = express();

// ── Middleware Global ────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'chrome-extension://*',
        /\.firebaseapp\.com$/,
    ],
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    const dbOk = await testConnection().catch(() => false);
    res.status(dbOk ? 200 : 503).json({
        status: dbOk ? 'ok' : 'degraded',
        message: 'StudyFlow API',
        db: dbOk ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/classes',     classesRouter);
app.use('/api/tasks',       tasksRouter);
app.use('/api/study-tools', studyToolsRouter);
app.use('/api/study-sessions', studySessionsRouter);
app.use('/api/calendar-events', calendarEventsRouter);
app.use('/api/uniforms', uniformsRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/inbox', inboxRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan` });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[APP] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
