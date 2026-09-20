/**
 * server/services/qa/fonts.js
 * Detects Google Fonts, Adobe Fonts, Bunny Fonts, and declared font file resources (WOFF2, WOFF, TTF, OTF).
 */

const { URL } = require('url');

function analyzeFonts(html, baseUrl, rawStylesheets = []) {
  const fontResources = [];
  const providers = new Set();

  // 1. Check link tags for Google Fonts, Adobe Fonts, Bunny Fonts, and Font Preloads
  const linkRegex = /<link\b([^>]*)>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    const relMatch = attrs.match(/\brel\s*=\s*(["'])(.*?)\1/i);
    const asMatch = attrs.match(/\bas\s*=\s*(["'])(.*?)\1/i);
    const typeMatch = attrs.match(/\btype\s*=\s*(["'])(.*?)\1/i);

    if (hrefMatch) {
      const href = hrefMatch[2].trim();
      let fontFormat = null;
      let provider = null;

      if (/fonts\.googleapis\.com/i.test(href) || /fonts\.gstatic\.com/i.test(href)) {
        provider = 'Google Fonts';
        providers.add('Google Fonts');
      } else if (/typekit\.net/i.test(href)) {
        provider = 'Adobe Fonts (Typekit)';
        providers.add('Adobe Fonts');
      } else if (/fonts\.bunny\.net/i.test(href)) {
        provider = 'Bunny Fonts';
        providers.add('Bunny Fonts');
      }

      // Check font extension
      const extMatch = href.match(/\.(woff2|woff|ttf|otf|eot)(\?.*)?$/i);
      if (extMatch) {
        fontFormat = extMatch[1].toUpperCase();
      } else if (typeMatch && typeMatch[2].includes('font')) {
        fontFormat = typeMatch[2];
      }

      if (provider || fontFormat || (asMatch && asMatch[2] === 'font')) {
        fontResources.push({
          url: href,
          provider: provider || 'Self-hosted / CDN',
          format: fontFormat || 'Web Font / CSS',
          isPreloaded: relMatch && /preload/i.test(relMatch[2])
        });
      }
    }
  }

  // 2. Scan inline CSS for @font-face url(...) declarations
  const fontFaceRegex = /@font-face\s*\{([^}]*)\}/gi;
  let ffMatch;
  while ((ffMatch = fontFaceRegex.exec(html)) !== null) {
    const block = ffMatch[1];
    const urlMatches = [...block.matchAll(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi)];
    for (const u of urlMatches) {
      const fontUrl = u[1].trim();
      const extMatch = fontUrl.match(/\.(woff2|woff|ttf|otf|eot)(\?.*)?$/i);
      fontResources.push({
        url: fontUrl,
        provider: 'Self-hosted @font-face',
        format: extMatch ? extMatch[1].toUpperCase() : 'Custom Font',
        isPreloaded: false
      });
    }
  }

  const checks = [];
  const totalFonts = fontResources.length;
  const usesWoff2 = fontResources.some(f => f.format === 'WOFF2');
  const usesLegacy = fontResources.some(f => ['TTF', 'OTF', 'EOT'].includes(f.format));

  if (totalFonts === 0) {
    checks.push({
      id: 'font-usage',
      name: 'Web Fonts Detection',
      severity: 'INFO',
      detectedValue: '0 web fonts detected (System fonts or inherited)',
      whyItMatters: 'System fonts offer instant rendering with zero network latency.',
      message: 'No external web font resources or font-face declarations were found.',
      fix: null
    });
  } else {
    checks.push({
      id: 'font-usage',
      name: 'Web Fonts Detected',
      severity: 'PASS',
      detectedValue: `${totalFonts} font resource(s) from: ${Array.from(providers).concat('Local/CDN').join(', ')}`,
      whyItMatters: 'Web fonts provide brand typography across different client platforms.',
      message: `Found ${totalFonts} font resource(s). Providers: ${Array.from(providers).join(', ') || 'Local / Custom'}.`,
      fix: null
    });
  }

  if (usesLegacy) {
    checks.push({
      id: 'font-formats',
      name: 'Legacy Font Formats (TTF / OTF / EOT)',
      severity: 'WARNING',
      detectedValue: 'Detected older font formats',
      whyItMatters: 'WOFF2 provides 30% superior compression over legacy TTF or OTF files.',
      message: 'Some fonts appear to use older TTF, OTF, or EOT formats instead of modern WOFF2.',
      fix: 'Convert web fonts to WOFF2 format for maximum cross-browser compression.'
    });
  } else if (usesWoff2) {
    checks.push({
      id: 'font-formats',
      name: 'Modern WOFF2 Font Format',
      severity: 'PASS',
      detectedValue: 'WOFF2 used',
      whyItMatters: 'WOFF2 is the modern web standard with excellent compression and browser support.',
      message: 'Detected modern WOFF2 font format usage.',
      fix: null
    });
  }

  return {
    summary: {
      totalFonts,
      providers: Array.from(providers),
      usesWoff2,
      usesLegacy
    },
    inventory: fontResources,
    checks
  };
}

module.exports = {
  analyzeFonts
};
