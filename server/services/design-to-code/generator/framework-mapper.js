/**
 * server/services/design-to-code/generator/framework-mapper.js
 * Styling system mapper for CSS, SCSS, Tailwind CSS, Bootstrap, and UIkit.
 */

function generateCssVariables(tokens) {
  const c = tokens.colors || {};
  const t = tokens.typography || {};
  const s = tokens.spacing || {};
  const r = tokens.radii || {};

  return `:root {
  /* Colors */
  --color-primary: ${c.primary || '#2563EB'};
  --color-primary-hover: ${c.primaryHover || '#1D4ED8'};
  --color-secondary: ${c.secondary || '#475569'};
  --color-bg: ${c.background || '#FFFFFF'};
  --color-surface: ${c.surface || '#F8FAFC'};
  --color-text: ${c.text || '#0F172A'};
  --color-text-muted: ${c.textMuted || '#64748B'};
  --color-border: ${c.border || '#E2E8F0'};

  /* Typography */
  --font-family-base: ${t.fontFamily || 'Inter, sans-serif'};
  --font-sans: ${t.fontFamily || 'Inter, sans-serif'};
  --font-size-base: ${t.baseFontSize || '16px'};
  --line-height-base: ${t.lineHeight || '1.6'};

  /* Spacing */
  --spacing-xs: ${s.xs || '4px'};
  --spacing-sm: ${s.sm || '8px'};
  --spacing-md: ${s.md || '16px'};
  --spacing-lg: ${s.lg || '24px'};
  --spacing-xl: ${s.xl || '32px'};
  --spacing-xxl: ${s.xxl || '48px'};
  --spacing-section: ${s.section || '80px'};

  /* Radii */
  --radius-sm: ${r.sm || '4px'};
  --radius-md: ${r.md || '8px'};
  --radius-lg: ${r.lg || '12px'};
  --radius-full: ${r.full || '9999px'};
} `;
}

function generateScssVariables(tokens) {
  const c = tokens.colors || {};
  const t = tokens.typography || {};
  const s = tokens.spacing || {};
  const r = tokens.radii || {};

  return `// Design System Tokens (SCSS)
$font-sans: ${t.fontFamily || 'Inter, sans-serif'};
$color-primary: ${c.primary || '#2563EB'};
$color-primary-hover: ${c.primaryHover || '#1D4ED8'};
$color-secondary: ${c.secondary || '#475569'};
$color-bg: ${c.background || '#FFFFFF'};
$color-surface: ${c.surface || '#F8FAFC'};
$color-text: ${c.text || '#0F172A'};
$color-text-muted: ${c.textMuted || '#64748B'};
$color-border: ${c.border || '#E2E8F0'};

$spacing-xs: ${s.xs || '4px'};
$spacing-sm: ${s.sm || '8px'};
$spacing-md: ${s.md || '16px'};
$spacing-lg: ${s.lg || '24px'};
$spacing-xl: ${s.xl || '32px'};
$spacing-xxl: ${s.xxl || '48px'};
$spacing-section: ${s.section || '80px'};

$radius-sm: ${r.sm || '4px'};
$radius-md: ${r.md || '8px'};
$radius-lg: ${r.lg || '12px'};
$radius-full: ${r.full || '9999px'};

// Breakpoints Mixin
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'mobile' {
    @media (max-width: 640px) { @content; }
  } @else if $breakpoint == 'tablet' {
    @media (max-width: 1024px) { @content; }
  } @else if $breakpoint == 'desktop' {
    @media (min-width: 1025px) { @content; }
  }
}
`;
}

function generateTailwindConfig(tokens) {
  const c = tokens.colors || {};
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html,vue,svelte}',
    './app/**/*.{js,ts,jsx,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '${c.primary || '#2563EB'}',
          hover: '${c.primaryHover || '#1D4ED8'}'
        },
        surface: '${c.surface || '#F8FAFC'}',
        textMuted: '${c.textMuted || '#64748B'}'
      }
    }
  },
  plugins: []
};
`;
}

function generateFrameworkTokens(ir = {}, styling = 'css') {
  const tokens = ir.tokens || ir || {};
  if (styling === 'scss') {
    return {
      type: 'scss',
      file: {
        path: 'tokens.scss',
        content: generateScssVariables(tokens)
      }
    };
  } else if (styling === 'tailwind') {
    return {
      type: 'tailwind',
      file: {
        path: 'tailwind.config.js',
        content: generateTailwindConfig(tokens)
      }
    };
  } else {
    return {
      type: 'css',
      file: {
        path: 'variables.css',
        content: generateCssVariables(tokens)
      }
    };
  }
}

module.exports = {
  generateCssVariables,
  generateScssVariables,
  generateTailwindConfig,
  generateFrameworkTokens
};
