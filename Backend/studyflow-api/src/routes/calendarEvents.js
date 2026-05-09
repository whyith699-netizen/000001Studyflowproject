const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow, toCalendarEvent } = require('./helpers');

router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT id, user_id, title, date, end_date, time, color_key, description, created_at_ms, updated_at_ms
             FROM calendar_events WHERE user_id = ? ORDER BY date ASC, time ASC`,
            [req.params.userId]
        );
        res.json(rows.map(toCalendarEvent));
    } catch (err) {
        console.error('[CALENDAR] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil calendar events' });
    }
});

router.post('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const userId = req.params.userId;
        const id = req.body.id || `cal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const now = Date.now();
        await query(
            `INSERT INTO calendar_events (id, user_id, title, date, end_date, time, color_key, description, created_at_ms, updated_at_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                title = VALUES(title), date = VALUES(date), end_date = VALUES(end_date), time = VALUES(time),
                color_key = VALUES(color_key), description = VALUES(description), updated_at_ms = VALUES(updated_at_ms)`,
            [
                id,
                userId,
                req.body.title || '',
                req.body.date || '',
                req.body.endDate || null,
                req.body.time || '',
                req.body.colorKey || 'sky',
                req.body.description || '',
                numberOrNow(req.body.createdAt || now),
                numberOrNow(req.body.updatedAt || now),
            ]
        );
        res.status(201).json({ ok: true, id });
    } catch (err) {
        console.error('[CALENDAR] POST error:', err);
        res.status(500).json({ error: 'Gagal menyimpan calendar event' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const existing = await query('SELECT user_id FROM calendar_events WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Calendar event tidak ditemukan' });
        if (existing[0].user_id !== req.user.uid) return res.status(403).json({ error: 'Akses ditolak' });

        await query(
            `UPDATE calendar_events SET
                title = COALESCE(?, title), date = COALESCE(?, date), end_date = ?,
                time = COALESCE(?, time), color_key = COALESCE(?, color_key),
                description = COALESCE(?, description), updated_at_ms = ?
             WHERE id = ?`,
            [
                req.body.title ?? null,
                req.body.date ?? null,
                req.body.endDate ?? null,
                req.body.time ?? null,
                req.body.colorKey ?? null,
                req.body.description ?? null,
                numberOrNow(req.body.updatedAt),
                req.params.id,
            ]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('[CALENDAR] PUT error:', err);
        res.status(500).json({ error: 'Gagal mengupdate calendar event' });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const existing = await query('SELECT user_id FROM calendar_events WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Calendar event tidak ditemukan' });
        if (existing[0].user_id !== req.user.uid) return res.status(403).json({ error: 'Akses ditolak' });
        await query('DELETE FROM calendar_events WHERE id = ?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[CALENDAR] DELETE error:', err);
        res.status(500).json({ error: 'Gagal menghapus calendar event' });
    }
});

module.exports = router;
