/**
 * server/services/qa/accessibility.js
 * Deterministic automated accessibility checks.
 * Note: Clearly labeled as automated baseline checks, not full manual WCAG compliance.
 */

function analyzeAccessibility(html) {
  const checks = [];

  // 1. Form Labels & Input Names
  const inputRegex = /<input\b([^>]*)>/gi;
  let inputMatch;
  let totalInputs = 0;
  let unlabelledInputs = 0;

  while ((inputMatch = inputRegex.exec(html)) !== null) {
    const attrs = inputMatch[1];
    const typeMatch = attrs.match(/\btype\s*=\s*(["'])(.*?)\1/i);
    const type = typeMatch ? typeMatch[2].toLowerCase() : 'text';

    // Ignore hidden, submit, button, reset inputs
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) {
      continue;
    }

    totalInputs++;
    const hasAriaLabel = /aria-label\s*=\s*(["'])(.*?)\1/i.test(attrs);
    const hasAriaLabelledBy = /aria-labelledby/i.test(attrs);
    const hasTitle = /title\s*=\s*(["'])(.*?)\1/i.test(attrs);
    const idMatch = attrs.match(/\bid\s*=\s*(["'])(.*?)\1/i);

    let hasExplicitLabel = false;
    if (idMatch) {
      const id = idMatch[2];
      const labelForRegex = new RegExp(`<label\\b[^>]*\\bfor=["']${id}["']`, 'i');
      hasExplicitLabel = labelForRegex.test(html);
    }

    if (!hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasExplicitLabel) {
      unlabelledInputs++;
    }
  }

  if (totalInputs === 0) {
    checks.push({
      id: 'a11y-forms',
      name: 'Form Input Labels',
      severity: 'PASS',
      detectedValue: 'No interactive form inputs on page',
      whyItMatters: 'Form controls must have accessible names so screen readers announce their purpose.',
      message: 'No interactive form inputs were detected.',
      fix: null
    });
  } else if (unlabelledInputs === 0) {
    checks.push({
      id: 'a11y-forms',
      name: 'Form Input Labels',
      severity: 'PASS',
      detectedValue: `All ${totalInputs} input(s) have associated labels or aria-labels`,
      whyItMatters: 'Accessible form labels ensure screen reader users understand what data to enter.',
      message: 'All form fields have associated labels or aria-labels.',
      fix: null
    });
  } else {
    checks.push({
      id: 'a11y-forms',
      name: 'Missing Form Input Labels',
      severity: 'ERROR',
      detectedValue: `${unlabelledInputs} of ${totalInputs} input(s) lack labels`,
      whyItMatters: 'Inputs without labels cannot be announced meaningfully by assistive software.',
      message: `Found ${unlabelledInputs} input field(s) without an associated <label for="...">, aria-label, or title.`,
      fix: 'Associate inputs with <label for="inputId"> or provide an aria-label attribute.'
    });
  }

  // 2. Iframe Titles
  const iframeRegex = /<iframe\b([^>]*)>/gi;
  let iframeMatch;
  let totalIframes = 0;
  let untitledIframes = 0;

  while ((iframeMatch = iframeRegex.exec(html)) !== null) {
    totalIframes++;
    const attrs = iframeMatch[1];
    const titleMatch = attrs.match(/\btitle\s*=\s*(["'])(.*?)\1/i);
    const ariaLabelMatch = attrs.match(/\baria-label\s*=\s*(["'])(.*?)\1/i);
    if ((!titleMatch || !titleMatch[2].trim()) && (!ariaLabelMatch || !ariaLabelMatch[2].trim())) {
      untitledIframes++;
    }
  }

  if (totalIframes > 0) {
    if (untitledIframes === 0) {
      checks.push({
        id: 'a11y-iframe-title',
        name: 'Iframe Accessible Titles',
        severity: 'PASS',
        detectedValue: `All ${totalIframes} iframe(s) have title attributes`,
        whyItMatters: 'Screen readers read iframe title attributes so users know the embedded frame content.',
        message: 'All <iframe> elements provide descriptive title attributes.',
        fix: null
      });
    } else {
      checks.push({
        id: 'a11y-iframe-title',
        name: 'Missing Iframe Titles',
        severity: 'ERROR',
        detectedValue: `${untitledIframes} of ${totalIframes} iframe(s) missing title`,
        whyItMatters: 'Screen readers cannot identify the purpose of embedded frames without a title.',
        message: `Found ${untitledIframes} <iframe> element(s) without a title or aria-label attribute.`,
        fix: 'Add title="Description of embedded content" to all <iframe> tags.'
      });
    }
  }

  // 3. Positive Tabindex Detection (tabindex > 0)
  const tabindexRegex = /\btabindex\s*=\s*(["']?)(-?\d+)\1/gi;
  let tabMatch;
  let positiveTabindexCount = 0;

  while ((tabMatch = tabindexRegex.exec(html)) !== null) {
    const val = parseInt(tabMatch[2], 10);
    if (val > 0) {
      positiveTabindexCount++;
    }
  }

  if (positiveTabindexCount === 0) {
    checks.push({
      id: 'a11y-tabindex',
      name: 'Logical Tab Navigation Order',
      severity: 'PASS',
      detectedValue: '0 positive tabindex attributes',
      whyItMatters: 'Avoids disrupting the natural reading/keyboard navigation sequence of the document.',
      message: 'No positive tabindex attributes detected (preserves natural DOM tab order).',
      fix: null
    });
  } else {
    checks.push({
      id: 'a11y-tabindex',
      name: 'Positive Tabindex Attributes',
      severity: 'WARNING',
      detectedValue: `${positiveTabindexCount} positive tabindex value(s)`,
      whyItMatters: 'Positive tabindex values override natural focus order and cause confusing keyboard navigation.',
      message: `Found ${positiveTabindexCount} element(s) with positive tabindex (e.g. tabindex="1").`,
      fix: 'Use tabindex="0" to insert elements into the natural order or "-1" for programmatic focus.'
    });
  }

  // 4. ARIA Attributes Check
  const ariaRegex = /\b(aria-[a-z]+|role)\s*=\s*(["'])(.*?)\2/gi;
  let ariaMatch;
  let ariaUsageCount = 0;

  while ((ariaMatch = ariaRegex.exec(html)) !== null) {
    ariaUsageCount++;
  }

  checks.push({
    id: 'a11y-aria-presence',
    name: 'ARIA Roles & Attributes',
    severity: 'INFO',
    detectedValue: `${ariaUsageCount} ARIA attribute/role declaration(s)`,
    whyItMatters: 'Accessible Rich Internet Applications (ARIA) bridges semantic gaps in complex UI controls.',
    message: `Detected ${ariaUsageCount} ARIA attribute(s) or role definition(s).`,
    fix: null
  });

  return {
    summary: {
      totalInputs,
      unlabelledInputs,
      totalIframes,
      untitledIframes,
      positiveTabindexCount,
      ariaUsageCount
    },
    checks
  };
}

module.exports = {
  analyzeAccessibility
};
