/**
 * server/services/design-to-code/generator/react-generator.js
 * Generates clean, modular React components (JSX or TSX) with Tailwind or SCSS.
 */

const { generateTailwindConfig } = require('./framework-mapper');
const { ExistingProjectMapper } = require('./existing-project-mapper');

function generateReact(ir, options = {}) {
  const isTs = options.language === 'typescript' || !!options.typescript;
  const ext = isTs ? 'tsx' : 'jsx';
  const styling = options.styling === 'scss' ? 'scss' : 'tailwind';
  const tokens = ir.tokens || {};
  const c = tokens.colors || {};
  const mapper = new ExistingProjectMapper(options.projectRules || {});

  const buttonUsage = mapper.resolveButtonUsage('react');
  const cardUsage = mapper.resolveCardUsage('react');

  const files = [];

  // 1. Button component (if not reused from existing project)
  if (!buttonUsage.skipFileGeneration) {
    const buttonContent = isTs
      ? `import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  ${styling === 'tailwind' ? `
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-slate-700 hover:bg-slate-800 text-white focus:ring-slate-500',
    outline: 'border border-slate-300 text-slate-900 hover:bg-slate-50 focus:ring-slate-400',
    ghost: 'text-slate-900 hover:bg-slate-100 focus:ring-slate-400'
  }[variant];
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }[size];

  return (
    <button className={\`\${baseClasses} \${variantClasses} \${sizeClasses} \${className}\`} {...props}>
      {children}
    </button>
  );` : `
  return (
    <button className={\`btn btn-\${variant} btn-\${size} \${className}\`} {...props}>
      {children}
    </button>
  );`}
};
`
      : `import React from 'react';

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  ${styling === 'tailwind' ? `
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-slate-700 hover:bg-slate-800 text-white focus:ring-slate-500',
    outline: 'border border-slate-300 text-slate-900 hover:bg-slate-50 focus:ring-slate-400',
    ghost: 'text-slate-900 hover:bg-slate-100 focus:ring-slate-400'
  }[variant] || '';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }[size] || '';

  return (
    <button className={\`\${baseClasses} \${variantClasses} \${sizeClasses} \${className}\`} {...props}>
      {children}
    </button>
  );` : `
  return (
    <button className={\`btn btn-\${variant} btn-\${size} \${className}\`} {...props}>
      {children}
    </button>
  );`}
};
`;

    files.push({
      filePath: `src/components/Button.${ext}`,
      fileContent: buttonContent,
      fileType: 'component'
    });
  }

  // 2. FeatureCard component (if not reused)
  if (!cardUsage.skipFileGeneration) {
    const cardContent = isTs
      ? `import React from 'react';

export interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  ${styling === 'tailwind' ? `
  return (
    <article className="p-7 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      {icon && <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-5">{icon}</div>}
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </article>
  );` : `
  return (
    <article className="feature-card">
      {icon && <div className="feature-icon-box">{icon}</div>}
      <h3 className="feature-title">{title}</h3>
      <p className="feature-text">{description}</p>
    </article>
  );`}
};
`
      : `import React from 'react';

export const FeatureCard = ({ icon, title, description }) => {
  ${styling === 'tailwind' ? `
  return (
    <article className="p-7 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
      {icon && <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-5">{icon}</div>}
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </article>
  );` : `
  return (
    <article className="feature-card">
      {icon && <div className="feature-icon-box">{icon}</div>}
      <h3 className="feature-title">{title}</h3>
      <p className="feature-text">{description}</p>
    </article>
  );`}
};
`;

    files.push({
      filePath: `src/components/FeatureCard.${ext}`,
      fileContent: cardContent,
      fileType: 'component'
    });
  }

  // 3. Navbar component
  const navbarContent = `import React, { useState } from 'react';
${buttonUsage.importStatement}

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  ${styling === 'tailwind' ? `
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-bold text-lg text-slate-900">
          <span className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center text-xs">A</span>
          <span>Acme Studio</span>
        </a>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
          <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
          <a href="#solutions" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Solutions</a>
          <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
          <a href="#docs" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Docs</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Sign In</Button>
          <Button variant="primary" size="sm">Get Started</Button>
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-slate-700"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden px-6 py-4 border-t border-slate-100 bg-white flex flex-col gap-3">
          <a href="#features" className="text-sm font-medium text-slate-700 py-1">Features</a>
          <a href="#pricing" className="text-sm font-medium text-slate-700 py-1">Pricing</a>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="primary" size="md" className="w-full">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  );` : `
  return (
    <header className="site-header">
      <div className="container header-container">
        <a href="#" className="brand-logo">
          <span>Acme Studio</span>
        </a>
        <nav className="main-nav" aria-label="Primary Navigation">
          <ul className="nav-list">
            <li><a href="#features" className="nav-link">Features</a></li>
            <li><a href="#pricing" className="nav-link">Pricing</a></li>
          </ul>
        </nav>
        <div className="header-actions">
          <Button variant="primary">Get Started</Button>
        </div>
      </div>
    </header>
  );`}
};
`;

  files.push({
    filePath: `src/components/Navbar.${ext}`,
    fileContent: navbarContent,
    fileType: 'component'
  });

  // 4. Hero component
  const heroContent = isTs ? `import React from 'react';
${buttonUsage.importStatement}

export interface HeroProps {
  title?: string;
  subtitle?: string;
}

