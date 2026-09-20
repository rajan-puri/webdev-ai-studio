/**
 * server/services/seo/pdf-generator.js
 * Generates high-fidelity, multi-page vector PDF reports using Playwright headless Chromium.
 */

const { chromium } = require('playwright');

async function generateSeoAuditPdf(audit, pages = [], issues = []) {
  let browser = null;

  try {
    const summary = typeof audit.summary_json === 'string' ? JSON.parse(audit.summary_json || '{}') : (audit.summary_json || {});
    const config = typeof audit.config === 'string' ? JSON.parse(audit.config || '{}') : (audit.config || {});

    const auditDate = new Date(audit.created_at || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const score = audit.health_score || 0;
    const scoreColor = score >= 85 ? '#16a34a' : (score >= 60 ? '#2563eb' : '#dc2626');

    // Group issues by severity
    const errorIssues = issues.filter(i => i.severity === 'ERROR');
    const warningIssues = issues.filter(i => i.severity === 'WARNING');
    const noticeIssues = issues.filter(i => i.severity === 'NOTICE');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SEO Audit Report - ${escapeHtml(audit.url)}</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 15mm 20mm 15mm;
            @bottom-right {
              content: counter(page);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 9pt;
              color: #94a3b8;
            }
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10pt;
            line-height: 1.5;
          }

          .page-break {
            page-break-before: always;
          }

          .no-break {
            page-break-inside: avoid;
          }

          /* Header / Brand */
          .report-brand-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 28px;
          }

          .brand-logo {
            font-size: 13pt;
            font-weight: 700;
            color: #2563eb;
            letter-spacing: -0.02em;
          }

          .brand-tag {
            font-size: 8pt;
            font-family: monospace;
            background: #f1f5f9;
            padding: 3px 8px;
            border-radius: 4px;
            color: #64748b;
          }

          /* Cover Section */
          .cover-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px;
            margin-bottom: 28px;
          }

          .report-title {
            font-size: 22pt;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px;
            letter-spacing: -0.03em;
          }

          .report-subtitle {
            font-size: 11pt;
            color: #64748b;
            margin: 0 0 20px;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 20px;
          }

          .meta-box {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 14px;
          }

          .meta-box-label {
            font-size: 8pt;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
            letter-spacing: 0.04em;
          }

          .meta-box-value {
            font-size: 14pt;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
          }

          /* Health Score Card */
          .score-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px 24px;
            margin-bottom: 28px;
          }

          .score-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .score-badge {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: ${scoreColor};
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18pt;
            font-weight: 800;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }

          .score-details h2 {
            margin: 0;
            font-size: 15pt;
            font-weight: 700;
          }

          .score-details p {
            margin: 2px 0 0;
            color: #64748b;
            font-size: 9pt;
          }

          /* Summary Chips */
          .chips-row {
            display: flex;
            gap: 10px;
          }

          .chip {
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 9pt;
            font-weight: 600;
            text-align: center;
          }

          .chip-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
          .chip-warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
          .chip-notice { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
          .chip-pass { background: #dcfce7; color: #166534; border: 1px solid #86efac; }

          /* Section Headings */
          h2.section-header {
            font-size: 13pt;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 8px;
            margin: 28px 0 16px;
            letter-spacing: -0.01em;
          }

          /* Issue Cards */
          .issue-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-left-width: 4px;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 12px;
          }

          .issue-card.error { border-left-color: #dc2626; }
          .issue-card.warning { border-left-color: #f59e0b; }
          .issue-card.notice { border-left-color: #0284c7; }

          .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }

          .issue-title {
            font-weight: 600;
            font-size: 10.5pt;
            color: #0f172a;
          }

          .issue-badge {
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
          }

          .issue-badge.error { background: #fee2e2; color: #b91c1c; }
          .issue-badge.warning { background: #fef3c7; color: #b45309; }
          .issue-badge.notice { background: #e0f2fe; color: #0369a1; }

          .issue-desc {
            color: #475569;
            font-size: 9pt;
            margin-bottom: 6px;
          }

          .issue-remedy {
            font-size: 8.5pt;
            color: #1e293b;
            background: #f8fafc;
            padding: 6px 10px;
            border-radius: 4px;
            border-left: 2px solid #2563eb;
          }

          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 8.5pt;
          }

          th {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            color: #475569;
          }

          td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            color: #1e293b;
            word-break: break-all;
          }

          tr:nth-child(even) td {
            background: #fcfcfd;
          }

          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          .text-success { color: #16a34a; font-weight: 600; }
          .text-danger { color: #dc2626; font-weight: 600; }
          .text-warning { color: #d97706; font-weight: 600; }
        </style>
      </head>
      <body>

        <!-- Brand Header -->
        <div class="report-brand-bar">
          <div class="brand-logo">WEBDEV AI STUDIO</div>
          <div class="brand-tag">TECHNICAL SEO AUDIT REPORT</div>
        </div>

        <!-- Cover Header -->
        <div class="cover-card">
          <h1 class="report-title">${escapeHtml(audit.url)}</h1>
          <p class="report-subtitle">Comprehensive Technical SEO & Crawl Health Analysis</p>
          <div style="font-size: 9pt; color: #64748b;">
            Audit Completed: <strong>${auditDate}</strong> &bull; Crawl Duration: <strong>${((audit.duration_ms || 0) / 1000).toFixed(1)}s</strong>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-box-label">SEO Health</div>
              <div class="meta-box-value" style="color: ${scoreColor};">${score} <span style="font-size: 9pt; color:#64748b;">/ 100</span></div>
            </div>
            <div class="meta-box">
              <div class="meta-box-label">Pages Crawled</div>
              <div class="meta-box-value">${audit.pages_crawled || pages.length || 0}</div>
            </div>
            <div class="meta-box">
              <div class="meta-box-label">URLs Discovered</div>
              <div class="meta-box-value">${audit.pages_discovered || pages.length || 0}</div>
            </div>
            <div class="meta-box">
              <div class="meta-box-label">Total Issues</div>
              <div class="meta-box-value">${issues.length}</div>
            </div>
          </div>

          <div class="meta-grid" style="grid-template-columns: repeat(4, 1fr); margin-top: 10px;">
            <div class="meta-box">
              <div class="meta-box-label">Coverage Status</div>
              <div class="meta-box-value" style="font-size: 10pt; color: #2563eb;">${escapeHtml(summary.coverageStatus || (summary.coverage && summary.coverage.status) || 'FULL_SITE_CRAWL')}</div>
            </div>
            <div class="meta-box">
              <div class="meta-box-label">Blocked (robots.txt)</div>
              <div class="meta-box-value">${summary.pagesBlocked || (summary.coverage && summary.coverage.pagesBlocked) || 0}</div>
            </div>
            <div class="meta-box">
              <div class="meta-box-label">Failed URLs</div>
              <div class="meta-box-value">${summary.pagesFailed || (summary.coverage && summary.coverage.pagesFailed) || 0}</div>
            </div>
            <div class="meta-box">
              <div class="meta-box-label">Redirects (3xx)</div>
              <div class="meta-box-value">${summary.pagesRedirected || (summary.coverage && summary.coverage.pagesRedirected) || 0}</div>
            </div>
          </div>
        </div>

        <!-- Executive Summary Banner -->
        <div class="score-banner no-break">
          <div class="score-left">
            <div class="score-badge">${score}</div>
            <div class="score-details">
              <h2>WebDev SEO Health</h2>
              <p>Deterministic evaluation based on technical errors, warning signals, and indexability findings.</p>
            </div>
          </div>
          <div class="chips-row">
            <div class="chip chip-error">❌ ${audit.errors_count || 0} Errors</div>
            <div class="chip chip-warning">⚠️ ${audit.warnings_count || 0} Warnings</div>
            <div class="chip chip-notice">ℹ️ ${audit.notices_count || 0} Notices</div>
            <div class="chip chip-pass">✅ ${summary.passedChecksCount || 24} Passed</div>
          </div>
        </div>

        <!-- Issues Summary Breakdown -->
        <h2 class="section-header no-break">1. Critical Technical Findings</h2>
        ${issues.length === 0 ? `
          <div style="padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
            <strong>No technical SEO issues identified.</strong> All crawl parameters and markup standards met the evaluation criteria.
          </div>
        ` : `
          ${issues.map(iss => {
            const urlsSnippet = iss.affected_urls_json ? (typeof iss.affected_urls_json === 'string' ? JSON.parse(iss.affected_urls_json) : iss.affected_urls_json) : [];
            const sevClass = iss.severity.toLowerCase();

            return `
              <div class="issue-card ${sevClass} no-break">
                <div class="issue-header">
                  <span class="issue-title">${escapeHtml(iss.title)}</span>
                  <span class="issue-badge ${sevClass}">${iss.severity} &bull; ${iss.affected_count} ${iss.affected_count === 1 ? 'URL' : 'URLs'}</span>
                </div>
                <div class="issue-desc">${escapeHtml(iss.description)}</div>
                <div class="issue-remedy">
                  <strong>Recommended Remediation:</strong> ${escapeHtml(iss.recommendation)}
                </div>
                ${urlsSnippet.length > 0 ? `
                  <div style="margin-top: 8px; font-size: 8pt; color: #64748b;">
                    <strong>Affected Sample:</strong> <span class="font-mono">${escapeHtml(urlsSnippet.slice(0, 5).map(u => typeof u === 'string' ? u : (u.url || String(u))).join(', '))}</span>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        `}

        <div class="page-break"></div>

        <!-- Crawled Pages Summary Table -->
        <h2 class="section-header no-break">2. Crawled Pages Inventory (${pages.length} Pages)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">URL</th>
              <th style="width: 10%;">Status</th>
              <th style="width: 15%;">Indexability</th>
              <th style="width: 25%;">Title Tag</th>
              <th style="width: 15%;">Depth & Links</th>
            </tr>
          </thead>
          <tbody>
            ${pages.slice(0, 100).map(p => `
              <tr>
                <td class="font-mono" style="font-size: 8pt;">${escapeHtml(p.url)}</td>
                <td class="font-mono ${p.status_code === 200 ? 'text-success' : 'text-danger'}">${p.status_code || 'Err'}</td>
                <td><span class="${p.indexable ? 'text-success' : 'text-warning'}">${p.indexable ? 'Indexable' : 'Non-Indexable'}</span></td>
                <td>${escapeHtml(p.title ? (p.title.length > 45 ? p.title.slice(0, 45) + '...' : p.title) : '(missing)')}</td>
                <td class="font-mono" style="font-size: 7.5pt;">Depth: ${p.crawl_depth}<br>In: ${p.incoming_links_count} | Out: ${p.outgoing_links_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Technical Appendix -->
        <h2 class="section-header no-break" style="margin-top: 36px;">3. Audit Specification & Appendix</h2>
        <table style="max-width: 600px;">
          <tbody>
            <tr>
              <td style="font-weight: 600; width: 40%;">Target Seed URL</td>
              <td class="font-mono">${escapeHtml(audit.url)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Crawl Scope</td>
              <td>${escapeHtml(config.crawlScope || 'Website Crawl')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Robots.txt Adherence</td>
              <td>${config.respectRobots !== false ? 'Enforced' : 'Ignored'}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">JavaScript Rendering</td>
              <td>${config.renderJs ? 'Playwright Headless Chromium' : 'Raw HTML Engine'}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Audit Completed</td>
              <td>${auditDate}</td>
            </tr>
          </tbody>
        </table>

      </body>
      </html>
    `;

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '12mm',
        right: '12mm'
      }
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  generateSeoAuditPdf
};
