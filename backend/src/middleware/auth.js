/**
 * CodeMind AI — JWT Authentication Middleware
 */
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'codemind-dev-secret-change-in-prod';

/**
 * Middleware: verifies Bearer token, attaches req.user
 */
export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

/**
 * Optional auth: attaches req.user if token present, but doesn't block
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch { /* expired/invalid — ignore */ }
  }
  next();
}
