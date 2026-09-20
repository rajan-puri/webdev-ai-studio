/**
 * server/services/qa/html.js
 * Analyzes HTML document structure, DOCTYPE, charset, landmarks, tags, and DOM health.
 */

function analyzeHtml(html, finalUrl) {
  const checks = [];
  const htmlSize = Buffer.byteLength(html, 'utf8');

  // 1. DOCTYPE Check
  const hasDoctype = /<!doctype\s+html/i.test(html);
  if (hasDoctype) {
    checks.push({
      id: 'html-doctype',
      name: 'HTML5 DOCTYPE Declaration',
      severity: 'PASS',
      detectedValue: '<!DOCTYPE html>',
      whyItMatters: 'Enforces standard rendering mode across all modern browsers and prevents quirks mode.',
      message: 'Valid HTML5 DOCTYPE declaration is present at the beginning of the document.',
      fix: null
    });
  } else {
    checks.push({
      id: 'html-doctype',
      name: 'HTML5 DOCTYPE Declaration',
      severity: 'ERROR',
      detectedValue: 'Missing',
      whyItMatters: 'Browsers may render the page in legacy Quirks Mode, leading to inconsistent CSS/layout.',
      message: 'No <!DOCTYPE html> declaration was found in the document.',
      fix: 'Place <!DOCTYPE html> at the very first line of your HTML document.'
    });
  }

  // 2. Character Encoding (Charset)
  const charsetMatch = html.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i) ||
                       html.match(/<meta[^>]+http-equiv=["']?content-type["']?[^>]+content=["']?[^"'>]*charset=([^"'>\s]+)/i);
  const detectedCharset = charsetMatch ? charsetMatch[1] : null;

  if (detectedCharset && /utf-8/i.test(detectedCharset)) {
    checks.push({
      id: 'html-charset',
      name: 'Character Encoding',
      severity: 'PASS',
      detectedValue: detectedCharset.toUpperCase(),
      whyItMatters: 'UTF-8 ensures international characters, symbols, and emojis render correctly.',
      message: `Standard UTF-8 character encoding declared: "${detectedCharset}".`,
      fix: null
    });
  } else if (detectedCharset) {
    checks.push({
      id: 'html-charset',
      name: 'Character Encoding',
      severity: 'WARNING',
      detectedValue: detectedCharset,
      whyItMatters: 'Non-UTF-8 encodings can cause garbled text or security encoding vulnerabilities.',
      message: `Charset declared as "${detectedCharset}". Standard UTF-8 is recommended.`,
      fix: 'Use <meta charset="utf-8"> within the first 1024 bytes of the <head> tag.'
    });
  } else {
    checks.push({
      id: 'html-charset',
      name: 'Character Encoding',
      severity: 'ERROR',
      detectedValue: 'Missing',
      whyItMatters: 'Without a charset declaration, browsers must guess encoding, risking encoding bugs.',
      message: 'No character encoding declaration was detected in the document <head>.',
      fix: 'Add <meta charset="utf-8"> as one of the first children of the <head> tag.'
    });
  }

  // 3. Lang Attribute on <html>
  const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  const detectedLang = langMatch ? langMatch[1] : null;

  if (detectedLang && detectedLang.trim().length > 0) {
    checks.push({
      id: 'html-lang',
      name: 'HTML Lang Attribute',
      severity: 'PASS',
      detectedValue: detectedLang,
      whyItMatters: 'Helps screen readers select correct pronunciation rules and helps search engines understand page language.',
      message: `Primary document language specified: "${detectedLang}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'html-lang',
      name: 'HTML Lang Attribute',
      severity: 'ERROR',
      detectedValue: 'Missing',
      whyItMatters: 'Screen readers cannot determine the proper language voice synthesizer without a lang attribute.',
      message: 'The <html> tag is missing a "lang" attribute (e.g., lang="en").',
      fix: 'Add a valid BCP 47 language code to the <html> tag, e.g. <html lang="en">.'
    });
  }

  // 4. Viewport Meta Tag
  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']viewport["']/i);
  const detectedViewport = viewportMatch ? viewportMatch[1] : null;

  if (detectedViewport && /width=device-width/i.test(detectedViewport)) {
    checks.push({
      id: 'html-viewport',
      name: 'Responsive Viewport Meta Tag',
      severity: 'PASS',
      detectedValue: detectedViewport,
      whyItMatters: 'Instructs mobile browsers to render the page at the physical device width without desktop downscaling.',
      message: `Viewport tag configured with width=device-width: "${detectedViewport}".`,
      fix: null
    });
  } else if (detectedViewport) {
    checks.push({
      id: 'html-viewport',
      name: 'Responsive Viewport Meta Tag',
      severity: 'WARNING',
      detectedValue: detectedViewport,
      whyItMatters: 'Missing width=device-width can cause mobile rendering inconsistencies.',
      message: `Viewport tag found but lacks standard "width=device-width": "${detectedViewport}".`,
      fix: 'Configure <meta name="viewport" content="width=device-width, initial-scale=1.0">.'
    });
  } else {
    checks.push({
      id: 'html-viewport',
      name: 'Responsive Viewport Meta Tag',
      severity: 'ERROR',
      detectedValue: 'Missing',
      whyItMatters: 'Mobile devices will render the website as a desktop layout and zoom out.',
      message: 'No viewport meta tag was found in the document.',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to your <head>.'
    });
  }

  // 5. Title Tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : null;

  if (titleText && titleText.length > 0) {
    checks.push({
      id: 'html-title',
      name: 'Document Title',
      severity: 'PASS',
      detectedValue: `"${titleText}" (${titleText.length} chars)`,
      whyItMatters: 'Document titles appear in browser tabs, bookmarks, and search engine results.',
      message: `Title present: "${titleText}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'html-title',
      name: 'Document Title',
      severity: 'ERROR',
      detectedValue: 'Missing or empty',
      whyItMatters: 'A missing title disrupts browser identification, bookmarking, and search ranking.',
      message: 'No <title> tag found or title content is empty.',
      fix: 'Add a descriptive <title>Your Page Title</title> inside the <head>.'
    });
  }

  // 6. Meta Tags Inventory
  const metaTags = [];
  const metaRegex = /<meta\b([^>]*?)>/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const rawAttrs = metaMatch[1];
    const nameMatch = rawAttrs.match(/\b(name|property|http-equiv)\s*=\s*(["'])(.*?)\2/i);
    const contentMatch = rawAttrs.match(/\bcontent\s*=\s*(["'])(.*?)\2/i);
    const charsetAttr = rawAttrs.match(/\bcharset\s*=\s*(["'])(.*?)\2/i);

    if (nameMatch && contentMatch) {
      metaTags.push({
        type: nameMatch[1].toLowerCase(),
        key: nameMatch[3],
        content: contentMatch[3]
      });
    } else if (charsetAttr) {
      metaTags.push({
        type: 'charset',
        key: 'charset',
        content: charsetAttr[2]
      });
    }
  }

  // 7. Headings Structure (H1-H6)
  const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const headingList = [];
  const headingRegex = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let hMatch;

  while ((hMatch = headingRegex.exec(html)) !== null) {
    const tag = hMatch[1].toLowerCase();
    const text = hMatch[3].replace(/<[^>]+>/g, '').trim();
    headingCounts[tag]++;
    headingList.push({
      level: tag.toUpperCase(),
      text: text || '(Empty heading text)'
    });
  }

  // Check empty headings
  const emptyHeadings = headingList.filter(h => h.text === '(Empty heading text)');
  if (emptyHeadings.length > 0) {
    checks.push({
      id: 'html-empty-headings',
      name: 'Empty Headings',
      severity: 'WARNING',
      detectedValue: `${emptyHeadings.length} empty heading(s)`,
      whyItMatters: 'Empty heading tags confuse screen readers and disrupt document outlines.',
      message: `Detected ${emptyHeadings.length} heading tag(s) without text content.`,
      fix: 'Remove empty heading tags or provide meaningful descriptive text within them.'
    });
  }

  // 8. Semantic Landmarks (<main>, <nav>, <header>, <footer>, <aside>)
  const landmarks = {
    main: /<main\b/i.test(html) || /role=["']main["']/i.test(html),
    header: /<header\b/i.test(html) || /role=["']banner["']/i.test(html),
    nav: /<nav\b/i.test(html) || /role=["']navigation["']/i.test(html),
    footer: /<footer\b/i.test(html) || /role=["']contentinfo["']/i.test(html),
    aside: /<aside\b/i.test(html) || /role=["']complementary["']/i.test(html)
  };

  const missingLandmarks = [];
  if (!landmarks.main) missingLandmarks.push('<main>');
  if (!landmarks.header) missingLandmarks.push('<header>');
  if (!landmarks.nav) missingLandmarks.push('<nav>');
  if (!landmarks.footer) missingLandmarks.push('<footer>');

  if (missingLandmarks.length === 0) {
    checks.push({
      id: 'html-landmarks',
      name: 'Semantic Landmarks',
      severity: 'PASS',
      detectedValue: 'All major landmarks present',
      whyItMatters: 'Landmarks allow assistive technologies and screen readers to jump directly between page regions.',
      message: 'Found <main>, <header>, <nav>, and <footer> semantic landmarks.',
      fix: null
    });
  } else {
    checks.push({
      id: 'html-landmarks',
      name: 'Semantic Landmarks',
      severity: 'WARNING',
      detectedValue: `Missing: ${missingLandmarks.join(', ')}`,
      whyItMatters: 'Assistive technology users rely on landmarks to navigate page structures without listening to every element.',
      message: `Document lacks standard landmark elements: ${missingLandmarks.join(', ')}.`,
      fix: 'Wrap primary page content in <main>, site navigation in <nav>, and masthead/footer in <header> and <footer>.'
    });
  }

  // 9. Duplicate ID Detection
  const idRegex = /\bid\s*=\s*(["'])(.*?)\1/gi;
  const idCounts = {};
  let idMatch;
  while ((idMatch = idRegex.exec(html)) !== null) {
    const idVal = idMatch[2].trim();
    if (idVal) {
      idCounts[idVal] = (idCounts[idVal] || 0) + 1;
    }
  }

  const duplicateIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
  if (duplicateIds.length === 0) {
    checks.push({
      id: 'html-duplicate-ids',
      name: 'HTML ID Uniqueness',
      severity: 'PASS',
      detectedValue: '0 duplicate IDs',
      whyItMatters: 'HTML IDs must be unique across the document to prevent accessibility and script selector conflicts.',
      message: 'All detected element ID attributes are unique.',
      fix: null
    });
  } else {
    checks.push({
      id: 'html-duplicate-ids',
      name: 'HTML ID Uniqueness',
      severity: 'ERROR',
      detectedValue: `${duplicateIds.length} duplicate ID(s) (${duplicateIds.slice(0, 3).join(', ')}${duplicateIds.length > 3 ? '...' : ''})`,
      whyItMatters: 'Duplicate IDs break ARIA associations (like aria-describedby) and client-side DOM queries.',
      message: `Detected duplicate element IDs: ${duplicateIds.join(', ')}.`,
      fix: 'Ensure each id attribute value appears exactly once per HTML document.'
    });
  }

  // 10. Empty Buttons
  const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let emptyButtonCount = 0;
  let btnMatch;
  while ((btnMatch = buttonRegex.exec(html)) !== null) {
    const attrs = btnMatch[1];
    const content = btnMatch[2].replace(/<[^>]+>/g, '').trim();
    const hasAria = /aria-label\s*=\s*(["'])(.*?)\1/i.test(attrs) || /aria-labelledby/i.test(attrs) || /title\s*=\s*(["'])(.*?)\1/i.test(attrs);
    const hasImgOrSvg = /<(img|svg)\b/i.test(btnMatch[2]);
    if (!content && !hasAria && !hasImgOrSvg) {
      emptyButtonCount++;
    }
  }

  if (emptyButtonCount === 0) {
    checks.push({
      id: 'html-empty-buttons',
      name: 'Button Content & Labels',
      severity: 'PASS',
      detectedValue: '0 empty buttons',
      whyItMatters: 'Buttons must have text or accessible labels so users know their action.',
      message: 'All buttons have text, SVG icons, or aria-labels.',
      fix: null
    });
  } else {
    checks.push({
      id: 'html-empty-buttons',
      name: 'Empty Buttons',
      severity: 'WARNING',
      detectedValue: `${emptyButtonCount} unlabelled button(s)`,
      whyItMatters: 'Buttons without text or aria-label are unreadable by screen readers.',
      message: `Found ${emptyButtonCount} <button> element(s) with no text content or aria-label.`,
      fix: 'Add visible text or an aria-label="Action description" to empty buttons.'
    });
  }

  // Total DOM Elements estimate
  const totalElementsEstimate = (html.match(/<[a-z0-9]+(?=[\s>])/gi) || []).length;

  return {
    summary: {
      htmlSize,
      hasDoctype,
      charset: detectedCharset || 'Not specified',
      lang: detectedLang || 'Not specified',
      viewport: detectedViewport || 'Not specified',
      title: titleText || 'Not specified',
      headingCounts,
      totalHeadings: headingList.length,
      totalMetaTags: metaTags.length,
      totalElementsEstimate,
      landmarks
    },
    metaTags,
    headings: headingList,
    duplicateIds,
    checks
  };
}

module.exports = {
  analyzeHtml
};
