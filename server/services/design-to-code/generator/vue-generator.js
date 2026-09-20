/**
 * server/services/design-to-code/generator/vue-generator.js
 * Generates Vue 3 Single File Components (SFCs with <script setup>).
 */

const { generateScssVariables } = require('./framework-mapper');

function generateVue(ir, options = {}) {
  const tokens = ir.tokens || {};
  const c = tokens.colors || {};

  const files = [];

  // 1. src/components/Button.vue
  const buttonContent = `<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'md'
  }
});
</script>

<template>
  <button :class="['btn', \`btn-\${variant}\`, \`btn-\${size}\`]">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;

  &-primary {
    background-color: ${c.primary || '#2563EB'};
    color: #FFFFFF;
    &:hover { background-color: ${c.primaryHover || '#1D4ED8'}; }
  }

  &-outline {
    background-color: transparent;
    border-color: ${c.border || '#E2E8F0'};
    color: ${c.text || '#0F172A'};
    &:hover { background-color: ${c.surface || '#F8FAFC'}; }
  }

  &-md { padding: 10px 18px; font-size: 0.9375rem; }
  &-lg { padding: 14px 28px; font-size: 1rem; }
}
</style>
`;

  files.push({
    filePath: 'src/components/Button.vue',
    fileContent: buttonContent,
    fileType: 'component'
  });

  // 2. src/components/Hero.vue
  const heroContent = `<script setup>
import Button from './Button.vue';
</script>

<template>
  <section class="hero-section" aria-labelledby="hero-heading">
    <div class="hero-container">
      <div class="hero-badge">Design-to-Code 2.0 • Zero Vendor Lock-in</div>
      <h1 id="hero-heading" class="hero-title">Build Modern Web Apps with Speed</h1>
      <p class="hero-subtitle">
        Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.
      </p>
      <div class="hero-actions">
        <Button variant="primary" size="lg">Start Free Trial</Button>
        <Button variant="outline" size="lg">View Documentation</Button>
      </div>

      <div class="media-placeholder" role="img" aria-label="Application preview">
        <span class="media-label">Application Interface Preview</span>
        <span class="media-note">Source asset detected — upload source asset for exact output.</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero-section {
  padding: 80px 24px 64px;
  text-align: center;
}
.hero-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-badge {
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
.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 20px;
  letter-spacing: -0.03em;
}
.hero-subtitle {
  font-size: 1.25rem;
  color: ${c.textMuted || '#64748B'};
  margin-bottom: 36px;
  max-width: 640px;
}
.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 56px;
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
.media-label { font-weight: 600; color: ${c.text || '#0F172A'}; }
.media-note { font-size: 0.8125rem; color: ${c.textMuted || '#64748B'}; }

@media (max-width: 640px) {
  .hero-title { font-size: 2.25rem; }
  .hero-actions { flex-direction: column; width: 100%; }
}
</style>
`;

  files.push({
    filePath: 'src/components/Hero.vue',
    fileContent: heroContent,
    fileType: 'component'
  });

  // 3. src/App.vue
  const appContent = `<script setup>
import Hero from './components/Hero.vue';
</script>

<template>
  <div class="app-layout">
    <header class="header">
      <div class="header-inner">
        <a href="#" class="brand">Acme Studio</a>
        <nav aria-label="Primary Navigation">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </nav>
      </div>
    </header>
    <main id="main-content">
      <Hero />
    </main>
    <footer class="footer">
      <p>© ${new Date().getFullYear()} Acme Studio. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped lang="scss">
@import './styles/tokens.scss';

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, sans-serif; color: #0F172A; }
.header { border-bottom: 1px solid #E2E8F0; padding: 16px 24px; }
.header-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
.brand { font-weight: 700; text-decoration: none; color: #0F172A; }
nav a { margin-left: 20px; text-decoration: none; color: #64748B; font-size: 0.9375rem; }
.footer { border-top: 1px solid #E2E8F0; padding: 24px; text-align: center; font-size: 0.875rem; color: #64748B; }
</style>
`;

  files.push({
    filePath: 'src/App.vue',
    fileContent: appContent,
    fileType: 'component'
  });

  // 4. SCSS tokens
  files.push({
    filePath: 'src/styles/tokens.scss',
    fileContent: generateScssVariables(tokens),
    fileType: 'style'
  });

  return files;
}

module.exports = {
  generateVue
};
