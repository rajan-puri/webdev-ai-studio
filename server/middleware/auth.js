const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');

const SESSION_TTL_SECONDS = 7 * 24 * 3600; // 7 days

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts.shift().trim();
      const val = decodeURIComponent(parts.join('='));
      list[key] = val;
    });
  }
  return list;
}

function createSession(userId) {
  const sessionId = 'sess_' + uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, userId, expiresAt);

  return { sessionId, expiresAt };
}

function destroySession(sessionId) {
  if (!sessionId) return;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

function destroyUserSessions(userId) {
  if (!userId) return;
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

function getSessionUser(req) {
  let sessionId = null;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.substring(7).trim();
  }

  // 2. Fallback to cookie
  if (!sessionId) {
    const cookies = parseCookies(req);
    sessionId = cookies['studio_session'];
  }

  if (!sessionId) {
    return null;
  }

  // Query database for valid active session
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.avatar_url, u.auth_provider, u.created_at, s.expires_at, s.id as session_id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
  `).get(sessionId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    authProvider: row.auth_provider,
    createdAt: row.created_at,
    sessionId: row.session_id
  };
}

function requireAuth(req, res) {
  const user = getSessionUser(req);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: false,
      error: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED'
    }));
    return null;
  }
  return user;
}

function setSessionCookie(res, sessionId) {
  const maxAge = SESSION_TTL_SECONDS;
  const cookieStr = `studio_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  res.setHeader('Set-Cookie', cookieStr);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'studio_session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
}

module.exports = {
  parseCookies,
  createSession,
  destroySession,
  destroyUserSessions,
  getSessionUser,
  requireAuth,
  setSessionCookie,
  clearSessionCookie
};
