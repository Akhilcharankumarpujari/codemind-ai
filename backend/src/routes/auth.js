/**
 * CodeMind AI — Auth Routes
 *
 * POST /api/auth/register  — Create account
 * POST /api/auth/login     — Login, get JWT
 * GET  /api/auth/me        — Verify token, get user info
 *
 * NOTE: In production, replace the in-memory store with a real DB
 *       (MongoDB, PostgreSQL, Supabase, etc.)
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// ── In-memory user store (replace with DB in production) ──────────────────────
// Structure: Map<email, { id, email, name, passwordHash, createdAt }>
const users = new Map();

const JWT_EXPIRES = '7d';

// ── POST /api/auth/register ────────────────────────────────────────────────────
authRouter.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (users.has(email.toLowerCase())) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.set(user.email, user);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    console.log(`[Auth] New user registered: ${user.email}`);
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });

  } catch (err) {
    next(err);
  }
});


// ── POST /api/auth/login ───────────────────────────────────────────────────────
authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = users.get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    console.log(`[Auth] Login: ${user.email}`);
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });

  } catch (err) {
    next(err);
  }
});


// ── GET /api/auth/me ───────────────────────────────────────────────────────────
authRouter.get('/auth/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
