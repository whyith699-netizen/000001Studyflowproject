const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const uid = uuidv4();

        await query(
            `INSERT INTO users (uid, email, password_hash, display_name, created_at_ms, updated_at_ms)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uid, email, hashedPassword, displayName || email.split('@')[0], Date.now(), Date.now()]
        );

        const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { uid, email, displayName } });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already registered' });
        }
        console.error('[AUTH] Register error:', err);
        res.status(500).json({ error: 'Failed to register' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { 
                uid: user.uid, 
                email: user.email, 
                displayName: user.display_name,
                photoURL: user.photo_url
            } 
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

module.exports = router;
