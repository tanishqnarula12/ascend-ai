import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '922206656573-bfphrib1urduo6ekm1eferrofi0a869v.apps.googleusercontent.com');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, xp, level, photo_url',
            [username, email, hashedPassword]
        );

        res.status(201).json({
            id: newUser.rows[0].id,
            username: newUser.rows[0].username,
            email: newUser.rows[0].email,
            xp: 0,
            level: 1,
            photoUrl: newUser.rows[0].photo_url,
            token: generateToken(newUser.rows[0].id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);

        if (isMatch) {
            res.json({
                id: user.rows[0].id,
                username: user.rows[0].username,
                email: user.rows[0].email,
                xp: user.rows[0].xp || 0,
                level: user.rows[0].level || 1,
                photoUrl: user.rows[0].photo_url,
                token: generateToken(user.rows[0].id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const googleLogin = async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID || '922206656573-bfphrib1urduo6ekm1eferrofi0a869v.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;
        
        let user = await query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (user.rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const dummyPassword = await bcrypt.hash(email + process.env.JWT_SECRET, salt);
            
            const newUser = await query(
                'INSERT INTO users (username, email, password_hash, photo_url) VALUES ($1, $2, $3, $4) RETURNING id, username, email, xp, level, photo_url',
                [name, email, dummyPassword, picture]
            );
            user = { rows: [newUser.rows[0]] };
        } else if (!user.rows[0].photo_url && picture) {
            const updatedUser = await query(
                'UPDATE users SET photo_url = $1 WHERE id = $2 RETURNING id, username, email, xp, level, photo_url',
                [picture, user.rows[0].id]
            );
            user = { rows: [updatedUser.rows[0]] };
        }
        
        res.json({
            id: user.rows[0].id,
            username: user.rows[0].username,
            email: user.rows[0].email,
            xp: user.rows[0].xp || 0,
            level: user.rows[0].level || 1,
            photoUrl: user.rows[0].photo_url,
            token: generateToken(user.rows[0].id),
        });
    } catch (error) {
        console.error("Google Auth error:", error);
        res.status(500).json({ message: 'Google authentication failed', error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await query('SELECT id, username, email, xp, level, photo_url FROM users WHERE id = $1', [req.user.id]);
        res.json({
            ...user.rows[0],
            photoUrl: user.rows[0].photo_url
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req, res) => {
    const { username, email, photoUrl } = req.body;
    try {
        const updatedUser = await query(
            'UPDATE users SET username = $1, email = $2, photo_url = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, username, email, xp, level, photo_url',
            [username, email, photoUrl, req.user.id]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: updatedUser.rows[0].id,
            username: updatedUser.rows[0].username,
            email: updatedUser.rows[0].email,
            xp: updatedUser.rows[0].xp || 0,
            level: updatedUser.rows[0].level || 1,
            photoUrl: updatedUser.rows[0].photo_url
        });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Username or email already in use' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};
