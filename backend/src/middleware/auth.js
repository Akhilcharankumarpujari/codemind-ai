import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'codemind-dev-secret-change-in-prod';

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const c of cookies) {
    if (c.startsWith(name + '=')) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return null;
}

export function requireAuth(req, res, next) {
  const token = getCookie(req, 'cm_token');

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

export function optionalAuth(req, _res, next) {
  const token = getCookie(req, 'cm_token');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch { }
  }
  next();
}
