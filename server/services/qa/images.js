/**
 * server/services/qa/images.js
 * Extracts every image, verifies headers/size/status, and checks accessibility & optimization.
 */

const { URL } = require('url');
const path = require('path');

async function checkImageResource(imgUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(imgUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; ImageChecker)',
        'Accept': 'image/*,*/*'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const contentLength = res.headers.get('content-length') ? parseInt(res.headers.get('content-length'), 10) : null;
    const contentType = res.headers.get('content-type') || null;

    return {
      status: res.status,
      contentLength,
      contentType,
      error: res.status >= 400 ? `HTTP ${res.status}` : null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      status: null,
      contentLength: null,
      contentType: null,
      error: err.message || 'Fetch failed'
    };
  }
}

async function analyzeImages(html, baseUrl) {
  const rawImages = [];
  const imgRegex = /<img\b([^>]*)>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const attrs = match[1];

    const srcMatch = attrs.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const altMatch = attrs.match(/\balt\s*=\s*(["'])(.*?)\1/i);
    const titleMatch = attrs.match(/\btitle\s*=\s*(["'])(.*?)\1/i);
    const widthMatch = attrs.match(/\bwidth\s*=\s*(["'])(.*?)\1/i);
    const heightMatch = attrs.match(/\bheight\s*=\s*(["'])(.*?)\1/i);
    const loadingMatch = attrs.match(/\bloading\s*=\s*(["'])(.*?)\1/i);
    const decodingMatch = attrs.match(/\bdecoding\s*=\s*(["'])(.*?)\1/i);
    const srcsetMatch = attrs.match(/\bsrcset\s*=\s*(["'])(.*?)\1/i);
    const sizesMatch = attrs.match(/\bsizes\s*=\s*(["'])(.*?)\1/i);

    const originalSrc = srcMatch ? srcMatch[2].trim() : '';
    const alt = altMatch ? altMatch[2] : null; // null means attribute missing completely!
    const title = titleMatch ? titleMatch[2].trim() : null;
    const width = widthMatch ? widthMatch[2].trim() : null;
    const height = heightMatch ? heightMatch[2].trim() : null;
    const loading = loadingMatch ? loadingMatch[2].trim().toLowerCase() : null;
    const decoding = decodingMatch ? decodingMatch[2].trim().toLowerCase() : null;
    const srcset = srcsetMatch ? srcsetMatch[2].trim() : null;
    const sizes = sizesMatch ? sizesMatch[2].trim() : null;

    let absoluteUrl = null;
    let ext = 'unknown';

    if (originalSrc.startsWith('data:')) {
      absoluteUrl = '(Data URI)';
      ext = 'data-uri';
    } else if (originalSrc) {
      try {
        const resolved = new URL(originalSrc, baseUrl);
        absoluteUrl = resolved.toString();
        const pathname = resolved.pathname;
        ext = path.extname(pathname).toLowerCase().replace('.', '') || 'unknown';
      } catch (e) {
        absoluteUrl = originalSrc;
      }
    }

    rawImages.push({
      src: originalSrc,
      absoluteUrl,
      alt,
      hasAltAttr: alt !== null,
      isEmptyAlt: alt !== null && alt.trim() === '',
      title,
      width,
      height,
      hasDimensions: !!(width && height),
      loading,
      isLazy: loading === 'lazy',
      decoding,
      srcset,
      hasSrcset: !!srcset,
      sizes,
      format: ext,
      isModernFormat: ['webp', 'avif', 'svg'].includes(ext),
      status: null,
      fileSizeBytes: null,
      mimeType: null,
      error: null
    });
  }

  // Check live status for up to 40 unique HTTP/HTTPS images
  const checkableUrls = Array.from(new Set(
    rawImages
      .map(img => img.absoluteUrl)
      .filter(url => url && /^https?:\/\//i.test(url))
  )).slice(0, 40);

  const statusMap = new Map();
  const BATCH_SIZE = 8;
  for (let i = 0; i < checkableUrls.length; i += BATCH_SIZE) {
    const batch = checkableUrls.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(url => checkImageResource(url)));
    batch.forEach((url, idx) => {
      statusMap.set(url, results[idx]);
    });
  }

  rawImages.forEach(img => {
    if (img.absoluteUrl && statusMap.has(img.absoluteUrl)) {
      const res = statusMap.get(img.absoluteUrl);
      img.status = res.status;
      img.fileSizeBytes = res.contentLength;
      img.mimeType = res.contentType;
      img.error = res.error;
    }
  });

  // Calculate metrics
  const total = rawImages.length;
  const missingAltCount = rawImages.filter(i => !i.hasAltAttr).length;
  const emptyAltCount = rawImages.filter(i => i.isEmptyAlt).length;
  const missingDimCount = rawImages.filter(i => !i.hasDimensions).length;
  const missingLazyCount = rawImages.filter(i => !i.isLazy).length;
  const missingSrcsetCount = rawImages.filter(i => !i.hasSrcset).length;
  const legacyFormatCount = rawImages.filter(i => !i.isModernFormat && i.format !== 'data-uri' && i.format !== 'unknown').length;
  const failedImages = rawImages.filter(i => (i.status && i.status >= 400) || i.error);
  const largeImages = rawImages.filter(i => i.fileSizeBytes && i.fileSizeBytes > 500 * 1024);

  const checks = [];

  // Check 1: Missing Alt Attributes
  if (missingAltCount === 0) {
    checks.push({
      id: 'img-alt-attr',
      name: 'Image Alt Attributes',
      severity: 'PASS',
      detectedValue: `${total} of ${total} images have alt attributes (${emptyAltCount} decorative empty)`,
      whyItMatters: 'Every <img> must have an alt attribute so assistive tech can describe content or ignore decorative graphics.',
      message: 'All images specify an "alt" attribute.',
      fix: null
    });
  } else {
    checks.push({
      id: 'img-alt-attr',
      name: 'Missing Image Alt Attributes',
      severity: 'ERROR',
      detectedValue: `${missingAltCount} missing alt attribute(s)`,
      whyItMatters: 'Images without alt attributes cause screen readers to read out raw image file paths.',
      message: `Found ${missingAltCount} of ${total} image(s) completely missing an "alt" attribute.`,
      fix: 'Add descriptive alt="..." text for informative images, or alt="" for decorative graphics.'
    });
  }

  // Check 2: Missing Explicit Dimensions (CLS Prevention)
  if (missingDimCount === 0) {
    checks.push({
      id: 'img-dimensions',
      name: 'Image Width and Height Attributes',
      severity: 'PASS',
      detectedValue: 'All images have width and height attributes',
      whyItMatters: 'Explicit width and height allow the browser to allocate layout aspect ratios early, avoiding Cumulative Layout Shift (CLS).',
      message: 'All images define width and height attributes.',
      fix: null
    });
  } else {
    checks.push({
      id: 'img-dimensions',
      name: 'Missing Image Dimensions',
      severity: 'WARNING',
      detectedValue: `${missingDimCount} image(s) missing width or height`,
      whyItMatters: 'Browsers cannot calculate aspect ratios before images download, causing layout reflows and CLS.',
      message: `${missingDimCount} of ${total} image(s) lack explicit width and height attributes.`,
      fix: 'Add width="..." and height="..." attributes to <img> elements to reserve aspect-ratio layout boxes.'
    });
  }

  // Check 3: Modern Image Formats
  if (legacyFormatCount === 0 && total > 0) {
    checks.push({
      id: 'img-modern-format',
      name: 'Modern Image Formats (WebP / AVIF)',
      severity: 'PASS',
      detectedValue: 'All images use modern formats',
      whyItMatters: 'Modern formats like WebP and AVIF offer 25-35% smaller file sizes than PNG/JPEG at equivalent quality.',
      message: 'Images are served in modern formats (WebP, AVIF, or SVG).',
      fix: null
    });
  } else if (legacyFormatCount > 0) {
    checks.push({
      id: 'img-modern-format',
      name: 'Modern Image Formats',
      severity: 'WARNING',
      detectedValue: `${legacyFormatCount} legacy format image(s) (JPEG/PNG/GIF)`,
      whyItMatters: 'Legacy JPEG/PNG formats transfer more bytes across the network than modern WebP or AVIF.',
      message: `Found ${legacyFormatCount} image(s) using older formats (PNG, JPG, GIF).`,
      fix: 'Convert raster assets to WebP or AVIF to reduce total page payload.'
    });
  }

  // Check 4: Failed Images
  if (failedImages.length > 0) {
    checks.push({
      id: 'img-failed',
      name: 'Broken Image Requests',
      severity: 'ERROR',
      detectedValue: `${failedImages.length} broken image(s)`,
      whyItMatters: 'Broken image URLs display blank placeholders and degrade visual presentation.',
      message: `Detected ${failedImages.length} image request(s) returning 4xx/5xx errors: ${failedImages.slice(0, 2).map(f => f.src).join(', ')}.`,
      fix: 'Verify image file paths on the server and update invalid image source URLs.'
    });
  }

  // Check 5: Large Image Payloads
  if (largeImages.length > 0) {
    checks.push({
      id: 'img-large-size',
      name: 'Oversized Images (>500KB)',
      severity: 'WARNING',
      detectedValue: `${largeImages.length} image(s) exceed 500KB`,
      whyItMatters: 'Large image files consume mobile bandwidth and drastically slow down network transfer.',
      message: `Found ${largeImages.length} image(s) larger than 500KB.`,
      fix: 'Compress images using sharp, squoosh, or an image CDN with responsive sizing.'
    });
  }

  return {
    summary: {
      total,
      missingAltCount,
      emptyAltCount,
      missingDimCount,
      missingLazyCount,
      missingSrcsetCount,
      legacyFormatCount,
      failedImagesCount: failedImages.length,
      largeImagesCount: largeImages.length,
      checkedCount: statusMap.size
    },
    inventory: rawImages,
    checks
  };
}

module.exports = {
  analyzeImages
};
