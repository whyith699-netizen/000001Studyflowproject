const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { parseJSON } = require('./helpers');

router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query('SELECT days_json FROM uniforms WHERE user_id = ?', [req.params.userId]);
        res.json(rows.length ? parseJSON(rows[0].days_json, {}) : {});
    } catch (err) {
        console.error('[UNIFORMS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil uniforms' });
    }
});

router.put('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const days = req.body.days || req.body || {};
        await query(
            `INSERT INTO uniforms (user_id, days_json)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE days_json = VALUES(days_json), updated_at = CURRENT_TIMESTAMP`,
            [req.params.userId, JSON.stringify(days)]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('[UNIFORMS] PUT error:', err);
        res.status(500).json({ error: 'Gagal menyimpan uniforms' });
    }
});

module.exports = router;
