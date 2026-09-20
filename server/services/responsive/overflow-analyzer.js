/**
 * server/services/responsive/overflow-analyzer.js
 * Analyzes HTML/CSS structure and measurements for horizontal overflows,
 * fixed-width elements, unresponsive images, wide tables, and content clipping.
 */

function analyzeOverflows(html = '', activeViewportWidth = 375) {
  const issues = [];
  const warnings = [];

  // 1. Detect inline fixed-width elements larger than active viewport
  const inlineWidthRegex = /(?:<([a-z0-9-]+)[^>]*\sstyle=["'][^"']*width:\s*([0-9]+)px[^"']*["'][^>]*>)/gi;
  let match;
  let fixedCount = 0;

  while ((match = inlineWidthRegex.exec(html)) !== null && fixedCount < 15) {
    const tagName = match[1].toLowerCase();
    const widthPx = parseInt(match[2], 10);

    if (widthPx > activeViewportWidth) {
      fixedCount++;
      const snippet = match[0].substring(0, 100);
      const idMatch = snippet.match(/id=["']([^"']+)["']/i);
      const classMatch = snippet.match(/class=["']([^"']+)["']/i);
      let selector = tagName;
      if (idMatch) selector = `#${idMatch[1]}`;
      else if (classMatch) selector = `.${classMatch[1].split(' ')[0]}`;

      issues.push({
        severity: widthPx > activeViewportWidth + 100 ? 'Critical' : 'High',
        issue: 'Element with Fixed Width Exceeding Viewport',
        viewport: `${activeViewportWidth}px`,
        element: selector,
        actual: `width: ${widthPx}px`,
        expected: `width <= ${activeViewportWidth}px (or width: 100% / max-width: 100%)`,
        whyItMatters: 'Elements with fixed pixel widths force the document body to stretch, causing horizontal scrolling and clipped UI on mobile screens.',
        howToFix: `Replace "width: ${widthPx}px" with "max-width: 100%" or use responsive CSS units (%, rem, vw).`
      });
    }
  }

  // 2. Detect unconstrained large images (width attributes > viewport without responsive styles)
  const imgRegex = /<img[^>]+(?:width=["']([0-9]+)["']|style=["'][^"']*width:\s*([0-9]+)px[^"']*["'])[^>]*>/gi;
  let imgMatch;
  let imgIssueCount = 0;

  while ((imgMatch = imgRegex.exec(html)) !== null && imgIssueCount < 10) {
    const rawTag = imgMatch[0];
    const widthVal = parseInt(imgMatch[1] || imgMatch[2], 10);

    if (widthVal > activeViewportWidth) {
      // Check if tag has responsive styles like max-width: 100% or class indicating responsiveness
      const hasResponsiveStyle = /max-width:\s*(?:100%|100vw)/i.test(rawTag) || 
                                 /class=["'][^"']*(?:img-fluid|responsive|w-full)[^"']*["']/i.test(rawTag);

      if (!hasResponsiveStyle) {
        imgIssueCount++;
        const srcMatch = rawTag.match(/src=["']([^"']+)["']/i);
        const src = srcMatch ? srcMatch[1] : 'image';

        issues.push({
          severity: 'High',
          issue: 'Large Image Missing Responsive Constraint',
          viewport: `${activeViewportWidth}px`,
          element: `img[src*="${src.split('/').pop().substring(0, 30)}"]`,
          actual: `width: ${widthVal}px`,
          expected: 'max-width: 100%; height: auto;',
          whyItMatters: 'Images with hardcoded pixel widths wider than the viewport bleed offscreen, breaking the mobile layout.',
          howToFix: 'Add "max-width: 100%; height: auto;" to your global image CSS.'
        });
      }
    }
  }

  // 3. Unwrapped Data Tables
  const tableRegex = /<table[^>]*>/gi;
  let tableMatch;
  let tableCount = 0;

  while ((tableMatch = tableRegex.exec(html)) !== null && tableCount < 5) {
    tableCount++;
    const tableTag = tableMatch[0];
    const index = tableMatch.index;
    const surrounding = html.substring(Math.max(0, index - 200), index);
    const hasScrollWrapper = /overflow(?:-x)?\s*:\s*auto/i.test(surrounding) || 
                             /class=["'][^"']*(?:table-responsive|table-wrapper|scroll-wrapper)[^"']*["']/i.test(surrounding);

    if (!hasScrollWrapper && activeViewportWidth < 600) {
      warnings.push({
        severity: 'Medium',
        issue: 'Data Table Without Overflow Scroll Container',
        viewport: `${activeViewportWidth}px`,
        element: 'table',
        actual: 'Direct uncontained table element',
        expected: 'Container with overflow-x: auto',
        whyItMatters: 'Tables with multiple columns cannot fit on narrow mobile screens (320px–414px) and will stretch the screen horizontally.',
        howToFix: 'Wrap <table> inside a container with "overflow-x: auto; -webkit-overflow-scrolling: touch;".'
      });
    }
  }

  // 4. Content Clipping: overflow-x: hidden on body masking overflows
  const bodyOverflowHidden = /(?:body|html)[^{]*\{[^}]*overflow-x:\s*hidden/i.test(html);
  if (bodyOverflowHidden) {
    warnings.push({
      severity: 'Low',
      issue: 'Horizontal Overflow Masked by "overflow-x: hidden"',
      viewport: `${activeViewportWidth}px`,
      element: 'html / body',
      actual: 'overflow-x: hidden',
      expected: 'Clean element bounds without overflow masking',
      whyItMatters: 'Applying overflow-x: hidden to body often hides elements extending beyond the screen, but can cause sticky positioning issues and accessibility scrolling glitches.',
      howToFix: 'Find and fix the specific child element exceeding viewport width instead of clipping the root document.'
    });
  }

  // 5. Preformatted code blocks without wrap or scroll
  const preWithoutWrap = /<pre[^>]*style=["'][^"']*(?!overflow)[^"']*["'][^>]*>/i.test(html);
  if (preWithoutWrap && activeViewportWidth < 500) {
    warnings.push({
      severity: 'Low',
      issue: 'Code Block Without Horizontal Scrolling',
      viewport: `${activeViewportWidth}px`,
      element: 'pre',
      actual: 'Unwrapped code block',
      expected: 'overflow-x: auto; or white-space: pre-wrap;',
      whyItMatters: 'Long lines of code or preformatted text will stretch the mobile viewport.',
      howToFix: 'Apply "overflow-x: auto; white-space: pre-wrap;" to <pre> and <code> blocks.'
    });
  }

  return {
    activeViewportWidth,
    totalIssues: issues.length + warnings.length,
    criticalCount: issues.filter(i => i.severity === 'Critical').length,
    highCount: issues.filter(i => i.severity === 'High').length,
    mediumCount: warnings.filter(i => i.severity === 'Medium').length,
    lowCount: warnings.filter(i => i.severity === 'Low').length,
    issues: [...issues, ...warnings]
  };
}

module.exports = {
  analyzeOverflows
};
