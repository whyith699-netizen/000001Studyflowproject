/**
 * auth.js — Middleware verifikasi Firebase ID Token
 *
 * Setiap request ke endpoint yang dilindungi harus menyertakan:
 *   Authorization: Bearer <firebase_id_token>
 *
 * Middleware ini memverifikasi token menggunakan Firebase Admin SDK,
 * lalu menyimpan payload di req.user.
 */
const { admin } = require('../config/firebase');

/**
 * Middleware utama — wajib token valid
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token autentikasi diperlukan' });
    }

    // Jika Firebase Admin tidak terinisialisasi (mis. saat development tanpa service account)
    if (!admin || !admin.apps || admin.apps.length === 0) {
        console.warn('[AUTH] Firebase Admin tidak terinisialisasi — skip verifikasi token (dev mode)');
        // Decode payload tanpa verifikasi untuk dev mode
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            req.user = { uid: payload.user_id || payload.sub, email: payload.email };
            return next();
        } catch {
            return res.status(401).json({ error: 'Token tidak valid' });
        }
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
            uid:   decoded.uid,
            email: decoded.email,
            name:  decoded.name,
        };
        next();
    } catch (err) {
        console.error('[AUTH] Verifikasi token gagal:', err.message);
        return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
    }
}

/**
 * Middleware tambahan — pastikan user hanya mengakses data miliknya sendiri.
 * Dipakai setelah requireAuth.
 * Membandingkan req.user.uid dengan :userId di params atau userId di body.
 */
function requireOwnership(req, res, next) {
    const targetUserId = req.params.userId || req.body.userId || req.body.user_id;
    if (targetUserId && req.user.uid !== targetUserId) {
        return res.status(403).json({ error: 'Akses ditolak: bukan data milik Anda' });
    }
    next();
}

module.exports = { requireAuth, requireOwnership };
