/**
 * server/services/qa/social.js
 * Analyzes Open Graph and Twitter/X social preview metadata.
 */

function analyzeSocial(html) {
  const og = {
    title: null,
    description: null,
    image: null,
    url: null,
    type: null,
    site_name: null
  };

  const twitter = {
    card: null,
    title: null,
    description: null,
    image: null
  };

  const metaRegex = /<meta\b([^>]*?)>/gi;
  let match;

  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];
    const propertyMatch = attrs.match(/\b(property|name)\s*=\s*(["'])(.*?)\2/i);
    const contentMatch = attrs.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\2/i);

    if (propertyMatch && contentMatch && propertyMatch[3] && contentMatch[3]) {
      const key = propertyMatch[3].trim().toLowerCase();
      const val = contentMatch[3].trim();

      // Open Graph
      if (key === 'og:title') og.title = val;
      if (key === 'og:description') og.description = val;
      if (key === 'og:image') og.image = val;
      if (key === 'og:url') og.url = val;
      if (key === 'og:type') og.type = val;
      if (key === 'og:site_name') og.site_name = val;

      // Twitter / X
      if (key === 'twitter:card') twitter.card = val;
      if (key === 'twitter:title') twitter.title = val;
      if (key === 'twitter:description') twitter.description = val;
      if (key === 'twitter:image') twitter.image = val;
    }
  }

  const checks = [];

  // Check 1: Open Graph Presence
  if (og.title && og.description && og.image) {
    checks.push({
      id: 'social-og',
      name: 'Open Graph Metadata',
      severity: 'PASS',
      detectedValue: `og:title="${og.title}", og:image configured`,
      whyItMatters: 'Open Graph controls rich social card previews on Facebook, LinkedIn, Slack, and Discord.',
      message: 'Core Open Graph tags (og:title, og:description, og:image) are configured.',
      fix: null
    });
  } else {
    const missingOg = [];
    if (!og.title) missingOg.push('og:title');
    if (!og.description) missingOg.push('og:description');
    if (!og.image) missingOg.push('og:image');

    checks.push({
      id: 'social-og',
      name: 'Open Graph Metadata',
      severity: 'WARNING',
      detectedValue: `Missing: ${missingOg.join(', ')}`,
      whyItMatters: 'Shared links will display plain generic snippets without a preview image or title.',
      message: `Missing essential Open Graph tags: ${missingOg.join(', ')}.`,
      fix: 'Add <meta property="og:title">, <meta property="og:description">, and <meta property="og:image"> to <head>.'
    });
  }

  // Check 2: Twitter Card Presence
  if (twitter.card) {
    checks.push({
      id: 'social-twitter',
      name: 'Twitter / X Card Metadata',
      severity: 'PASS',
      detectedValue: `twitter:card="${twitter.card}"`,
      whyItMatters: 'Ensures link previews expand into large visual cards on X (Twitter).',
      message: `Twitter card format specified: "${twitter.card}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'social-twitter',
      name: 'Twitter / X Card Metadata',
      severity: 'WARNING',
      detectedValue: 'Missing twitter:card',
      whyItMatters: 'Without twitter:card, tweets sharing this link will display a compressed text fallback.',
      message: 'No <meta name="twitter:card"> tag found (defaults to summary if og tags present).',
      fix: 'Add <meta name="twitter:card" content="summary_large_image"> for rich tweet previews.'
    });
  }

  return {
    openGraph: og,
    twitter,
    checks
  };
}

module.exports = {
  analyzeSocial
};
