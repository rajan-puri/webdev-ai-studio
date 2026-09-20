const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const {
  createSession,
  destroySession,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie
} = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');

async function handleAuthRequest(req, res, pathname) {
  try {
    // 1. GET /api/auth/me
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user) {
        return sendJson(res, 200, { success: true, authenticated: false, user: null });
      }
      return sendJson(res, 200, { success: true, authenticated: true, user });
    }

    // 2. POST /api/auth/register
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { email, password, name } = body;

      if (!email || !email.trim() || !password || !name || !name.trim()) {
        return sendError(res, 400, 'Name, email, and password are required.', 'VALIDATION_ERROR');
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return sendError(res, 400, 'Invalid email address format.', 'INVALID_EMAIL');
      }

      if (password.length < 6) {
        return sendError(res, 400, 'Password must be at least 6 characters long.', 'WEAK_PASSWORD');
      }

      // Check if email is already taken
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (existing) {
        return sendError(res, 409, 'An account with this email address already exists.', 'EMAIL_EXISTS');
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      const userId = 'usr_' + uuidv4().replace(/-/g, '').substring(0, 16);
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, avatar_url, auth_provider)
        VALUES (?, ?, ?, ?, ?, 'local')
      `).run(userId, cleanEmail, passwordHash, name.trim(), avatarUrl);

      const user = {
        id: userId,
        email: cleanEmail,
        name: name.trim(),
        avatarUrl,
        authProvider: 'local'
      };

      const { sessionId } = createSession(userId);
      setSessionCookie(res, sessionId);

      return sendJson(res, 201, {
        success: true,
        message: 'Registration successful.',
        user,
        sessionId
      });
    }

    // 3. POST /api/auth/login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required.', 'VALIDATION_ERROR');
      }

      const cleanEmail = email.trim().toLowerCase();
      const userRecord = db.prepare(`
        SELECT id, email, password_hash, name, avatar_url, auth_provider
        FROM users
        WHERE email = ?
      `).get(cleanEmail);

      if (!userRecord || !userRecord.password_hash) {
        return sendError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
      }

      const isMatch = bcrypt.compareSync(password, userRecord.password_hash);
      if (!isMatch) {
        return sendError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
      }

      const user = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        avatarUrl: userRecord.avatar_url,
        authProvider: userRecord.auth_provider
      };

      const { sessionId } = createSession(userRecord.id);
      setSessionCookie(res, sessionId);

      return sendJson(res, 200, {
        success: true,
        message: 'Login successful.',
        user,
        sessionId
      });
    }

    // 4. POST /api/auth/google
    if (pathname === '/api/auth/google' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { email, name, googleId, avatarUrl } = body;

      if (!email) {
        return sendError(res, 400, 'Google email is required.', 'VALIDATION_ERROR');
      }

      const cleanEmail = email.trim().toLowerCase();
      let userRecord = db.prepare('SELECT id, email, name, avatar_url, auth_provider FROM users WHERE email = ?').get(cleanEmail);

      if (!userRecord) {
        const userId = 'usr_' + uuidv4().replace(/-/g, '').substring(0, 16);
        const resolvedName = (name && name.trim()) || cleanEmail.split('@')[0];
        const resolvedAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

        db.prepare(`
          INSERT INTO users (id, email, password_hash, name, avatar_url, auth_provider, google_id)
          VALUES (?, ?, NULL, ?, ?, 'google', ?)
        `).run(userId, cleanEmail, resolvedName, resolvedAvatar, googleId || ('g_' + Date.now()));

        userRecord = {
          id: userId,
          email: cleanEmail,
          name: resolvedName,
          avatarUrl: resolvedAvatar,
          authProvider: 'google'
        };
      } else {
        if (googleId) {
          db.prepare("UPDATE users SET google_id = ?, auth_provider = 'google' WHERE id = ?").run(googleId, userRecord.id);
        }
      }

      const { sessionId } = createSession(userRecord.id);
      setSessionCookie(res, sessionId);

      return sendJson(res, 200, {
        success: true,
        message: 'Google authentication successful.',
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          avatarUrl: userRecord.avatar_url || userRecord.avatarUrl,
          authProvider: 'google'
        },
        sessionId
      });
    }

    // 5. POST /api/auth/logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (user && user.sessionId) {
        destroySession(user.sessionId);
      }
      clearSessionCookie(res);
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    // 6. POST /api/auth/demo-login (quick switch to demo user for testing)
    if (pathname === '/api/auth/demo-login' && req.method === 'POST') {
      const demo = db.prepare('SELECT id, email, name, avatar_url, auth_provider, created_at FROM users WHERE id = ?').get('user_demo');
      if (!demo) {
        return sendError(res, 404, 'Demo user not found.');
      }
      const { sessionId } = createSession(demo.id);
      setSessionCookie(res, sessionId);
      return sendJson(res, 200, {
        success: true,
        message: 'Switched to Demo Developer.',
        user: demo,
        sessionId
      });
    }

    // 7. PUT /api/auth/profile (Update account name & email)
    if (pathname === '/api/auth/profile' && req.method === 'PUT') {
      const user = getSessionUser(req);
      if (!user) {
        return sendError(res, 401, 'Authentication required to update profile.', 'UNAUTHORIZED');
      }

      const body = await readJsonBody(req);
      const { name, email } = body;

      if (!name || !name.trim()) {
        return sendError(res, 400, 'Display name cannot be empty.', 'VALIDATION_ERROR');
      }

      const cleanName = name.trim();
      const cleanEmail = email ? email.trim().toLowerCase() : user.email;

      if (cleanEmail !== user.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return sendError(res, 400, 'Invalid email address format.', 'INVALID_EMAIL');
        }
        const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(cleanEmail, user.id);
        if (existing) {
          return sendError(res, 409, 'An account with this email address already exists.', 'EMAIL_EXISTS');
        }
      }

      db.prepare(`
        UPDATE users
        SET name = ?, email = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanName, cleanEmail, user.id);

      const updated = db.prepare('SELECT id, email, name, avatar_url, auth_provider, created_at FROM users WHERE id = ?').get(user.id);
      return sendJson(res, 200, {
        success: true,
        message: 'Profile updated successfully.',
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          avatarUrl: updated.avatar_url,
          authProvider: updated.auth_provider,
          createdAt: updated.created_at,
          sessionId: user.sessionId
        }
      });
    }

    // 8. POST /api/auth/change-password
    if (pathname === '/api/auth/change-password' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) {
        return sendError(res, 401, 'Authentication required.', 'UNAUTHORIZED');
      }

      const body = await readJsonBody(req);
      const { currentPassword, newPassword } = body;

      if (!newPassword || newPassword.length < 6) {
        return sendError(res, 400, 'New password must be at least 6 characters.', 'WEAK_PASSWORD');
      }

      const userRecord = db.prepare('SELECT id, password_hash, auth_provider FROM users WHERE id = ?').get(user.id);
      if (userRecord.password_hash) {
        if (!currentPassword) {
          return sendError(res, 400, 'Current password is required.', 'MISSING_PASSWORD');
        }
        const isMatch = bcrypt.compareSync(currentPassword, userRecord.password_hash);
        if (!isMatch) {
          return sendError(res, 401, 'Incorrect current password.', 'INVALID_CREDENTIALS');
        }
      }

      const salt = bcrypt.genSaltSync(10);
      const newHash = bcrypt.hashSync(newPassword, salt);

      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, user.id);
      return sendJson(res, 200, { success: true, message: 'Password updated successfully.' });
    }

    // 9. GET /api/auth/sessions (List active sessions)
    if (pathname === '/api/auth/sessions' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user) {
        return sendError(res, 401, 'Authentication required.', 'UNAUTHORIZED');
      }

      const sessions = db.prepare(`
        SELECT id, created_at, expires_at
        FROM sessions
        WHERE user_id = ? AND datetime(expires_at) > datetime('now')
        ORDER BY created_at DESC
      `).all(user.id);

      const items = sessions.map(s => ({
        id: s.id,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        isCurrent: s.id === user.sessionId,
        device: 'WebDev Studio Desktop (Local)'
      }));

      return sendJson(res, 200, { success: true, sessions: items });
    }

    // 10. POST /api/auth/logout-all (Revoke other sessions)
    if (pathname === '/api/auth/logout-all' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) {
        return sendError(res, 401, 'Authentication required.', 'UNAUTHORIZED');
      }

      db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(user.id, user.sessionId);
      return sendJson(res, 200, { success: true, message: 'All other sessions have been revoked.' });
    }

    // 11. POST /api/auth/reset-workspace (Danger zone: wipe test artifacts)
    if (pathname === '/api/auth/reset-workspace' && req.method === 'POST') {
      const user = getSessionUser(req);
      if (!user) {
        return sendError(res, 401, 'Authentication required.', 'UNAUTHORIZED');
      }

      const th = db.prepare('DELETE FROM test_history WHERE user_id = ?').run(user.id);
      const rep = db.prepare('DELETE FROM reports WHERE user_id = ?').run(user.id);
      const ss = db.prepare('DELETE FROM screenshots WHERE user_id = ?').run(user.id);
      const vb = db.prepare('DELETE FROM visual_baselines WHERE user_id = ?').run(user.id);

      return sendJson(res, 200, {
        success: true,
        message: 'Workspace test runs, reports, screenshots, and visual baselines cleared.',
        counts: {
          testHistory: th.changes,
          reports: rep.changes,
          screenshots: ss.changes,
          baselines: vb.changes
        }
      });
    }

    // 404 for unknown auth routes
    return sendError(res, 404, `Auth endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[auth] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in auth system.');
  }
}

module.exports = {
  handleAuthRequest
};
