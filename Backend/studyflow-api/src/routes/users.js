/**
 * routes/users.js — Endpoint manajemen profil user
 *
 * POST   /api/users          — buat atau update profil user (upsert)
 * GET    /api/users/:userId  — ambil profil user
 */
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const { numberOrNow, toUser } = require('./helpers');

// ── POST /api/users ──────────────────────────────────────────────────────────
// Upsert profil user. Dipanggil setiap kali user login.
router.post('/', requireAuth, async (req, res) => {
    try {
        const { uid, email, displayName, photoURL, lastLogin } = req.body;

        // Pastikan uid cocok dengan token yang dikirim
        if (uid && req.user.uid !== uid) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }

        const userId       = uid || req.user.uid;
        const userEmail    = email || req.user.email || '';
        const userLogin    = lastLogin || new Date().toISOString();

        const now = Date.now();
        await query(
            `INSERT INTO users (
                uid, email, display_name, photo_url, last_login, streak,
                last_login_streak_date, last_streak_claim_date, last_sync_ms,
                extra_json, created_at_ms, updated_at_ms
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                email        = VALUES(email),
                display_name = COALESCE(VALUES(display_name), display_name),
                photo_url    = COALESCE(VALUES(photo_url), photo_url),
                last_login   = COALESCE(VALUES(last_login), last_login),
                streak       = COALESCE(VALUES(streak), streak),
                last_login_streak_date = COALESCE(VALUES(last_login_streak_date), last_login_streak_date),
                last_streak_claim_date = COALESCE(VALUES(last_streak_claim_date), last_streak_claim_date),
                last_sync_ms = VALUES(last_sync_ms),
                extra_json   = VALUES(extra_json),
                updated_at_ms = VALUES(updated_at_ms),
                updated_at   = CURRENT_TIMESTAMP`,
            [
                userId,
                userEmail,
                displayName || null,
                photoURL || null,
                userLogin,
                req.body.streak !== undefined ? Number(req.body.streak) : null,
                req.body.lastLoginStreakDate || null,
                req.body.lastStreakClaimDate || null,
                numberOrNow(req.body.lastSync || now),
                JSON.stringify(req.body),
                numberOrNow(req.body.createdAt || now),
                numberOrNow(req.body.updatedAt || now),
            ]
        );

        res.status(200).json({ ok: true, uid: userId });
    } catch (err) {
        console.error('[USERS] POST error:', err);
        res.status(500).json({ error: 'Gagal menyimpan profil user' });
    }
});

// ── GET /api/users/:userId ───────────────────────────────────────────────────
router.get('/:userId', requireAuth, requireOwnership, async (req, res) => {
    try {
        const rows = await query(
            `SELECT uid, email, display_name, photo_url, last_login, streak,
                    last_login_streak_date, last_streak_claim_date, last_sync_ms,
                    extra_json, created_at_ms, updated_at_ms
             FROM users WHERE uid = ?`,
            [req.params.userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json(toUser(rows[0]));
    } catch (err) {
        console.error('[USERS] GET error:', err);
        res.status(500).json({ error: 'Gagal mengambil profil user' });
    }
});

module.exports = router;
