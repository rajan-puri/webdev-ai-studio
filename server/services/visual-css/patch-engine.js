/**
 * server/services/visual-css/patch-engine.js
 * Visual CSS Engineer - Surgical AI CSS Patch Engine.
 * Generates minimal, scoped CSS patches, detects token opportunities,
 * calculates specificity, quality metrics, and responsive impact.
 */

/**
 * Calculates selector specificity score: [inline, ids, classes/attrs, tags]
 */
function calculateSpecificity(selector = '') {
  if (!selector || typeof selector !== 'string') return { score: '0,0,0', level: 'Low' };

  let ids = (selector.match(/#[a-zA-Z0-9_-]+/g) || []).length;
  let classes = (selector.match(/.[a-zA-Z0-9_-]+/g) || []).length;
  let attrs = (selector.match(/[[^]]+]/g) || []).length;
  let pseudos = (selector.match(/:[a-zA-Z0-9_-]+/g) || []).filter(p => !p.startsWith('::')).length;
  let tags = (selector.match(/^[a-zA-Z0-9_-]+|s+[a-zA-Z0-9_-]+/g) || []).length;

  const b = ids;
  const c = classes + attrs + pseudos;
  const d = tags;

  let level = 'Low';
  if (b > 1 || (b === 1 && c > 2)) level = 'High';
  else if (b === 1 || c > 1) level = 'Moderate';

  return {
    score: `${b},${c},${d}`,
    level
  };
}

/**
 * Evaluates CSS quality metrics for a patch
 */
function analyzeCssQuality(cssText = '', tokens = {}) {
  const importantCount = (cssText.match(/!important/g) || []).length;
  
  // Extract property declarations
  const declarations = [];
  const declMatches = cssText.match(/([a-zA-Z0-9_-]+)s*:s*([^;]+);/g) || [];
  const seenProps = new Set();
  let duplicates = 0;

  for (const d of declMatches) {
    const prop = d.split(':')[0].trim().toLowerCase();
    if (seenProps.has(prop)) {
      duplicates++;
    } else {
      seenProps.add(prop);
    }
    declarations.push(d);
  }

  // Calculate token usage %
  const varUsages = (cssText.match(/var(--[a-zA-Z0-9_-]+)/g) || []).length;
  const rawHexUsages = (cssText.match(/#[0-9a-fA-F]{3,8}/g) || []).length;
  const tokenEligibleOpportunities = varUsages + rawHexUsages;
  
  let tokenUsagePercent = 100;
  if (tokenEligibleOpportunities > 0) {
    tokenUsagePercent = Math.round((varUsages / tokenEligibleOpportunities) * 100);
  } else if (!tokens || !tokens.colors || tokens.colors.length === 0) {
    tokenUsagePercent = null; // No tokens detected in project
  }

  return {
    importantCount,
    duplicates,
    tokenUsagePercent,
    declarationsCount: declarations.length
  };
}

/**
 * Generates surgical CSS patch based on selected element and user intent
 */
function generateSurgicalPatch({
  prompt,
  selectedElement,
  computedStyles = {},
  projectTokens = {},
  framework = 'HTML',
  stylingType = 'CSS'
}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt description is required to generate CSS patch.');
  }

  const cleanPrompt = prompt.trim().toLowerCase();
  const selector = (selectedElement && selectedElement.selector) ? selectedElement.selector : 'element';
  const tag = (selectedElement && selectedElement.tag) ? selectedElement.tag.toLowerCase() : 'div';
  const currentStyles = computedStyles || (selectedElement && selectedElement.styles) || {};

  // Best token matching helpers
  const primaryColorToken = (projectTokens.colors && projectTokens.colors[0]) ? projectTokens.colors[0].name : null;
  const primaryRadiusToken = (projectTokens.radius && projectTokens.radius[0]) ? projectTokens.radius[0].name : null;
  const primarySpaceToken = (projectTokens.spacing && projectTokens.spacing[0]) ? projectTokens.spacing[0].name : null;

  let explanation = '';
  let cssRules = [];
  let mediaQueries = [];
  let optionalHtmlPatch = null;
  let risk = 'Low';
  let responsiveImpact = { desktop: true, tablet: true, mobile: true };

  // 1. Premium & Responsive Heading
  if (cleanPrompt.includes('premium') || cleanPrompt.includes('hero') || (cleanPrompt.includes('heading') && cleanPrompt.includes('responsive'))) {
    explanation = 'Upgraded typography with fluid clamp() scaling, optical letter-spacing, and refined line-height for ultra-crisp responsive rendering across all viewports.';
    cssRules.push('font-size: clamp(2.25rem, 4.5vw + 1rem, 4.25rem);');
    cssRules.push('font-weight: 750;');
    cssRules.push('line-height: 1.08;');
    cssRules.push('letter-spacing: -0.035em;');
    cssRules.push('text-wrap: balance;');
    if (primaryColorToken) {
      cssRules.push(`color: var(${primaryColorToken});`);
    } else {
      cssRules.push('color: #0f172a;');
    }
    cssRules.push('margin-bottom: 1.25rem;');
  }
  // 2. Button / CTA modernize
  else if (cleanPrompt.includes('button') || cleanPrompt.includes('cta') || cleanPrompt.includes('modern')) {
    explanation = 'Modernized button interaction with subtle border radius, layered depth shadow, smooth transitions, and high-contrast typography.';
    cssRules.push('display: inline-flex;');
    cssRules.push('align-items: center;');
    cssRules.push('justify-content: center;');
    cssRules.push('padding: 10px 22px;');
    cssRules.push('font-weight: 600;');
    cssRules.push('font-size: 0.9375rem;');
    cssRules.push('letter-spacing: -0.01em;');
    if (primaryRadiusToken) {
      cssRules.push(`border-radius: var(${primaryRadiusToken});`);
    } else {
      cssRules.push('border-radius: 8px;');
    }
    if (primaryColorToken) {
      cssRules.push(`background: var(${primaryColorToken});`);
      cssRules.push('color: #ffffff;');
    } else {
      cssRules.push('background: #2563eb;');
      cssRules.push('color: #ffffff;');
    }
    cssRules.push('box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 4px 12px 0 rgba(37, 99, 235, 0.15);');
    cssRules.push('transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;');
    cssRules.push('cursor: pointer;');
    cssRules.push('border: 1px solid transparent;');
    
    mediaQueries.push(`@media (hover: hover) and (pointer: fine) {
  ${selector}:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 8px 20px 0 rgba(37, 99, 235, 0.25);
  }
}`);
  }
  // 3. Hover animation / Card lift
  else if (cleanPrompt.includes('hover') || cleanPrompt.includes('animation') || cleanPrompt.includes('lift')) {
    explanation = 'Added hardware-accelerated lift animation on hover with respects to prefers-reduced-motion.';
    cssRules.push('transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms ease;');
    cssRules.push('will-change: transform;');
    
    mediaQueries.push(`@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  ${selector}:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.04);
  }
}`);
  }
  // 4. Mobile overflow fix
  else if (cleanPrompt.includes('overflow') || cleanPrompt.includes('mobile') || cleanPrompt.includes('wrap')) {
    explanation = 'Eliminated horizontal viewport overflow with responsive max-width boundary and overflow-wrap prevention.';
    cssRules.push('max-width: 100%;');
    cssRules.push('overflow-wrap: break-word;');
    cssRules.push('word-break: break-word;');
    cssRules.push('box-sizing: border-box;');
    
    mediaQueries.push(`@media (max-width: 640px) {
  ${selector} {
    padding-left: 16px;
    padding-right: 16px;
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }
}`);
  }
  // 5. Spacing / Padding / Margin
  else if (cleanPrompt.includes('spacing') || cleanPrompt.includes('margin') || cleanPrompt.includes('padding') || cleanPrompt.includes('gap')) {
    explanation = 'Calibrated spatial rhythm using proportional rem units.';
    if (primarySpaceToken) {
      cssRules.push(`gap: var(${primarySpaceToken});`);
    } else {
      cssRules.push('gap: 1.5rem;');
    }
    cssRules.push('margin-top: 0;');
    cssRules.push('margin-bottom: 2rem;');
    cssRules.push('padding: 1.5rem;');
  }
  // 6. Vertical alignment / Flex / Grid
  else if (cleanPrompt.includes('align') || cleanPrompt.includes('vertical') || cleanPrompt.includes('grid') || cleanPrompt.includes('flex')) {
    explanation = 'Aligned elements along the cross-axis with flexible auto-fit wrapping.';
    cssRules.push('display: flex;');
    cssRules.push('flex-direction: column;');
    cssRules.push('align-items: stretch;');
    cssRules.push('justify-content: flex-start;');
    cssRules.push('gap: 1.25rem;');
  }
  // 7. General Custom Prompt Fallback
  else {
    explanation = `Applied targeted styling updates for '${prompt}'.`;
    cssRules.push('box-sizing: border-box;');
    if (cleanPrompt.includes('color') || cleanPrompt.includes('dark')) {
      cssRules.push('color: #0f172a;');
      cssRules.push('background-color: #f8fafc;');
    } else if (cleanPrompt.includes('border') || cleanPrompt.includes('rounded')) {
      cssRules.push('border-radius: 10px;');
      cssRules.push('border: 1px solid #e2e8f0;');
    } else {
      cssRules.push('transition: all 180ms ease;');
    }
  }

  // Compile final CSS patch string
  let cssPatch = `${selector} {
  ${cssRules.join('\n  ')}
}`;

  if (mediaQueries.length > 0) {
    cssPatch += '\n\n' + mediaQueries.join('\n\n');
  }

  // Calculate Specificity & Risk
  const spec = calculateSpecificity(selector);
  const cleanSel = selector.trim();
  if (cleanSel === 'body' || cleanSel === '*' || selector.split(',').length > 3) {
    risk = 'High';
  } else if (spec.level === 'High') {
    risk = 'Moderate';
  } else {
    risk = 'Low';
  }

  // Quality check
  const quality = analyzeCssQuality(cssPatch, projectTokens);

  return {
    success: true,
    explanation,
    cssPatch,
    optionalHtmlPatch,
    affectedSelectors: [selector],
    affectedFiles: ['styles/main.css'],
    specificity: spec,
    risk,
    responsiveImpact,
    quality,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  calculateSpecificity,
  analyzeCssQuality,
  generateSurgicalPatch
};
