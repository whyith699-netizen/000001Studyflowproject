const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow } = require('./helpers');

router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            'SELECT badge_id AS id, badge_name AS badgeName, unlocked_at_ms AS unlockedAt FROM achievements WHERE user_id = ? ORDER BY unlocked_at_ms DESC',
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('[ACHIEVEMENTS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil achievements' });
    }
});

router.post('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        await query(
            `INSERT INTO achievements (user_id, badge_id, badge_name, unlocked_at_ms)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE badge_name = VALUES(badge_name), unlocked_at_ms = VALUES(unlocked_at_ms)`,
            [req.params.userId, req.body.badgeId, req.body.badgeName || req.body.badgeId, numberOrNow(req.body.unlockedAt)]
        );
        res.status(201).json({ ok: true });
    } catch (err) {
        console.error('[ACHIEVEMENTS] POST error:', err);
        res.status(500).json({ error: 'Gagal menyimpan achievement' });
    }
});

module.exports = router;
