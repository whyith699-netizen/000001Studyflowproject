const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow } = require('./helpers');

router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT f.friend_uid AS id, COALESCE(u.display_name, f.display_name) AS displayName,
                    COALESCE(u.email, f.email) AS email, COALESCE(u.photo_url, f.photo_url) AS photoURL,
                    COALESCE(u.streak, f.streak) AS streak, f.added_at_ms AS addedAt
             FROM friends f
             LEFT JOIN users u ON u.uid = f.friend_uid
             WHERE f.user_id = ?
             ORDER BY f.added_at_ms DESC`,
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('[FRIENDS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil friends' });
    }
});

router.post('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const found = await query('SELECT uid, email, display_name, photo_url, streak FROM users WHERE email = ? LIMIT 1', [email]);
        if (found.length === 0) return res.status(404).json({ error: 'User not found' });
        const friend = found[0];
        await query(
            `INSERT INTO friends (user_id, friend_uid, display_name, email, photo_url, streak, added_at_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), email = VALUES(email),
                photo_url = VALUES(photo_url), streak = VALUES(streak)`,
            [req.params.userId, friend.uid, friend.display_name || 'Unknown', friend.email, friend.photo_url || null, friend.streak || 0, numberOrNow(req.body.addedAt)]
        );
        res.status(201).json({
            uid: friend.uid,
            email: friend.email,
            displayName: friend.display_name || 'Unknown',
            photoURL: friend.photo_url || null,
            streak: friend.streak || 0,
        });
    } catch (err) {
        console.error('[FRIENDS] POST error:', err);
        res.status(500).json({ error: 'Gagal menambah friend' });
    }
});

module.exports = router;
