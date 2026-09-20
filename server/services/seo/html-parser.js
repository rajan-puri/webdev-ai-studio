/**
 * server/services/seo/html-parser.js
 * High-performance HTML and technical SEO analyzer for crawled pages.
 */

const { URL } = require('url');
const { normalizeUrl, resolveUrl, isInternalUrl, extractDomain } = require('./url-utils');

function parsePageHtml(htmlString, pageUrl, responseHeaders = {}, baseDomain = '', includeSubdomains = false) {
  const result = {
    url: pageUrl,
    title: {
      text: '',
      length: 0,
      exists: false
    },
    metaDescription: {
      text: '',
      length: 0,
      exists: false
    },
    metaRobots: {
      directives: [],
      isNoindex: false,
      isNofollow: false,
      raw: ''
    },
    xRobotsTag: {
      directives: [],
      isNoindex: false,
      isNofollow: false,
      raw: ''
    },
    indexability: {
      isIndexable: true,
      reason: 'Indexable'
    },
    canonical: {
      declared: '',
      resolved: '',
      exists: false,
      isSelfReferential: false,
      isCrossDomain: false,
      hasMultiple: false
    },
    headings: {
      h1: [],
      h2: [],
      h3: [],
      h1Count: 0,
      tree: []
    },
    content: {
      visibleText: '',
      wordCount: 0,
      charCount: 0,
      htmlSizeBytes: Buffer.byteLength(htmlString, 'utf8'),
      textToHtmlRatio: 0,
      isThinContent: false
    },
    links: {
      internal: [],
      external: [],
      internalCount: 0,
      externalCount: 0
    },
    images: {
      items: [],
      totalCount: 0,
      missingAltCount: 0,
      emptyAltCount: 0
    },
    structuredData: {
      items: [],
      types: [],
      hasErrors: false,
      errorDetails: []
    },
    openGraph: {},
    twitter: {},
    international: {
      htmlLang: '',
      hreflangs: []
    },
    security: {
      isHttps: pageUrl.startsWith('https://'),
      hasHsts: false,
      hasCsp: false,
      hasXContentTypeOptions: false,
      mixedContentUrls: []
    },
    viewport: {
      exists: false,
      content: ''
    },
    charset: ''
  };

  if (!htmlString || typeof htmlString !== 'string') {
    return result;
  }

  // 1. Response Headers: X-Robots-Tag, HSTS, CSP, Content-Type
  for (const [key, val] of Object.entries(responseHeaders)) {
    const k = key.toLowerCase();
    const v = String(val);

    if (k === 'x-robots-tag') {
      result.xRobotsTag.raw = v;
      const directives = v.toLowerCase().split(/[\s,]+/).map(d => d.trim()).filter(Boolean);
      result.xRobotsTag.directives = directives;
      if (directives.includes('noindex')) result.xRobotsTag.isNoindex = true;
      if (directives.includes('nofollow')) result.xRobotsTag.isNofollow = true;
    }
    if (k === 'strict-transport-security') result.security.hasHsts = true;
    if (k === 'content-security-policy') result.security.hasCsp = true;
    if (k === 'x-content-type-options' && v.toLowerCase().includes('nosniff')) {
      result.security.hasXContentTypeOptions = true;
    }
  }

  // 2. Head Tags: Title, Meta Description, Meta Robots, Canonical, Open Graph, Viewport, Charset
  // Title
  const titleMatch = htmlString.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const titleText = cleanHtmlEntities(titleMatch[1].trim());
    result.title.text = titleText;
    result.title.length = titleText.length;
    result.title.exists = titleText.length > 0;
  }

  // Meta tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(htmlString)) !== null) {
    const attrs = parseAttributes(metaMatch[1]);
    const name = (attrs.name || attrs.property || '').toLowerCase();
    const content = attrs.content ? cleanHtmlEntities(attrs.content.trim()) : '';

    if (attrs.charset) {
      result.charset = attrs.charset;
    }

    if (name === 'description') {
      result.metaDescription.text = content;
      result.metaDescription.length = content.length;
      result.metaDescription.exists = content.length > 0;
    } else if (name === 'robots' || name === 'googlebot') {
      result.metaRobots.raw = content;
      const dirs = content.toLowerCase().split(/[\s,]+/).map(d => d.trim()).filter(Boolean);
      result.metaRobots.directives.push(...dirs);
      if (dirs.includes('noindex') || dirs.includes('none')) result.metaRobots.isNoindex = true;
      if (dirs.includes('nofollow') || dirs.includes('none')) result.metaRobots.isNofollow = true;
    } else if (name === 'viewport') {
      result.viewport.exists = true;
      result.viewport.content = content;
    } else if (name.startsWith('og:')) {
      const ogKey = name.replace('og:', '');
      result.openGraph[ogKey] = content;
    } else if (name.startsWith('twitter:')) {
      const twKey = name.replace('twitter:', '');
      result.twitter[twKey] = content;
    }
  }

  // 3. Canonical Tag
  const canonicalMatches = [...htmlString.matchAll(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi)];
  if (canonicalMatches.length > 0) {
    result.canonical.hasMultiple = canonicalMatches.length > 1;
    const firstAttrs = parseAttributes(canonicalMatches[0][0]);
    const href = firstAttrs.href ? firstAttrs.href.trim() : '';
    result.canonical.declared = href;

    if (href) {
      result.canonical.exists = true;
      const resolved = resolveUrl(href, pageUrl);
      result.canonical.resolved = resolved || href;

      const normPage = normalizeUrl(pageUrl);
      if (resolved && normPage && resolved === normPage) {
        result.canonical.isSelfReferential = true;
      } else if (resolved) {
        const cDomain = extractDomain(resolved);
        const pDomain = extractDomain(pageUrl);
        if (cDomain && pDomain && cDomain !== pDomain) {
          result.canonical.isCrossDomain = true;
        }
      }
    }
  }

  // 4. Determine Indexability
  if (result.metaRobots.isNoindex) {
    result.indexability.isIndexable = false;
    result.indexability.reason = 'Blocked by meta robots noindex';
  } else if (result.xRobotsTag.isNoindex) {
    result.indexability.isIndexable = false;
    result.indexability.reason = 'Blocked by X-Robots-Tag noindex';
  } else if (result.canonical.exists && !result.canonical.isSelfReferential && result.canonical.resolved) {
    result.indexability.isIndexable = false;
    result.indexability.reason = `Canonical points elsewhere (${result.canonical.resolved})`;
  }

  // 5. HTML lang attribute
  const htmlTagMatch = htmlString.match(/<html\s+([^>]+)>/i);
  if (htmlTagMatch) {
    const htmlAttrs = parseAttributes(htmlTagMatch[1]);
    if (htmlAttrs.lang) {
      result.international.htmlLang = htmlAttrs.lang.trim().toLowerCase();
    }
  }

  // 6. Hreflang alternate links
  const hreflangRegex = /<link\s+[^>]*rel=["']alternate["'][^>]*>/gi;
  let hrefMatch;
  while ((hrefMatch = hreflangRegex.exec(htmlString)) !== null) {
    const attrs = parseAttributes(hrefMatch[0]);
    if (attrs.hreflang && attrs.href) {
      result.international.hreflangs.push({
        lang: attrs.hreflang.trim().toLowerCase(),
        href: attrs.href.trim(),
        resolvedHref: resolveUrl(attrs.href.trim(), pageUrl)
      });
    }
  }

  // 7. Headings (H1, H2, H3) and tree
  const headingRegex = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(htmlString)) !== null) {
    const tag = hMatch[1].toLowerCase();
    const text = cleanHtmlEntities(stripTags(hMatch[2]).trim());
    if (text) {
      result.headings[tag].push(text);
      result.headings.tree.push({ tag, text });
    }
  }
  result.headings.h1Count = result.headings.h1.length;

  // 8. Structured Data (JSON-LD)
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch;
  while ((ldMatch = jsonLdRegex.exec(htmlString)) !== null) {
    const rawJson = ldMatch[1].trim();
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);
      result.structuredData.items.push(parsed);

      // Extract types
      const types = extractSchemaTypes(parsed);
      for (const t of types) {
        if (!result.structuredData.types.includes(t)) {
          result.structuredData.types.push(t);
        }
      }
    } catch (err) {
      result.structuredData.hasErrors = true;
      result.structuredData.errorDetails.push({
        message: 'Invalid JSON-LD syntax: ' + err.message,
        snippet: rawJson.slice(0, 150)
      });
    }
  }

  // 9. Content: Visible text, word count, text-to-HTML ratio
  const cleanBody = htmlString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const visibleText = cleanHtmlEntities(stripTags(cleanBody))
    .replace(/\s+/g, ' ')
    .trim();

  result.content.visibleText = visibleText.slice(0, 1000); // snippet
  const words = visibleText ? visibleText.split(/\s+/).filter(w => w.length > 0) : [];
  result.content.wordCount = words.length;
  result.content.charCount = visibleText.length;
  result.content.isThinContent = words.length < 150;
  if (result.content.htmlSizeBytes > 0) {
    result.content.textToHtmlRatio = Math.round((Buffer.byteLength(visibleText, 'utf8') / result.content.htmlSizeBytes) * 100);
  }

  // 10. Links (Internal & Outgoing External)
  const linkRegex = /<a\s+([^>]+)>([\s\S]*?)<\/a>/gi;
  let aMatch;
  const seenUrls = new Set();

  while ((aMatch = linkRegex.exec(htmlString)) !== null) {
    const attrs = parseAttributes(aMatch[1]);
    const href = attrs.href ? attrs.href.trim() : '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    const resolved = resolveUrl(href, pageUrl);
    if (!resolved) continue;

    const linkText = cleanHtmlEntities(stripTags(aMatch[2]).trim());
    const rel = (attrs.rel || '').toLowerCase();
    const isNofollow = rel.includes('nofollow');

    const isInternal = isInternalUrl(resolved, baseDomain || extractDomain(pageUrl), includeSubdomains);

    if (isInternal) {
      if (!seenUrls.has(resolved)) {
        seenUrls.add(resolved);
        result.links.internal.push({
          url: resolved,
          rawHref: href,
          text: linkText,
          rel,
          isNofollow
        });
      }
    } else {
      result.links.external.push({
        url: resolved,
        domain: extractDomain(resolved),
        text: linkText,
        rel,
        isNofollow
      });
    }
  }
  result.links.internalCount = result.links.internal.length;
  result.links.externalCount = result.links.external.length;

  // 11. Images & Alt text
  const imgRegex = /<img\s+([^>]+)>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(htmlString)) !== null) {
    const attrs = parseAttributes(imgMatch[1]);
    const src = attrs.src ? attrs.src.trim() : '';
    if (!src || src.startsWith('data:')) continue;

    const resolvedSrc = resolveUrl(src, pageUrl) || src;
    const hasAlt = typeof attrs.alt === 'string';
    const alt = hasAlt ? cleanHtmlEntities(attrs.alt.trim()) : '';
    const isAltEmpty = hasAlt && alt.length === 0;
    const role = (attrs.role || '').toLowerCase();
    const isDecorative = isAltEmpty || role === 'presentation' || role === 'none';

    if (!hasAlt) {
      result.images.missingAltCount++;
    } else if (isAltEmpty) {
      result.images.emptyAltCount++;
    }

    // Check mixed content
    if (result.security.isHttps && resolvedSrc.startsWith('http://')) {
      result.security.mixedContentUrls.push(resolvedSrc);
    }

    result.images.items.push({
      src: resolvedSrc,
      alt,
      hasAlt,
      isAltEmpty,
      isDecorative,
      width: attrs.width || null,
      height: attrs.height || null,
      loading: attrs.loading || null,
      decoding: attrs.decoding || null
    });
  }
  result.images.totalCount = result.images.items.length;

  return result;
}

function parseAttributes(attrString) {
  const attrs = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : ''));
    attrs[key] = value;
  }
  return attrs;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ');
}

function cleanHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractSchemaTypes(obj) {
  const types = [];
  if (!obj || typeof obj !== 'object') return types;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      types.push(...extractSchemaTypes(item));
    }
  } else {
    if (obj['@type']) {
      if (Array.isArray(obj['@type'])) {
        types.push(...obj['@type']);
      } else {
        types.push(obj['@type']);
      }
    }
    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      for (const item of obj['@graph']) {
        types.push(...extractSchemaTypes(item));
      }
    }
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        types.push(...extractSchemaTypes(val));
      }
    }
  }
  return Array.from(new Set(types));
}

module.exports = {
  parsePageHtml
};
