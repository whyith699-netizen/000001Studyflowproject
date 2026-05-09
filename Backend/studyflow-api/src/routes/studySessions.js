const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow, toStudySession } = require('./helpers');

router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT id, user_id, type, duration, task_id, task_name, class_id, class_name, timestamp_ms, completed_at_ms, created_at_ms
             FROM study_sessions WHERE user_id = ? ORDER BY completed_at_ms DESC LIMIT 50`,
            [req.params.userId]
        );
        res.json(rows.map(toStudySession));
    } catch (err) {
        console.error('[SESSIONS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil study sessions' });
    }
});

router.post('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const userId = req.params.userId;
        const id = req.body.id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const completedAt = numberOrNow(req.body.completedAt || req.body.timestamp);
        await query(
            `INSERT INTO study_sessions (id, user_id, type, duration, task_id, task_name, class_id, class_name, timestamp_ms, completed_at_ms, created_at_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                type = VALUES(type), duration = VALUES(duration), task_id = VALUES(task_id),
                task_name = VALUES(task_name), class_id = VALUES(class_id), class_name = VALUES(class_name),
                timestamp_ms = VALUES(timestamp_ms), completed_at_ms = VALUES(completed_at_ms)`,
            [
                id,
                userId,
                req.body.type || 'pomodoro',
                Number(req.body.duration || 25),
                req.body.taskId || null,
                req.body.taskName || null,
                req.body.classId || null,
                req.body.className || null,
                numberOrNow(req.body.timestamp || completedAt),
                completedAt,
                numberOrNow(req.body.createdAt || completedAt),
            ]
        );
        res.status(201).json({ ok: true, id });
    } catch (err) {
        console.error('[SESSIONS] POST error:', err);
        res.status(500).json({ error: 'Gagal menyimpan study session' });
    }
});

module.exports = router;
