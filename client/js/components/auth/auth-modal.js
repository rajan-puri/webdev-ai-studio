/**
 * client/js/components/auth/auth-modal.js
 * User Profile Button and Authentication Modal Component for WebDev AI Studio.
 */

(function () {
  'use strict';

  class AuthModalComponent {
    constructor() {
      this.currentMode = 'login'; // 'login', 'register', 'profile'
      this.init();
    }

    init() {
      this.injectHeaderProfileBtn();
      this.injectModalHtml();
      this.bindEvents();

      if (window.AuthManager) {
        window.AuthManager.subscribe(user => {
          this.updateUiForUser(user);
        });
      }
    }

    injectHeaderProfileBtn() {
      const headerRight = document.querySelector('.header-right');
      if (!headerRight || document.getElementById('btnAuthProfile')) return;

      const profileBtn = document.createElement('button');
      profileBtn.id = 'btnAuthProfile';
      profileBtn.className = 'user-profile-btn';
      profileBtn.type = 'button';
      profileBtn.setAttribute('title', 'Open Profile & Account Workspace');
      profileBtn.innerHTML = `
        <span class="user-avatar-tiny" id="headerUserAvatar">W</span>
        <span id="headerUserName">WebDev Developer</span>
        <svg class="profile-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6; margin-left: 2px;"><path d="M6 9l6 6 6-6"/></svg>
      `;
      headerRight.insertBefore(profileBtn, headerRight.firstChild);

      profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const user = window.AuthManager ? window.AuthManager.getUser() : null;
        if (user) {
          if (window.App && window.App.openProfile) {
            window.App.openProfile();
          } else if (window.ProfileView && window.ProfileView.open) {
            window.ProfileView.open();
          } else {
            window.location.href = '/profile';
          }
        } else {
          this.open('login');
        }
      });

      // Also bind sidebar user-menu
      const sidebarUserMenu = document.querySelector('.sidebar-footer .user-menu');
      if (sidebarUserMenu) {
        sidebarUserMenu.style.cursor = 'pointer';
        sidebarUserMenu.setAttribute('title', 'Manage Account Profile');
        sidebarUserMenu.addEventListener('click', (e) => {
          e.preventDefault();
          const user = window.AuthManager ? window.AuthManager.getUser() : null;
          if (user) {
            if (window.App && window.App.openProfile) {
              window.App.openProfile();
            } else if (window.ProfileView && window.ProfileView.open) {
              window.ProfileView.open();
            } else {
              window.location.href = '/profile';
            }
          } else {
            this.open('login');
          }
        });
      }
    }

    injectModalHtml() {
      if (document.getElementById('authModalBackdrop')) return;

      const modalHtml = `
        <div class="auth-modal-backdrop" id="authModalBackdrop" style="display: none;">
          <div class="auth-modal-card" id="authModalCard">
            <!-- Modal Header -->
            <div class="auth-modal-header">
              <h3 class="auth-modal-title" id="authModalTitle">Account & Authentication</h3>
              <button class="btn btn-icon" id="btnCloseAuthModal" type="button" style="border:none; padding:4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Tabs (hidden in profile mode) -->
            <div class="auth-tabs" id="authTabsBar">
              <button class="auth-tab-btn active" id="tabBtnLogin" type="button" data-tab="login">Sign In</button>
              <button class="auth-tab-btn" id="tabBtnRegister" type="button" data-tab="register">Create Account</button>
            </div>

            <!-- Modal Body -->
            <div class="auth-modal-body">
              <div class="auth-alert auth-alert-error" id="authAlertError"></div>
              <div class="auth-alert auth-alert-success" id="authAlertSuccess"></div>

              <!-- VIEW 1: Logged In Profile View -->
              <div id="authProfileView" style="display: none;">
                <div class="profile-card-details">
                  <div class="profile-field-row">
                    <span class="profile-field-label">Name</span>
                    <span class="profile-field-value" id="profileNameDisplay">—</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Email</span>
                    <span class="profile-field-value font-mono" id="profileEmailDisplay">—</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">Provider</span>
                    <span class="profile-field-value" id="profileProviderDisplay">Local</span>
                  </div>
                  <div class="profile-field-row">
                    <span class="profile-field-label">User ID</span>
                    <span class="profile-field-value font-mono text-muted" style="font-size: 11px;" id="profileIdDisplay">—</span>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button class="btn btn-secondary" id="btnSwitchToDemo" type="button" style="width: 100%;">
                    Switch to Demo Account
                  </button>
                  <button class="btn btn-secondary" id="btnSwitchAccount" type="button" style="width: 100%;">
                    Sign In to Another Account
                  </button>
                  <button class="btn" id="btnLogout" type="button" style="width: 100%; color: var(--status-warning, #dc2626);">
                    Log Out
                  </button>
                </div>
              </div>

              <!-- VIEW 2: Login / Register Form -->
              <form id="authForm" style="display: block;">
                <!-- Name field (register only) -->
                <div class="auth-form-group" id="authGroupName" style="display: none;">
                  <label class="auth-form-label" for="authInputName">Full Name</label>
                  <input class="auth-form-input" id="authInputName" type="text" placeholder="e.g. Alex Morgan" autocomplete="name">
                </div>

                <!-- Email field -->
                <div class="auth-form-group">
                  <label class="auth-form-label" for="authInputEmail">Email Address</label>
                  <input class="auth-form-input" id="authInputEmail" type="email" placeholder="you@company.com" required autocomplete="email">
                </div>

                <!-- Password field -->
                <div class="auth-form-group">
                  <label class="auth-form-label" for="authInputPassword">Password</label>
                  <input class="auth-form-input" id="authInputPassword" type="password" placeholder="••••••••" required autocomplete="current-password">
                </div>

                <button class="btn-auth-primary" id="btnAuthSubmit" type="submit">
                  Sign In
                </button>

                <div class="auth-divider">
                  <span>or continue with</span>
                </div>

                <!-- Google Login Button -->
                <button class="btn-google-login" id="btnGoogleAuth" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <!-- Quick Demo Login -->
                <button class="btn btn-secondary" id="btnQuickDemoLogin" type="button" style="width: 100%; margin-top: 10px; font-size: 13px;">
                  Use Default Demo Account
                </button>
              </form>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    bindEvents() {
      const backdrop = document.getElementById('authModalBackdrop');
      const card = document.getElementById('authModalCard');
      const closeBtn = document.getElementById('btnCloseAuthModal');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabRegister = document.getElementById('tabBtnRegister');
      const form = document.getElementById('authForm');
      const googleBtn = document.getElementById('btnGoogleAuth');
      const quickDemoBtn = document.getElementById('btnQuickDemoLogin');
      const switchDemoBtn = document.getElementById('btnSwitchToDemo');
      const switchAccountBtn = document.getElementById('btnSwitchAccount');
      const logoutBtn = document.getElementById('btnLogout');

      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.close();
        });
      }

      if (tabLogin) tabLogin.addEventListener('click', () => this.setMode('login'));
      if (tabRegister) tabRegister.addEventListener('click', () => this.setMode('register'));

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          this.handleFormSubmit();
        });
      }

      if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
          this.handleGoogleLogin();
        });
      }

      if (quickDemoBtn) {
        quickDemoBtn.addEventListener('click', async () => {
          await this.handleDemoLogin();
        });
      }

      if (switchDemoBtn) {
        switchDemoBtn.addEventListener('click', async () => {
          await this.handleDemoLogin();
        });
      }

      if (switchAccountBtn) {
        switchAccountBtn.addEventListener('click', () => {
          this.setMode('login');
        });
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await window.AuthManager.logout();
          this.setMode('login');
        });
      }
    }

    open(mode) {
      if (!mode || mode === 'profile') {
        const user = window.AuthManager ? window.AuthManager.getUser() : null;
        if (user) {
          if (window.App && window.App.openProfile) {
            window.App.openProfile();
            return;
          } else if (window.ProfileView && window.ProfileView.open) {
            window.ProfileView.open();
            return;
          }
        }
      }

      const backdrop = document.getElementById('authModalBackdrop');
      if (!backdrop) return;

      this.setMode(mode || 'login');
      this.clearAlerts();
      backdrop.style.display = 'flex';
    }

    close() {
      const backdrop = document.getElementById('authModalBackdrop');
      if (backdrop) backdrop.style.display = 'none';
      this.clearAlerts();
    }

    setMode(mode) {
      this.currentMode = mode;
      this.clearAlerts();

      const tabsBar = document.getElementById('authTabsBar');
      const profileView = document.getElementById('authProfileView');
      const formView = document.getElementById('authForm');
      const nameGroup = document.getElementById('authGroupName');
      const submitBtn = document.getElementById('btnAuthSubmit');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabRegister = document.getElementById('tabBtnRegister');
      const modalTitle = document.getElementById('authModalTitle');

      if (mode === 'profile') {
        if (tabsBar) tabsBar.style.display = 'none';
        if (formView) formView.style.display = 'none';
        if (profileView) profileView.style.display = 'block';
        if (modalTitle) modalTitle.textContent = 'Account Profile';
      } else {
        if (tabsBar) tabsBar.style.display = 'flex';
        if (formView) formView.style.display = 'block';
        if (profileView) profileView.style.display = 'none';
        if (modalTitle) modalTitle.textContent = mode === 'login' ? 'Sign In to Studio' : 'Create an Account';

        if (mode === 'register') {
          if (nameGroup) nameGroup.style.display = 'block';
          if (submitBtn) submitBtn.textContent = 'Create Account';
          if (tabRegister) tabRegister.classList.add('active');
          if (tabLogin) tabLogin.classList.remove('active');
        } else {
          if (nameGroup) nameGroup.style.display = 'none';
          if (submitBtn) submitBtn.textContent = 'Sign In';
          if (tabLogin) tabLogin.classList.add('active');
          if (tabRegister) tabRegister.classList.remove('active');
        }
      }
    }

    async handleFormSubmit() {
      this.clearAlerts();
      const email = (document.getElementById('authInputEmail').value || '').trim();
      const password = document.getElementById('authInputPassword').value || '';
      const name = (document.getElementById('authInputName').value || '').trim();

      const submitBtn = document.getElementById('btnAuthSubmit');
      const origText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        if (this.currentMode === 'register') {
          await window.AuthManager.register({ name, email, password });
          this.showAlert('success', 'Account created! Welcome to WebDev AI Studio.');
        } else {
          await window.AuthManager.login({ email, password });
          this.showAlert('success', 'Welcome back!');
        }
        setTimeout(() => this.close(), 600);
      } catch (err) {
        this.showAlert('error', err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }

    async handleGoogleLogin() {
      this.clearAlerts();
      try {
        const userPromptEmail = prompt('Enter your Google Account email for single-sign on:', 'developer@gmail.com');
        if (!userPromptEmail) return;

        const cleanEmail = userPromptEmail.trim();
        const userName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        await window.AuthManager.loginWithGoogle({
          email: cleanEmail,
          name: userName,
          googleId: 'g_' + Math.random().toString(36).substring(2, 9)
        });

        this.showAlert('success', `Signed in with Google as ${cleanEmail}`);
        setTimeout(() => this.close(), 600);
      } catch (err) {
        this.showAlert('error', err.message);
      }
    }

    async handleDemoLogin() {
      this.clearAlerts();
      try {
        await window.AuthManager.loginAsDemo();
        this.showAlert('success', 'Switched to Demo Developer account.');
        setTimeout(() => this.close(), 600);
      } catch (err) {
        this.showAlert('error', err.message);
      }
    }

    updateUiForUser(user) {
      const headerAvatar = document.getElementById('headerUserAvatar');
      const headerName = document.getElementById('headerUserName');
      const sidebarAvatar = document.querySelector('.sidebar-footer .user-avatar');
      const sidebarName = document.querySelector('.sidebar-footer .user-name');
      const sidebarTag = document.querySelector('.sidebar-footer .env-tag');

      const profileName = document.getElementById('profileNameDisplay');
      const profileEmail = document.getElementById('profileEmailDisplay');
      const profileProvider = document.getElementById('profileProviderDisplay');
      const profileId = document.getElementById('profileIdDisplay');

      if (user) {
        const initial = (user.name || user.email || 'U')[0].toUpperCase();
        if (headerAvatar) headerAvatar.textContent = initial;
        if (headerName) headerName.textContent = user.name || user.email;

        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (sidebarName) sidebarName.textContent = user.name || user.email;
        if (sidebarTag) sidebarTag.textContent = (user.authProvider || 'local').toUpperCase();

        if (profileName) profileName.textContent = user.name;
        if (profileEmail) profileEmail.textContent = user.email;
        if (profileProvider) profileProvider.textContent = user.authProvider === 'google' ? 'Google OAuth' : 'Email/Password';
        if (profileId) profileId.textContent = user.id;
      } else {
        if (headerAvatar) headerAvatar.textContent = '?';
        if (headerName) headerName.textContent = 'Sign In';
        if (sidebarAvatar) sidebarAvatar.textContent = '?';
        if (sidebarName) sidebarName.textContent = 'Guest';
        if (sidebarTag) sidebarTag.textContent = 'UNAUTH';
      }
    }

    showAlert(type, message) {
      const errEl = document.getElementById('authAlertError');
      const succEl = document.getElementById('authAlertSuccess');
      if (type === 'error' && errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
      } else if (type === 'success' && succEl) {
        succEl.textContent = message;
        succEl.style.display = 'block';
      }
    }

    clearAlerts() {
      const errEl = document.getElementById('authAlertError');
      const succEl = document.getElementById('authAlertSuccess');
      if (errEl) errEl.style.display = 'none';
      if (succEl) succEl.style.display = 'none';
    }
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.AuthModal = new AuthModalComponent();
    });
  } else {
    window.AuthModal = new AuthModalComponent();
  }
})();
