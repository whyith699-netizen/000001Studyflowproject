const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow } = require('./helpers');

router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT id, user_id AS userId, from_uid AS fromUid, from_name AS fromName, content,
                    timestamp_ms AS timestamp, is_read AS isRead
             FROM inbox WHERE user_id = ? ORDER BY timestamp_ms DESC`,
            [req.params.userId]
        );
        res.json(rows.map(row => ({ ...row, isRead: !!row.isRead })));
    } catch (err) {
        console.error('[INBOX] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil inbox' });
    }
});

router.post('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const id = req.body.id || `msg_${Date.now()}`;
        await query(
            `INSERT INTO inbox (id, user_id, from_uid, from_name, content, timestamp_ms, is_read)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE content = VALUES(content), is_read = VALUES(is_read)`,
            [
                id,
                req.params.userId,
                req.user.uid,
                req.body.fromName || req.user.name || 'Someone',
                req.body.content || '',
                numberOrNow(req.body.timestamp),
                req.body.isRead ? 1 : 0,
            ]
        );
        res.status(201).json({ ok: true, id });
    } catch (err) {
        console.error('[INBOX] POST error:', err);
        res.status(500).json({ error: 'Gagal mengirim pesan' });
    }
});

module.exports = router;
