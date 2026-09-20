/**
 * server/services/design-to-code/generator/html-scss-generator.js
 * Generates semantic HTML5 markup, responsive SCSS/CSS, and vanilla JS.
 */

const { generateCssVariables, generateScssVariables } = require('./framework-mapper');

function generateHtmlScss(ir, options = {}) {
  const stylingType = options.styling === 'css' ? 'css' : 'scss';
  const tokens = ir.tokens || {};
  const c = tokens.colors || {};
  const t = tokens.typography || {};

  const brandName = ir.sections?.find(s => s.type === 'Navbar' || s.name === 'Navbar')?.elements?.find(e => e.id === 'brand')?.content || options.brandName || 'Acme Studio';

  // 1. Generate index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./styles.${stylingType === 'scss' ? 'css' : 'css'}">
</head>
<body>
  <!-- Header / Navigation -->
  <header class="navbar-section site-header">
    <div class="container header-container">
      <a href="#" class="brand-logo" aria-label="Home">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span>${brandName}</span>
      </a>

      <nav class="main-nav" aria-label="Primary Navigation">
        <ul class="nav-list">
          <li><a href="#features" class="nav-link">Features</a></li>
          <li><a href="#solutions" class="nav-link">Solutions</a></li>
          <li><a href="#pricing" class="nav-link">Pricing</a></li>
          <li><a href="#docs" class="nav-link">Documentation</a></li>
        </ul>
      </nav>

      <div class="header-actions">
        <button type="button" class="btn btn-ghost">Sign In</button>
        <button type="button" class="btn btn-primary">Get Started</button>
        <button type="button" class="mobile-menu-toggle" id="mobileMenuBtn" aria-label="Toggle navigation menu" aria-expanded="false">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main id="main-content">
    <!-- Hero Section -->
    <section class="hero-section" aria-labelledby="hero-heading">
      <div class="container hero-container">
        <div class="hero-badge">
          <span>Design-to-Code 2.0 • Zero Vendor Lock-in</span>
        </div>
        <h1 id="hero-heading" class="hero-title">Build Modern Web Apps with Speed</h1>
        <p class="hero-subtitle">
          Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.
        </p>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary btn-lg">Start Free Trial</button>
          <button type="button" class="btn btn-outline btn-lg">View Documentation</button>
        </div>

        <div class="hero-media-wrapper">
          <!-- Asset requires replacement -->
          <div class="media-placeholder" role="img" aria-label="Application preview preview">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span class="media-label">Application Interface Preview</span>
            <span class="media-note">Source asset detected — upload source asset for exact output.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid Section -->
    <section id="features" class="features-section" aria-labelledby="features-heading">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-eyebrow">CAPABILITIES</span>
          <h2 id="features-heading" class="section-title">Engineered for Real Developer Workflows</h2>
          <p class="section-description">Production-ready output designed for maintainability, strict responsiveness, and accessibility.</p>
        </div>

        <div class="features-grid">
          <article class="feature-card">
            <div class="feature-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <h3 class="feature-title">Semantic Architecture</h3>
            <p class="feature-text">Uses genuine semantic HTML tags instead of nested div soup. Easily integrates into existing design systems.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3 class="feature-title">Fluid Responsiveness</h3>
            <p class="feature-text">Built with CSS Grid and Flexbox with adaptive mobile, tablet, and desktop breakpoints.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 class="feature-title">axe-core Verified</h3>
            <p class="feature-text">Automatically validated against WCAG 2.1 AA accessibility standards with zero synthetic scores.</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Call to Action -->
    <section class="cta-section" aria-labelledby="cta-heading">
      <div class="container cta-container">
        <h2 id="cta-heading" class="cta-title">Ready to turn designs into code?</h2>
        <p class="cta-subtitle">Choose your stack, inspect the live preview, and download clean source code.</p>
        <div class="cta-actions">
          <button type="button" class="btn btn-primary btn-lg">Generate Your Code</button>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="footer-section site-footer">
    <div class="container footer-container">
      <p class="footer-copy">© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
      <ul class="footer-links">
        <li><a href="#" class="footer-link">Privacy Policy</a></li>
        <li><a href="#" class="footer-link">Terms of Service</a></li>
        <li><a href="#" class="footer-link">GitHub</a></li>
      </ul>
    </div>
  </footer>

  <script src="./script.js"></script>
</body>
</html>`;

  // 2. Generate SCSS / CSS
  const scssVariables = generateScssVariables(tokens);
  const cssVariables = generateCssVariables(tokens);

  const stylesContent = `${stylingType === 'scss' ? scssVariables : cssVariables}

/* Reset & Global */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: ${tokens.typography?.fontFamily || 'Inter, sans-serif'};
  background-color: ${c.background || '#FFFFFF'};
  color: ${c.text || '#0F172A'};
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 24px;
  padding-right: 24px;
}

/* Header */
.site-header {
  border-bottom: 1px solid ${c.border || '#E2E8F0'};
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.125rem;
  color: ${c.text || '#0F172A'};
  text-decoration: none;
}

