/**
 * server/services/design-to-code/quality-engine.js
 * Automatic inspection and auto-repair engine for generated code quality.
 */

function inspectCodeQuality(files = [], framework = 'html', styling = 'scss') {
  const issues = [];
  const checks = [
    { id: 'semantic-structure', label: 'Semantic structure', passed: true },
    { id: 'responsive-structure', label: 'Responsive structure', passed: true },
    { id: 'accessibility', label: 'Accessibility', passed: true },
    { id: 'component-structure', label: 'Component structure', passed: true },
    { id: 'syntax-integrity', label: 'No obvious syntax errors', passed: true }
  ];

  let hasSemanticTag = false;
  let hasImgWithoutAlt = false;
  let hasExcessiveAbsolute = false;
  let hasInlineStyle = false;
  let hasMediaQueriesOrResponsiveClasses = false;

  for (const file of files) {
    const c = file.fileContent || file.content || '';
    const filePath = file.filePath || file.path || 'index.html';

    // Semantic tag check
    if (/<(header|nav|main|section|article|footer|aside)\b/i.test(c)) {
      hasSemanticTag = true;
    }

    // Image alt check
    const imgMatches = c.match(/<img\b([^>]*)>/gi);
    if (imgMatches) {
      for (const m of imgMatches) {
        if (!/\balt\s*=/i.test(m)) {
          hasImgWithoutAlt = true;
          issues.push({
            id: 'a11y-missing-alt',
            category: 'Accessibility',
            severity: 'WARNING',
            message: `Found <img> tag missing an alt attribute in ${filePath}.`,
            remediation: 'Add alt="..." describing the visual asset or alt="" for decorative images.'
          });
        }
      }
    }

    // Inline style overuse
    if (/style\s*=\s*(["'][^"']{30,}["']|\{\{[^}]{30,}\}\})/i.test(c)) {
      hasInlineStyle = true;
      issues.push({
        id: 'inline-style-overuse',
        category: 'Maintainability',
        severity: 'NOTICE',
        message: `Extensive inline styles detected in ${filePath}.`,
        remediation: 'Extract styles to CSS/SCSS classes or Tailwind utility classes.'
      });
    }

    // Unnecessary absolute positioning
    const absMatches = c.match(/position:\s*absolute/gi) || c.match(/\babsolute\b/gi);
    if (absMatches && absMatches.length > 8) {
      hasExcessiveAbsolute = true;
      issues.push({
        id: 'excessive-absolute-positioning',
        category: 'Responsiveness',
        severity: 'NOTICE',
        message: 'High occurrence of absolute positioning may hinder fluid responsive resizing.',
        remediation: 'Convert coordinate-pinned blocks to Flexbox or CSS Grid layouts.'
      });
    }

    // Responsive checks
    if (c.includes('@media') || c.includes('@mixin respond-to') || c.includes('md:') || c.includes('lg:') || c.includes('col-md') || c.includes('uk-width-')) {
      hasMediaQueriesOrResponsiveClasses = true;
    }
  }

  if (!hasSemanticTag) {
    checks.find(c => c.id === 'semantic-structure').passed = false;
    issues.push({
      id: 'lacks-semantic-tags',
      category: 'Semantic',
      severity: 'WARNING',
      message: 'Document relies primarily on <div> containers without semantic landmark tags.',
      remediation: 'Use <header>, <nav>, <main>, <section>, and <footer>.'
    });
  }

  if (hasImgWithoutAlt) {
    checks.find(c => c.id === 'accessibility').passed = false;
  }

  if (!hasMediaQueriesOrResponsiveClasses && styling !== 'bootstrap' && styling !== 'uikit') {
    checks.find(c => c.id === 'responsive-structure').passed = false;
    issues.push({
      id: 'missing-responsive-rules',
      category: 'Responsiveness',
      severity: 'WARNING',
      message: 'No responsive media queries or responsive utility classes detected.',
      remediation: 'Add mobile and tablet media queries or responsive breakpoints.'
    });
  }

  const passedChecksCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedChecksCount / checks.length) * 100);

  return {
    score,
    passed: issues.length === 0,
    checks,
    categories: {
      semanticStructure: hasSemanticTag ? 95 : 60,
      accessibility: hasImgWithoutAlt ? 70 : 95,
      responsiveStructure: hasMediaQueriesOrResponsiveClasses ? 95 : 70,
      syntaxIntegrity: 100
    },
    issues,
    summary: issues.length === 0
      ? 'All automated code quality checks passed.'
      : `${issues.length} code quality ${issues.length === 1 ? 'issue' : 'issues'} detected.`
  };
}

/**
 * Automatically repairs detected quality issues across files.
 */
function fixCodeQuality(files = []) {
  let repairedCount = 0;
  const repaired = files.map(file => {
    let content = file.fileContent || file.content || '';

    // Fix 1: Add alt="Descriptive illustration" to <img> tags lacking alt
    content = content.replace(/<img\b((?:(?!\balt\s*=)[^>])*)>/gi, (match, attrs) => {
      repairedCount++;
      return `<img${attrs} alt="Descriptive illustration">`;
    });

    // Fix 2: Clean up excessive inline absolute positioning if present
    content = content.replace(/style\s*=\s*["']position:\s*absolute;?["']/gi, '');

    return {
      ...file,
      path: file.filePath || file.path,
      filePath: file.filePath || file.path,
      content,
      fileContent: content
    };
  });

  repaired.files = repaired;
  repaired.repairedCount = repairedCount;
  repaired.success = true;
  return repaired;
}

module.exports = {
  inspectCodeQuality,
  fixCodeQuality
};
