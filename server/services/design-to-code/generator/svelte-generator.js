/**
 * server/services/design-to-code/generator/svelte-generator.js
 * Generates modern Svelte components with scoped styling.
 */

function generateSvelte(ir, options = {}) {
  const tokens = ir.tokens || {};
  const c = tokens.colors || {};

  const files = [];

  // 1. src/components/Button.svelte
  const buttonContent = `<script>
  export let variant = 'primary';
  export let size = 'md';
</script>

<button class="btn btn-{variant} btn-{size}" {...$$restProps}>
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  .btn-primary {
    background-color: ${c.primary || '#2563EB'};
    color: #ffffff;
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
  }
  .btn-md { padding: 10px 18px; font-size: 0.9375rem; }
  .btn-lg { padding: 14px 28px; font-size: 1rem; }
</style>
`;

  files.push({
    filePath: 'src/components/Button.svelte',
    fileContent: buttonContent,
    fileType: 'component'
  });

  // 2. src/App.svelte
  const appContent = `<script>
  import Button from './components/Button.svelte';
</script>

<div class="app">
  <header class="header">
    <div class="header-container">
      <a href="/" class="brand">Acme Studio</a>
      <nav aria-label="Primary Navigation">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
      </nav>
    </div>
  </header>

  <main id="main-content">
    <section class="hero" aria-labelledby="hero-heading">
      <div class="badge">Design-to-Code 2.0 • Zero Vendor Lock-in</div>
      <h1 id="hero-heading">Build Modern Web Apps with Speed</h1>
      <p class="subtitle">
        Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.
      </p>
      <div class="actions">
        <Button variant="primary" size="lg">Start Free Trial</Button>
        <Button variant="outline" size="lg">View Documentation</Button>
      </div>

      <div class="media-placeholder" role="img" aria-label="Application preview">
        <span class="label">Application Interface Preview</span>
        <span class="note">Source asset detected — upload source asset for exact output.</span>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>© ${new Date().getFullYear()} Acme Studio. All rights reserved.</p>
  </footer>
</div>

<style>
  :global(*), :global(*::before), :global(*::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    font-family: Inter, sans-serif;
    color: ${c.text || '#0F172A'};
    background: ${c.background || '#FFFFFF'};
  }
  .header {
    border-bottom: 1px solid ${c.border || '#E2E8F0'};
    padding: 16px 24px;
  }
  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-weight: 700;
    text-decoration: none;
    color: ${c.text || '#0F172A'};
  }
  nav a {
    margin-left: 20px;
    text-decoration: none;
    color: ${c.textMuted || '#64748B'};
  }
  .hero {
    max-width: 900px;
    margin: 80px auto 64px;
    text-align: center;
    padding: 0 24px;
  }
  .badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 9999px;
    background: ${c.surface || '#F8FAFC'};
    border: 1px solid ${c.border || '#E2E8F0'};
    font-size: 0.8125rem;
    font-weight: 600;
    color: ${c.primary || '#2563EB'};
    margin-bottom: 24px;
  }
  h1 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 20px;
    letter-spacing: -0.03em;
  }
  .subtitle {
    font-size: 1.25rem;
    color: ${c.textMuted || '#64748B'};
    margin-bottom: 36px;
  }
  .actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 48px;
  }
  .media-placeholder {
    width: 100%;
    height: 400px;
    background: ${c.surface || '#F8FAFC'};
    border: 1px dashed ${c.border || '#E2E8F0'};
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .label { font-weight: 600; }
  .note { font-size: 0.8125rem; color: ${c.textMuted || '#64748B'}; }
  .footer {
    border-top: 1px solid ${c.border || '#E2E8F0'};
    padding: 24px;
    text-align: center;
    font-size: 0.875rem;
    color: ${c.textMuted || '#64748B'};
  }
</style>
`;

  files.push({
    filePath: 'src/App.svelte',
    fileContent: appContent,
    fileType: 'component'
  });

  return files;
}

module.exports = {
  generateSvelte
};
