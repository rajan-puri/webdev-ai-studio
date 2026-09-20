/**
 * server/services/design-to-code/generator/generator-engine.js
 * Master Multi-Stack Code Generation Dispatcher.
 */

const { generateHtmlScss } = require('./html-scss-generator');
const { generateReact } = require('./react-generator');
const { generateNextJs } = require('./nextjs-generator');
const { generateVue } = require('./vue-generator');
const { generateSvelte } = require('./svelte-generator');
const { generateWordPress } = require('./wordpress-generator');
const { inspectCodeQuality } = require('../quality-engine');

const STACK_PRESETS = {
  'html-scss': { framework: 'html', styling: 'scss', language: 'javascript', label: 'HTML + SCSS' },
  'react-scss': { framework: 'react', styling: 'scss', language: 'javascript', label: 'React + SCSS' },
  'react-tailwind': { framework: 'react', styling: 'tailwind', language: 'javascript', label: 'React + Tailwind' },
  'nextjs-tailwind': { framework: 'nextjs', styling: 'tailwind', language: 'typescript', label: 'Next.js + Tailwind' },
  'vue-scss': { framework: 'vue', styling: 'scss', language: 'javascript', label: 'Vue + SCSS' },
  'svelte-css': { framework: 'svelte', styling: 'css', language: 'javascript', label: 'Svelte + CSS' },
  'html-uikit': { framework: 'html', styling: 'uikit', language: 'javascript', label: 'HTML + UIkit' },
  'html-bootstrap': { framework: 'html', styling: 'bootstrap', language: 'javascript', label: 'HTML + Bootstrap' },
  'wordpress': { framework: 'wordpress', styling: 'scss', language: 'php', label: 'WordPress + SCSS' }
};

function generateCodeForStack(ir, userOptions = {}) {
  let framework = (userOptions.framework || 'html').toLowerCase();
  let styling = (userOptions.styling || 'scss').toLowerCase();
  let language = (userOptions.language || 'javascript').toLowerCase();

  // If preset selected, apply preset config
  if (userOptions.preset && STACK_PRESETS[userOptions.preset]) {
    const p = STACK_PRESETS[userOptions.preset];
    framework = p.framework;
    styling = p.styling;
    language = p.language;
  }

  const options = {
    ...userOptions,
    framework,
    styling,
    language,
    projectRules: userOptions.projectRules || {}
  };

  let files = [];

  switch (framework) {
    case 'html':
      files = generateHtmlScss(ir, options);
      break;
    case 'react':
      files = generateReact(ir, options);
      break;
    case 'nextjs':
    case 'next':
      files = generateNextJs(ir, options);
      break;
    case 'vue':
      files = generateVue(ir, options);
      break;
    case 'svelte':
      files = generateSvelte(ir, options);
      break;
    case 'wordpress':
      files = generateWordPress(ir, options);
      break;
    default:
      files = generateHtmlScss(ir, options);
      break;
  }

  const normalizedFiles = files.map(f => ({
    ...f,
    path: f.filePath || f.path,
    filePath: f.filePath || f.path,
    content: f.fileContent || f.content,
    fileContent: f.fileContent || f.content
  }));

  // Inspect generated code for quality, accessibility, and responsiveness
  const qualityReport = inspectCodeQuality(normalizedFiles, framework, styling);

  return {
    success: true,
    framework,
    styling,
    language,
    files: normalizedFiles,
    qualityReport,
    generatedAt: new Date().toISOString(),
    generatorMetadata: {
      provider: 'design-code-engine',
      model: 'v1.2-deterministic',
      totalFiles: normalizedFiles.length
    }
  };
}

function buildPreviewHtml(files = [], framework = 'html') {
  const htmlFile = files.find(f => (f.path || f.filePath || '').endsWith('.html'));
  const cssFiles = files.filter(f => (f.path || f.filePath || '').endsWith('.css') || (f.path || f.filePath || '').endsWith('.scss'));
  const jsFiles = files.filter(f => (f.path || f.filePath || '').endsWith('.js') && !(f.path || f.filePath || '').includes('config'));

  if (htmlFile) {
    let content = htmlFile.content || htmlFile.fileContent || '';
    const styles = cssFiles.map(c => `<style>${c.content || c.fileContent}</style>`).join('\n');
    const scripts = jsFiles.map(j => `<script>${j.content || j.fileContent}</script>`).join('\n');
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${styles}\n</head>`);
    } else {
      content = `${styles}\n${content}`;
    }
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${scripts}\n</body>`);
    } else {
      content = `${content}\n${scripts}`;
    }
    return content;
  }

  // If component framework (React, Vue, Svelte, Next.js)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${cssFiles.map(c => c.content || c.fileContent).join('\n')}
  </style>
</head>
<body class="bg-white text-slate-900">
  <div id="root">
    ${files.map(f => f.content || f.fileContent).join('\n')}
  </div>
</body>
</html>`;
}

module.exports = {
  STACK_PRESETS,
  generateCodeForStack,
  generateCode: generateCodeForStack,
  buildPreviewHtml
};