export const Hero: React.FC<HeroProps> = ({ title, subtitle }) => {
  ${styling === 'tailwind' ? `
  return (
    <section className="py-20 text-center" aria-labelledby="hero-heading">
      <div className="max-w-4xl mx-auto px-6 flex flex-col items-center">
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 mb-6">
          Design-to-Code 2.0 • Zero Vendor Lock-in
        </span>
        <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
          {title || 'Build Modern Web Apps with Speed'}
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-9">
          {subtitle || 'Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.'}
        </p>` : `
  return (
    <section className="hero-section">
      <div className="container hero-container">
        <div className="hero-badge">
          <span>Design-to-Code 2.0 • Zero Vendor Lock-in</span>
        </div>
        <h1 className="hero-title">{title || 'Build Modern Web Apps with Speed'}</h1>
        <p className="hero-subtitle">
          {subtitle || 'Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.'}
        </p>`}
        <div className="hero-actions">
          <Button variant="primary" size="lg">Start Free Trial</Button>
          <Button variant="outline" size="lg">View Documentation</Button>
        </div>
      </div>
    </section>
  );
};
` : `import React from 'react';
${buttonUsage.importStatement}

export const Hero = () => {
  ${styling === 'tailwind' ? `
  return (
    <section className="py-20 text-center" aria-labelledby="hero-heading">
      <div className="max-w-4xl mx-auto px-6 flex flex-col items-center">
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 mb-6">
          Design-to-Code 2.0 • Zero Vendor Lock-in
        </span>
        <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
          Build Modern Web Apps with Speed
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-9">
          Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-14">
          <Button variant="primary" size="lg">Start Free Trial</Button>
          <Button variant="outline" size="lg">View Documentation</Button>
        </div>

        <div className="w-full max-w-4xl h-80 sm:h-96 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500">
          <span className="font-semibold text-slate-800 mb-1">Application Interface Preview</span>
          <span className="text-xs text-slate-500">Source asset detected — upload source asset for exact output.</span>
        </div>
      </div>
    </section>
  );` : `
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="container hero-container">
        <div className="hero-badge">Design-to-Code 2.0</div>
        <h1 id="hero-heading" className="hero-title">Build Modern Web Apps with Speed</h1>
        <p className="hero-subtitle">Transform designs into clean code.</p>
        <div className="hero-actions">
          <Button variant="primary" size="lg">Start Free Trial</Button>
        </div>
      </div>
    </section>
  );`}
};
`;

  files.push({
    filePath: `src/components/Hero.${ext}`,
    fileContent: heroContent,
    fileType: 'component'
  });

  // 5. FeatureGrid component
  const gridContent = `import React from 'react';
${cardUsage.importStatement}

export const FeatureGrid = () => {
  ${styling === 'tailwind' ? `
  return (
    <section id="features" className="py-20 bg-slate-50" aria-labelledby="features-heading">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-2 block">CAPABILITIES</span>
          <h2 id="features-heading" className="text-3xl font-bold text-slate-900 mb-3">Engineered for Real Developer Workflows</h2>
          <p className="text-slate-600">Production-ready output designed for maintainability, strict responsiveness, and accessibility.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <${cardUsage.componentTag}
            title="Semantic Architecture"
            description="Uses genuine semantic HTML tags instead of nested div soup. Easily integrates into existing design systems."
          />
          <${cardUsage.componentTag}
            title="Fluid Responsiveness"
            description="Built with CSS Grid and Flexbox with adaptive mobile, tablet, and desktop breakpoints."
          />
          <${cardUsage.componentTag}
            title="axe-core Verified"
            description="Automatically validated against WCAG 2.1 AA accessibility standards with zero synthetic scores."
          />
        </div>
      </div>
    </section>
  );` : `
  return (
    <section id="features" className="features-section">
      <div className="container">
        <h2 id="features-heading" className="section-title">Capabilities</h2>
        <div className="features-grid">
          <${cardUsage.componentTag} title="Semantic Architecture" description="Real tags, no div soup." />
          <${cardUsage.componentTag} title="Fluid Responsiveness" description="Clean responsive layout." />
        </div>
      </div>
    </section>
  );`}
};
`;

  files.push({
    filePath: `src/components/FeatureGrid.${ext}`,
    fileContent: gridContent,
    fileType: 'component'
  });

  // 6. Footer component
  const footerContent = `import React from 'react';

export const Footer = () => {
  ${styling === 'tailwind' ? `
  return (
    <footer className="border-t border-slate-200 py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} Acme Studio. All rights reserved.</p>
        <div className="flex gap-6 text-sm text-slate-500">
          <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-blue-600 transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );` : `
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <p className="footer-copy">© {new Date().getFullYear()} Acme Studio. All rights reserved.</p>
      </div>
    </footer>
  );`}
};
`;

  files.push({
    filePath: `src/components/Footer.${ext}`,
    fileContent: footerContent,
    fileType: 'component'
  });

  // 7. App component
  const appContent = `import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureGrid } from './components/FeatureGrid';
import { Footer } from './components/Footer';

export const App = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main id="main-content" className="flex-1">
        <Hero />
        <FeatureGrid />
      </main>
      <Footer />
    </div>
  );
};

export default App;
`;

  files.push({
    filePath: `src/App.${ext}`,
    fileContent: appContent,
    fileType: 'component'
  });

  // 8. Styling config
  if (styling === 'tailwind') {
    files.push({
      filePath: 'tailwind.config.js',
      fileContent: generateTailwindConfig(tokens),
      fileType: 'config'
    });
    files.push({
      filePath: 'src/index.css',
      fileContent: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
      fileType: 'style'
    });
  }

  return files;
}

module.exports = {
  generateReact
};
