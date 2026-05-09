/**
 * routes/tasks.js — Endpoint manajemen task
 *
 * GET    /api/tasks/:userId     — ambil semua task milik user
 * POST   /api/tasks             — tambah task baru
 * PUT    /api/tasks/:id         — update task (termasuk toggle completed)
 * DELETE /api/tasks/:id         — hapus task
 */
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow, toTask } = require('./helpers');

// ── GET /api/tasks/:userId ───────────────────────────────────────────────────
router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT id, user_id, title, type, class_id, class_name, due_date_value, completed,
                    notes, priority, description, links_json, files_json, reminder, extra_json,
                    created_at_ms, updated_at_ms
             FROM tasks WHERE user_id = ? ORDER BY due_date_value ASC, created_at_ms DESC`,
            [req.params.userId]
        );

        res.json(rows.map(toTask));
    } catch (err) {
        console.error('[TASKS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil data task' });
    }
});

// ── POST /api/tasks ──────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const { id, userId, title, text, type, classId, className, dueDate, completed, notes, priority, description, links, files, reminder } = req.body;

        const taskTitle = title || text;
        if (!userId || !taskTitle) {
            return res.status(400).json({ error: 'userId dan title diperlukan' });
        }
        if (req.user.uid !== userId) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }

        const taskId = id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const now = Date.now();
        await query(
            `INSERT INTO tasks (
                id, user_id, title, type, class_id, class_name, due_date_value, completed,
                notes, priority, description, links_json, files_json, reminder, extra_json,
                created_at_ms, updated_at_ms
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                title      = VALUES(title),
                type       = VALUES(type),
                class_id   = VALUES(class_id),
                class_name = VALUES(class_name),
                due_date_value = VALUES(due_date_value),
                completed  = VALUES(completed),
                notes      = VALUES(notes),
                priority   = VALUES(priority),
                description = VALUES(description),
                links_json = VALUES(links_json),
                files_json = VALUES(files_json),
                reminder   = VALUES(reminder),
                extra_json = VALUES(extra_json),
                updated_at_ms = VALUES(updated_at_ms),
                updated_at = CURRENT_TIMESTAMP`,
            [
                taskId, userId, taskTitle,
                type      || 'other',
                classId   || null,
                className || null,
                dueDate   || null,
                completed ? 1 : 0,
                notes     || null,
                priority  || null,
                description || null,
                links     ? JSON.stringify(links) : null,
                files     ? JSON.stringify(files) : null,
                reminder  || null,
                JSON.stringify(req.body),
                numberOrNow(req.body.createdAt || now),
                numberOrNow(req.body.updatedAt || now),
            ]
        );

        res.status(201).json({ ok: true, id: taskId });
    } catch (err) {
        console.error('[TASKS] POST error:', err);
        res.status(500).json({ error: 'Gagal menambah task' });
    }
});

// ── PUT /api/tasks/:id ───────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const existing = await query('SELECT user_id FROM tasks WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Task tidak ditemukan' });
        if (existing[0].user_id !== req.user.uid) return res.status(403).json({ error: 'Akses ditolak' });

        const { title, text, type, classId, className, dueDate, completed, notes, priority, description, links, files, reminder } = req.body;

        await query(
            `UPDATE tasks SET
                title      = COALESCE(?, title),
                type       = COALESCE(?, type),
                class_id   = COALESCE(?, class_id),
                class_name = COALESCE(?, class_name),
                due_date_value = COALESCE(?, due_date_value),
                completed  = COALESCE(?, completed),
                notes      = COALESCE(?, notes),
                priority   = COALESCE(?, priority),
                description = COALESCE(?, description),
                links_json = COALESCE(?, links_json),
                files_json = COALESCE(?, files_json),
                reminder   = COALESCE(?, reminder),
                extra_json = ?,
                updated_at_ms = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                (title || text) || null,
                type      || null,
                classId   !== undefined ? (classId || null) : null,
                className || null,
                dueDate   !== undefined ? (dueDate || null) : null,
                completed !== undefined ? (completed ? 1 : 0) : null,
                notes     !== undefined ? (notes || null) : null,
                priority  || null,
                description !== undefined ? (description || '') : null,
                links     ? JSON.stringify(links) : null,
                files     ? JSON.stringify(files) : null,
                reminder  || null,
                JSON.stringify(req.body),
                numberOrNow(req.body.updatedAt),
                req.params.id,
            ]
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('[TASKS] PUT error:', err);
        res.status(500).json({ error: 'Gagal mengupdate task' });
    }
});

// ── DELETE /api/tasks/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const existing = await query('SELECT user_id FROM tasks WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Task tidak ditemukan' });
        if (existing[0].user_id !== req.user.uid) return res.status(403).json({ error: 'Akses ditolak' });

        await query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('[TASKS] DELETE error:', err);
        res.status(500).json({ error: 'Gagal menghapus task' });
    }
});

module.exports = router;
