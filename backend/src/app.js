




import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { chatRouter } from './routes/chat.js';
import { uploadRouter } from './routes/upload.js';
import { executeRouter } from './routes/execute.js';
import { authRouter } from './routes/auth.js';
import { flowRouter } from './routes/flow.js';
import { complexityRouter } from './routes/complexity.js';
import { analyzeRouter } from './routes/analyze.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const app = express();




app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);


app.use(express.static(path.join(PROJECT_ROOT, 'frontend')));


// Root route — serve the landing page HTML
app.get('/', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'frontend', 'pages', 'index.html'));
});

// Chatbot page
app.get('/chat', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'frontend', 'pages', 'chatbot.html'));
});


app.get('/login', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'frontend', 'pages', 'login.html'));
});


app.get('/visualizer', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'frontend', 'pages', 'visualizer.html'));
});


const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);


app.use(express.json({ limit: '1mb' }));


const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', limiter);


app.use('/api', authRouter);
app.use('/api', chatRouter);
app.use('/api', uploadRouter);
app.use('/api', executeRouter);
app.use('/api', flowRouter);
app.use('/api', complexityRouter);
app.use('/api', analyzeRouter);


app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));


app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));


app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
