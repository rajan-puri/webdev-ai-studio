/**
 * client/js/services/auth-manager.js
 * Central Authentication & Session Manager for WebDev AI Studio.
 * Connects with server-side SQLite session management, Google login, and user profile.
 */

(function () {
  'use strict';

  let listeners = [];

  class AuthManager {
    constructor() {
      this.user = null;
      this.isLoading = true;
      this.init();
    }

    async init() {
      this.isLoading = true;
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.authenticated && data.user) {
          this.user = data.user;
        } else {
          // If no active session, auto-login to Demo user for frictionless local experience
          await this.loginAsDemo(false);
        }
      } catch (err) {
        console.warn('[AuthManager] Failed to check auth status, attempting demo session:', err);
        try {
          await this.loginAsDemo(false);
        } catch (e) {}
      } finally {
        this.isLoading = false;
        this.notifyListeners();
      }
    }

    getUser() {
      return this.user;
    }

    setUser(user) {
      this.user = user;
      this.notifyListeners();
    }

    isAuthenticated() {
      return !!this.user;
    }

    async register({ name, email, password }) {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }
      this.user = data.user;
      this.notifyListeners();
      return this.user;
    }

    async login({ email, password }) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }
      this.user = data.user;
      this.notifyListeners();
      return this.user;
    }

    async loginWithGoogle({ email, name, googleId, avatarUrl } = {}) {
      const payload = {
        email: email || 'user_' + Math.random().toString(36).substring(2, 7) + '@gmail.com',
        name: name || 'Google Developer',
        googleId: googleId || ('g_' + Date.now()),
        avatarUrl: avatarUrl || 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Google login failed');
      }
      this.user = data.user;
      this.notifyListeners();
      return this.user;
    }

    async loginAsDemo(notify = true) {
      try {
        const res = await fetch('/api/auth/demo-login', {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.user) {
          this.user = data.user;
          if (notify) this.notifyListeners();
          return this.user;
        }
      } catch (e) {
        console.error('[AuthManager] Demo login failed', e);
      }
      return null;
    }

    async logout() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.warn('[AuthManager] Logout network error:', e);
      }
      this.user = null;
      this.notifyListeners();
    }

    subscribe(fn) {
      listeners.push(fn);
      // Immediately invoke with current state
      fn(this.user);
      return () => {
        listeners = listeners.filter(l => l !== fn);
      };
    }

    notifyListeners() {
      listeners.forEach(fn => {
        try {
          fn(this.user);
        } catch (e) {
          console.error('[AuthManager] Error in listener', e);
        }
      });
    }
  }

  window.AuthManager = new AuthManager();
})();
