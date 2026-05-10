const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'studyflow_secret_key_123';

/**
 * Middleware utama — wajib token valid
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token autentikasi diperlukan' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            uid:   decoded.uid,
            email: decoded.email
        };
        next();
    } catch (err) {
        console.error('[AUTH] Verifikasi token gagal:', err.message);
        return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
    }
}

/**
 * Middleware tambahan — pastikan user hanya mengakses data miliknya sendiri.
 */
function requireOwnership(req, res, next) {
    const targetUserId = req.params.userId || req.body.userId || req.body.user_id;
    if (targetUserId && req.user.uid !== targetUserId) {
        return res.status(403).json({ error: 'Akses ditolak: bukan data milik Anda' });
    }
    next();
}

module.exports = { requireAuth, requireOwnership, JWT_SECRET };
