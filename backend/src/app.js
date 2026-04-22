/**
 * CodeMind AI — Express App Configuration
 * Applies middleware and mounts route modules.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { chatRouter } from './routes/chat.js';
import { uploadRouter } from './routes/upload.js';
import { executeRouter } from './routes/execute.js';
import { authRouter } from './routes/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Root of the project (one level above /backend/src)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const app = express();

// ── Security middleware ──────────────────────────────────────────────────────
// helmet sets secure HTTP headers (CSP relaxed so the frontend's inline
// scripts and CDN resources load without being blocked)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// ── Static files — serve the HTML frontend ───────────────────────────────────
app.use(express.static(PROJECT_ROOT));

// Root route — send the chatbot HTML page
app.get('/', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'Aicodingchatbot .HTML'));
});

// Login page
app.get('/login', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'login.html'));
});

// CORS: only allow the frontend origin (set FRONTEND_URL in .env for prod)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (e.g. curl / Postman) in dev
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Rate limiting — 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', limiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', authRouter);
app.use('/api', chatRouter);
app.use('/api', uploadRouter);
app.use('/api', executeRouter);

// Health check (Render / Railway keep-alive)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
