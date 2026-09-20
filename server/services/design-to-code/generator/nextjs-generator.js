/**
 * server/services/design-to-code/generator/nextjs-generator.js
 * Generates Next.js App Router architecture with Tailwind CSS or SCSS.
 */

const { generateReact } = require('./react-generator');
const { generateTailwindConfig } = require('./framework-mapper');

function generateNextJs(ir, options = {}) {
  const isTs = options.language === 'typescript';
  const ext = isTs ? 'tsx' : 'jsx';
  const tokens = ir.tokens || {};

  // Reuse modular React components for /components
  const reactFiles = generateReact(ir, { ...options, framework: 'react' });

  const files = [];

  // Filter and relocate React components into Next.js components/
  reactFiles.forEach(f => {
    if (f.filePath.startsWith('src/components/')) {
      files.push({
        filePath: f.filePath.replace('src/components/', 'components/'),
        fileContent: f.fileContent,
        fileType: f.fileType
      });
    }
  });

  // 1. app/layout.jsx
  const layoutContent = isTs
    ? `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acme Studio - Design to Code',
  description: 'Generated production-ready Next.js application.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
`
    : `import './globals.css';

export const metadata = {
  title: 'Acme Studio - Design to Code',
  description: 'Generated production-ready Next.js application.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
`;

  files.push({
    filePath: `app/layout.${ext}`,
    fileContent: layoutContent,
    fileType: 'component'
  });

  // 2. app/page.jsx
  const pageContent = `import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Hero />
        <FeatureGrid />
      </main>
      <Footer />
    </>
  );
}
`;

  files.push({
    filePath: `app/page.${ext}`,
    fileContent: pageContent,
    fileType: 'component'
  });

  // 3. app/globals.css
  files.push({
    filePath: 'app/globals.css',
    fileContent: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    fileType: 'style'
  });

  // 4. tailwind.config.js
  files.push({
    filePath: 'tailwind.config.js',
    fileContent: generateTailwindConfig(tokens),
    fileType: 'config'
  });

  return files;
}

module.exports = {
  generateNextJs
};
