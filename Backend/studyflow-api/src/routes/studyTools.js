/**
 * routes/studyTools.js — Endpoint manajemen Study Tools
 *
 * GET  /api/study-tools/:userId  — ambil semua study tools milik user
 * PUT  /api/study-tools/:userId  — replace seluruh daftar study tools (upsert bulk)
 * POST /api/study-tools/:userId  — tambah satu study tool
 * DELETE /api/study-tools/:userId/:toolId — hapus satu study tool
 */
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow, toStudyTool } = require('./helpers');

// ── GET /api/study-tools/:userId ─────────────────────────────────────────────
router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT id, user_id, name, description, url, launch_url, embed_url, can_embed,
                    category, icon, is_default, created_at_ms, updated_at_ms
             FROM study_tools WHERE user_id = ? ORDER BY created_at ASC`,
            [req.params.userId]
        );

        res.json(rows.map(toStudyTool));
    } catch (err) {
        console.error('[STUDY-TOOLS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil study tools' });
    }
});

// ── PUT /api/study-tools/:userId ─────────────────────────────────────────────
// Replace seluruh daftar tools milik user (sesuai perilaku saveStudyTools di Firebase)
router.put('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const { items } = req.body; // Array of tool objects
        const userId = req.params.userId;

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'items harus berupa array' });
        }

        // Hapus semua custom tools (non-default) lama, lalu insert baru
        await query('DELETE FROM study_tools WHERE user_id = ? AND is_default = FALSE', [userId]);

        for (const tool of items) {
            if (!tool.id || !tool.name || !tool.url) continue;
            const now = Date.now();
            await query(
                `INSERT INTO study_tools (
                    id, user_id, name, description, url, launch_url, embed_url,
                    can_embed, category, icon, is_default, created_at_ms, updated_at_ms
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    name       = VALUES(name),
                    description = VALUES(description),
                    url        = VALUES(url),
                    launch_url = VALUES(launch_url),
                    embed_url  = VALUES(embed_url),
                    can_embed  = VALUES(can_embed),
                    category   = VALUES(category),
                    icon       = VALUES(icon),
                    is_default = VALUES(is_default),
                    updated_at_ms = VALUES(updated_at_ms),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    tool.id, userId, tool.name,
                    tool.description || '',
                    tool.url || tool.launchUrl,
                    tool.launchUrl || tool.url,
                    tool.embedUrl || '',
                    tool.canEmbed ? 1 : 0,
                    tool.category || (tool.canEmbed ? 'embedded' : 'external'),
                    tool.icon || null,
                    tool.isDefault ? 1 : 0,
                    numberOrNow(tool.createdAt || now),
                    numberOrNow(tool.updatedAt || now),
                ]
            );
        }

        res.json({ ok: true, count: items.length });
    } catch (err) {
        console.error('[STUDY-TOOLS] PUT error:', err);
        res.status(500).json({ error: 'Gagal menyimpan study tools' });
    }
});

// ── POST /api/study-tools/:userId ────────────────────────────────────────────
router.post('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const userId = req.params.userId;
        const { id, name, url, launchUrl, embedUrl, canEmbed, category, description, icon, isDefault } = req.body;

        if (!name || !(url || launchUrl)) {
            return res.status(400).json({ error: 'name dan url diperlukan' });
        }

        const toolId = id || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const now = Date.now();
        await query(
            `INSERT INTO study_tools (
                id, user_id, name, description, url, launch_url, embed_url,
                can_embed, category, icon, is_default, created_at_ms, updated_at_ms
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name), description = VALUES(description), url = VALUES(url),
                launch_url = VALUES(launch_url), embed_url = VALUES(embed_url),
                can_embed = VALUES(can_embed), category = VALUES(category), icon = VALUES(icon),
                is_default = VALUES(is_default), updated_at_ms = VALUES(updated_at_ms)`,
            [
                toolId, userId, name, description || '',
                url || launchUrl, launchUrl || url, embedUrl || '',
                canEmbed ? 1 : 0, category || (canEmbed ? 'embedded' : 'external'),
                icon || null, isDefault ? 1 : 0,
                numberOrNow(req.body.createdAt || now),
                numberOrNow(req.body.updatedAt || now),
            ]
        );

        res.status(201).json({ ok: true, id: toolId });
    } catch (err) {
        console.error('[STUDY-TOOLS] POST error:', err);
        res.status(500).json({ error: 'Gagal menambah study tool' });
    }
});

// ── DELETE /api/study-tools/:userId/:toolId ───────────────────────────────────
router.delete('/:userId/:toolId', requireAuth, requireOwnership, async (req, res) => {
    try {
        await query(
            'DELETE FROM study_tools WHERE id = ? AND user_id = ?',
            [req.params.toolId, req.params.userId]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('[STUDY-TOOLS] DELETE error:', err);
        res.status(500).json({ error: 'Gagal menghapus study tool' });
    }
});

module.exports = router;