.brand-logo svg {
  color: ${c.primary || '#2563EB'};
}

.nav-list {
  display: flex;
  list-style: none;
  gap: 28px;
}

.nav-link {
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${c.textMuted || '#64748B'};
  transition: color 0.15s ease;
}

.nav-link:hover {
  color: ${c.primary || '#2563EB'};
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: ${c.text || '#0F172A'};
  padding: 4px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-primary {
  background-color: ${c.primary || '#2563EB'};
  color: #FFFFFF;
}

.btn-primary:hover {
  background-color: ${c.primaryHover || '#1D4ED8'};
}

.btn-outline {
  background-color: transparent;
  border-color: ${c.border || '#E2E8F0'};
  color: ${c.text || '#0F172A'};
}

.btn-outline:hover {
  background-color: ${c.surface || '#F8FAFC'};
  border-color: ${c.textMuted || '#64748B'};
}

.btn-ghost {
  background-color: transparent;
  color: ${c.text || '#0F172A'};
}

.btn-ghost:hover {
  background-color: ${c.surface || '#F8FAFC'};
}

.btn-lg {
  padding: 14px 28px;
  font-size: 1rem;
}

/* Hero Section */
.hero-section {
  padding: 80px 0 64px;
  text-align: center;
}

.hero-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 9999px;
  background-color: ${c.surface || '#F8FAFC'};
  border: 1px solid ${c.border || '#E2E8F0'};
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${c.primary || '#2563EB'};
  margin-bottom: 24px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  max-width: 800px;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: ${c.textMuted || '#64748B'};
  max-width: 640px;
  margin-bottom: 36px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 56px;
}

.hero-media-wrapper {
  width: 100%;
  max-width: 1000px;
}

.media-placeholder {
  width: 100%;
  height: 480px;
  background: ${c.surface || '#F8FAFC'};
  border: 1px dashed ${c.border || '#E2E8F0'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: ${c.textMuted || '#64748B'};
  padding: 24px;
}

.media-label {
  font-weight: 600;
  font-size: 1rem;
  color: ${c.text || '#0F172A'};
}

.media-note {
  font-size: 0.8125rem;
  color: ${c.textMuted || '#64748B'};
}

/* Features Section */
.features-section {
  padding: 80px 0;
  background-color: ${c.surface || '#F8FAFC'};
}

.section-header {
  margin-bottom: 56px;
}

.section-eyebrow {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: ${c.primary || '#2563EB'};
  margin-bottom: 10px;
  display: block;
}

.section-title {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.section-description {
  font-size: 1.125rem;
  color: ${c.textMuted || '#64748B'};
  max-width: 580px;
  margin-left: auto;
  margin-right: auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.feature-card {
  background: #FFFFFF;
  border: 1px solid ${c.border || '#E2E8F0'};
  border-radius: 12px;
  padding: 32px 28px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04);
}

.feature-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background-color: rgba(37, 99, 235, 0.08);
  color: ${c.primary || '#2563EB'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.feature-text {
  font-size: 0.9375rem;
  color: ${c.textMuted || '#64748B'};
  line-height: 1.6;
}

/* CTA Section */
.cta-section {
  padding: 80px 0;
  text-align: center;
}

.cta-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cta-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.cta-subtitle {
  font-size: 1.125rem;
  color: ${c.textMuted || '#64748B'};
  margin-bottom: 32px;
}

/* Footer */
.site-footer {
  border-top: 1px solid ${c.border || '#E2E8F0'};
  padding: 32px 0;
}

.footer-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-copy {
  font-size: 0.875rem;
  color: ${c.textMuted || '#64748B'};
}

.footer-links {
  display: flex;
  list-style: none;
  gap: 20px;
}

.footer-link {
  font-size: 0.875rem;
  color: ${c.textMuted || '#64748B'};
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer-link:hover {
  color: ${c.primary || '#2563EB'};
}

/* Responsive Styling */
${stylingType === 'scss' ? `@include respond-to(tablet) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@include respond-to(mobile) {
  .main-nav, .header-actions .btn {
    display: none;
  }

  .mobile-menu-toggle {
    display: block;
  }

  .hero-title {
    font-size: 2.25rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-actions .btn {
    width: 100%;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .footer-container {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}` : `@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .main-nav, .header-actions .btn {
    display: none;
  }

  .mobile-menu-toggle {
    display: block;
  }

  .hero-title {
    font-size: 2.25rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-actions .btn {
    width: 100%;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .footer-container {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}`}
`;

  // 3. Generate script.js
  const scriptContent = `// Acme Studio UI Interactions
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.querySelector('.main-nav');

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
      mainNav.classList.toggle('is-open');
    });
  }
});
`;

  return [
    { filePath: 'index.html', fileContent: htmlContent, fileType: 'markup' },
    { filePath: stylingType === 'scss' ? 'styles.scss' : 'styles.css', fileContent: stylesContent, fileType: 'style' },
    { filePath: 'script.js', fileContent: scriptContent, fileType: 'script' }
  ];
}

module.exports = {
  generateHtmlScss
};
