/**
 * server/services/qa/schema.js
 * Detects JSON-LD, Microdata, and RDFa structured data markups.
 * Collects complete parsed blocks for raw inspection.
 */

function analyzeSchema(html) {
  const jsonLdBlocks = [];
  const detectedTypes = [];
  const checks = [];

  // 1. JSON-LD Extraction
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    const rawContent = match[1].trim();
    let parsed = null;
    let isValidJson = false;

    try {
      parsed = JSON.parse(rawContent);
      isValidJson = true;

      // Extract types
      function extractTypes(node) {
        if (!node || typeof node !== 'object') return;
        if (node['@type']) {
          if (Array.isArray(node['@type'])) {
            node['@type'].forEach(t => detectedTypes.push(String(t)));
          } else {
            detectedTypes.push(String(node['@type']));
          }
        }
        if (Array.isArray(node['@graph'])) {
          node['@graph'].forEach(item => extractTypes(item));
        }
        if (Array.isArray(node)) {
          node.forEach(item => extractTypes(item));
        }
      }
      extractTypes(parsed);
    } catch (err) {
      isValidJson = false;
    }

    jsonLdBlocks.push({
      isValidJson,
      rawContent,
      parsedData: parsed,
      context: parsed && parsed['@context'] ? parsed['@context'] : null,
      primaryType: parsed && parsed['@type'] ? parsed['@type'] : null
    });
  }

  // 2. Microdata Detection (itemscope, itemtype)
  const microdataRegex = /\bitemtype\s*=\s*(["'])(.*?)\1/gi;
  let microdataMatch;
  const microdataTypes = [];

  while ((microdataMatch = microdataRegex.exec(html)) !== null) {
    if (microdataMatch[2]) {
      microdataTypes.push(microdataMatch[2].trim());
    }
  }

  // 3. RDFa Detection (vocab, typeof, property)
  const rdfaRegex = /\b(?:vocab|typeof)\s*=\s*(["'])(.*?)\1/gi;
  let rdfaMatch;
  const rdfaTypes = [];

  while ((rdfaMatch = rdfaRegex.exec(html)) !== null) {
    if (rdfaMatch[2]) {
      rdfaTypes.push(rdfaMatch[2].trim());
    }
  }

  const uniqueTypes = Array.from(new Set(detectedTypes));

  if (jsonLdBlocks.length > 0) {
    const invalidBlocks = jsonLdBlocks.filter(b => !b.isValidJson);
    if (invalidBlocks.length === 0) {
      checks.push({
        id: 'schema-jsonld',
        name: 'JSON-LD Structured Data',
        severity: 'PASS',
        detectedValue: `${jsonLdBlocks.length} block(s) with types: ${uniqueTypes.join(', ') || 'General'}`,
        whyItMatters: 'Structured data enables rich snippets, knowledge graph cards, and enhanced search results.',
        message: `Detected ${jsonLdBlocks.length} valid JSON-LD structured data block(s).`,
        fix: null
      });
    } else {
      checks.push({
        id: 'schema-jsonld',
        name: 'JSON-LD Syntax Errors',
        severity: 'ERROR',
        detectedValue: `${invalidBlocks.length} invalid JSON-LD block(s)`,
        whyItMatters: 'Syntax errors in JSON-LD prevent search engines from parsing your schema data.',
        message: `Found ${invalidBlocks.length} JSON-LD block(s) with malformed JSON syntax.`,
        fix: 'Validate JSON-LD syntax using Google Rich Results Test or Schema Validator.'
      });
    }
  } else if (microdataTypes.length > 0 || rdfaTypes.length > 0) {
    checks.push({
      id: 'schema-format',
      name: 'Structured Data Format',
      severity: 'INFO',
      detectedValue: 'Microdata / RDFa present',
      whyItMatters: 'Google strongly recommends JSON-LD over inline Microdata or RDFa.',
      message: 'Detected Microdata or RDFa markup. Migrating to JSON-LD is recommended for easier maintenance.',
      fix: 'Consider converting inline HTML Microdata to a single JSON-LD block in <head>.'
    });
  } else {
    checks.push({
      id: 'schema-jsonld',
      name: 'JSON-LD Structured Data',
      severity: 'WARNING',
      detectedValue: 'Missing',
      whyItMatters: 'Without structured data, search engines cannot display rich snippets (breadcrumbs, reviews, FAQs).',
      message: 'No JSON-LD, Microdata, or RDFa structured data found on the page.',
      fix: 'Add Schema.org JSON-LD markup (e.g. WebSite, Organization, Article, LocalBusiness).'
    });
  }

  return {
    summary: {
      jsonLdCount: jsonLdBlocks.length,
      microdataCount: microdataTypes.length,
      rdfaCount: rdfaTypes.length,
      detectedTypes: uniqueTypes
    },
    jsonLdBlocks,
    microdataTypes,
    rdfaTypes,
    checks
  };
}

module.exports = {
  analyzeSchema
};
