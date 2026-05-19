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

// Google Login
router.post('/google', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Access token is required' });
        }

        // Fetch user profile from Google
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!googleResponse.ok) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const profile = await googleResponse.json();
        const { email, name, picture } = profile;

        if (!email) {
            return res.status(400).json({ error: 'Google account has no email' });
        }

        // Check if user exists by email
        let rows = await query('SELECT * FROM users WHERE email = ?', [email]);
        let user;

        if (rows.length === 0) {
            // Create user
            const uid = uuidv4();
            await query(
                `INSERT INTO users (uid, email, display_name, photo_url, created_at_ms, updated_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [uid, email, name || email.split('@')[0], picture || null, Date.now(), Date.now()]
            );
            user = { uid, email, displayName: name, photoURL: picture };
        } else {
            user = {
                uid: rows[0].uid,
                email: rows[0].email,
                displayName: rows[0].display_name,
                photoURL: rows[0].photo_url
            };
            
            // If they login with google, optionally update their photo/name if we want, but let's keep it simple.
        }

        const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });

    } catch (err) {
        console.error('[AUTH] Google login error:', err);
        res.status(500).json({ error: 'Failed to login with Google' });
    }
});

module.exports = router;
