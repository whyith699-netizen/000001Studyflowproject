/**
 * routes/classes.js — Endpoint manajemen kelas
 *
 * GET    /api/classes/:userId       — ambil semua kelas milik user
 * POST   /api/classes               — tambah kelas baru
 * PUT    /api/classes/:id           — update kelas
 * DELETE /api/classes/:id           — hapus kelas
 */
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow, toClass } = require('./helpers');

// ── GET /api/classes/:userId ─────────────────────────────────────────────────
router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT id, user_id, name, color, days, schedules_json, time, room, instructor, icon,
                    links_json, order_index, extra_json, created_at_ms, updated_at_ms
             FROM classes WHERE user_id = ? ORDER BY order_index ASC, created_at_ms ASC`,
            [req.params.userId]
        );

        res.json(rows.map(toClass));
    } catch (err) {
        console.error('[CLASSES] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil data kelas' });
    }
});

// ── POST /api/classes ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const { id, userId, name, color, days, schedules, time, room, instructor, order, icon, links } = req.body;

        if (!userId || !name) {
            return res.status(400).json({ error: 'userId dan name diperlukan' });
        }
        if (req.user.uid !== userId) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }

        const classId = id || `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const now = Date.now();
        await query(
            `INSERT INTO classes (
                id, user_id, name, color, days, schedules_json, time, room, instructor,
                icon, links_json, order_index, extra_json, created_at_ms, updated_at_ms
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                name       = VALUES(name),
                color      = VALUES(color),
                days       = VALUES(days),
                schedules_json = VALUES(schedules_json),
                time       = VALUES(time),
                room       = VALUES(room),
                instructor = VALUES(instructor),
                icon       = VALUES(icon),
                links_json = VALUES(links_json),
                order_index = VALUES(order_index),
                extra_json = VALUES(extra_json),
                updated_at_ms = VALUES(updated_at_ms),
                updated_at = CURRENT_TIMESTAMP`,
            [
                classId, userId, name,
                color      || null,
                days       ? JSON.stringify(days) : null,
                schedules  ? JSON.stringify(schedules) : null,
                time       || null,
                room       || null,
                instructor || null,
                icon       || null,
                links      ? JSON.stringify(links) : null,
                order      || 0,
                JSON.stringify(req.body),
                numberOrNow(req.body.createdAt || now),
                numberOrNow(req.body.updatedAt || now),
            ]
        );

        res.status(201).json({ ok: true, id: classId });
    } catch (err) {
        console.error('[CLASSES] POST error:', err);
        res.status(500).json({ error: 'Gagal menambah kelas' });
    }
});

// ── PUT /api/classes/:id ─────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
    try {
        // Verifikasi kepemilikan
        const existing = await query('SELECT user_id FROM classes WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
        if (existing[0].user_id !== req.user.uid) return res.status(403).json({ error: 'Akses ditolak' });

        const { name, color, days, schedules, time, room, instructor, order, icon, links } = req.body;

        await query(
            `UPDATE classes SET
                name       = COALESCE(?, name),
                color      = COALESCE(?, color),
                days       = COALESCE(?, days),
                schedules_json = COALESCE(?, schedules_json),
                time       = COALESCE(?, time),
                room       = COALESCE(?, room),
                instructor = COALESCE(?, instructor),
                icon       = COALESCE(?, icon),
                links_json = COALESCE(?, links_json),
                order_index = COALESCE(?, order_index),
                extra_json = ?,
                updated_at_ms = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                name       || null,
                color      || null,
                days       ? JSON.stringify(days) : null,
                schedules  ? JSON.stringify(schedules) : null,
                time       || null,
                room       || null,
                instructor || null,
                icon       || null,
                links      ? JSON.stringify(links) : null,
                order      !== undefined ? order : null,
                JSON.stringify(req.body),
                numberOrNow(req.body.updatedAt),
                req.params.id,
            ]
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('[CLASSES] PUT error:', err);
        res.status(500).json({ error: 'Gagal mengupdate kelas' });
    }
});

// ── DELETE /api/classes/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const existing = await query('SELECT user_id FROM classes WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
        if (existing[0].user_id !== req.user.uid) return res.status(403).json({ error: 'Akses ditolak' });

        await query('DELETE FROM classes WHERE id = ?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[CLASSES] DELETE error:', err);
        res.status(500).json({ error: 'Gagal menghapus kelas' });
    }
});

module.exports = router;
