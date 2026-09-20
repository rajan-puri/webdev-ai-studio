/**
 * server/services/seo/exporter.js
 * CSV and JSON exporters for SEO audit datasets.
 */

function generateSeoPagesCsv(pages = []) {
  const headers = [
    'URL',
    'Status Code',
    'Final URL',
    'Indexable',
    'Indexability Reason',
    'Title',
    'Title Length',
    'Meta Description',
    'Meta Description Length',
    'H1',
    'Canonical URL',
    'Word Count',
    'Crawl Depth',
    'Incoming Internal Links',
    'Outgoing Internal Links',
    'Issues Count',
    'Response Time (ms)'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = [headers.join(',')];

  for (const p of pages) {
    rows.push([
      escapeCsv(p.url),
      escapeCsv(p.status_code),
      escapeCsv(p.final_url),
      escapeCsv(p.indexable ? 'Yes' : 'No'),
      escapeCsv(p.indexability_status),
      escapeCsv(p.title),
      escapeCsv(p.title ? p.title.length : 0),
      escapeCsv(p.meta_description),
      escapeCsv(p.meta_description ? p.meta_description.length : 0),
      escapeCsv(p.h1),
      escapeCsv(p.canonical),
      escapeCsv(p.word_count),
      escapeCsv(p.crawl_depth),
      escapeCsv(p.incoming_links_count),
      escapeCsv(p.outgoing_links_count),
      escapeCsv(p.issues_count),
      escapeCsv(p.response_time_ms)
    ].join(','));
  }

  return rows.join('\r\n');
}

function generateSeoAuditJson(audit, pages = [], issues = []) {
  const summary = typeof audit.summary_json === 'string' ? JSON.parse(audit.summary_json || '{}') : (audit.summary_json || {});
  const config = typeof audit.config === 'string' ? JSON.parse(audit.config || '{}') : (audit.config || {});

  return {
    metadata: {
      auditId: audit.id,
      url: audit.url,
      status: audit.status,
      healthScore: audit.health_score,
      createdAt: audit.created_at,
      completedAt: audit.completed_at,
      durationMs: audit.duration_ms
    },
    audit: {
      id: audit.id,
      url: audit.url,
      status: audit.status,
      health_score: audit.health_score,
      created_at: audit.created_at,
      completed_at: audit.completed_at,
      duration_ms: audit.duration_ms,
      pages_crawled: audit.pages_crawled,
      pages_discovered: audit.pages_discovered
    },
    config,
    summary,
    issues: issues.map(iss => ({
      code: iss.code,
      category: iss.category,
      severity: iss.severity,
      title: iss.title,
      description: iss.description,
      recommendation: iss.recommendation,
      affectedCount: iss.affected_count,
      affectedUrls: typeof iss.affected_urls_json === 'string' ? JSON.parse(iss.affected_urls_json || '[]') : (iss.affected_urls_json || [])
    })),
    pages: pages.map(p => ({
      url: p.url,
      finalUrl: p.final_url,
      statusCode: p.status_code,
      contentType: p.content_type,
      indexable: !!p.indexable,
      indexabilityStatus: p.indexability_status,
      title: p.title,
      metaDescription: p.meta_description,
      h1: p.h1,
      canonical: p.canonical,
      wordCount: p.word_count,
      crawlDepth: p.crawl_depth,
      incomingLinksCount: p.incoming_links_count,
      outgoingLinksCount: p.outgoing_links_count,
      data: typeof p.page_data_json === 'string' ? JSON.parse(p.page_data_json || '{}') : (p.page_data_json || {})
    }))
  };
}

module.exports = {
  generateSeoPagesCsv,
  generateSeoAuditJson
};
