const http = require('http');
const fs = require('fs');
const path = require('path');

// Auto-load environment variables from .env if present
const envFilePath = path.join(__dirname, '.env');
if (fs.existsSync(envFilePath)) {
  try {
    const envData = fs.readFileSync(envFilePath, 'utf8');
    envData.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k && process.env[k] === undefined) {
            process.env[k] = v;
          }
        }
      }
    });
  } catch (e) {
    console.warn('[server] Failed to parse .env file:', e.message);
  }
}
const { handleQaScan, handlePhase2Qa } = require('./server/routes/qa');
const { handleResponsiveRequest } = require('./server/routes/responsive');
const { handleApiTesterRequest } = require('./server/routes/api-tester');
const { handleAuthRequest } = require('./server/routes/auth');
const { handleProjectsRequest } = require('./server/routes/projects-api');
const { handleHistoryRequest } = require('./server/routes/history-api');
const { handleReportsRequest } = require('./server/routes/reports-api');
const { handleScreenshotsRequest } = require('./server/routes/screenshots-api');
const { handleBaselinesRequest } = require('./server/routes/baselines-api');
const { handleDashboardRequest } = require('./server/routes/dashboard-api');
const { handleSeoAuditRequest } = require('./server/routes/seo-audit-api');
const { handleSeoIntelligenceRequest } = require('./server/routes/seo-intelligence-api');
const { handleDesignToCodeRequest } = require('./server/routes/design-to-code-api');
const { handleSchemaRequest } = require('./server/routes/schema-api');
const { handleVisualCssRequest } = require('./server/routes/visual-css-engineer-api');
const { handleAcfArchitectRequest } = require('./server/routes/acf-architect-api');
const { handleArchitectureRequest } = require('./server/routes/architecture-api');

const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || HOST}`);

  // CORS / Preflight headers
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Routing ---

  // Auth Routing
  if (parsedUrl.pathname.startsWith('/api/auth/')) {
    handleAuthRequest(req, res, parsedUrl.pathname);
    return;
  }

  // Dashboard Aggregates Routing
  if (parsedUrl.pathname === '/api/dashboard') {
    handleDashboardRequest(req, res, parsedUrl.pathname);
    return;
  }

  // Projects Routing
  if (parsedUrl.pathname === '/api/projects' || parsedUrl.pathname.startsWith('/api/projects/')) {
    handleProjectsRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // History Routing
  if (parsedUrl.pathname === '/api/history' || parsedUrl.pathname.startsWith('/api/history/')) {
    handleHistoryRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Reports Routing
  if (parsedUrl.pathname === '/api/reports' || parsedUrl.pathname.startsWith('/api/reports/')) {
    handleReportsRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Screenshots Routing
  if (parsedUrl.pathname === '/api/screenshots' || parsedUrl.pathname.startsWith('/api/screenshots/')) {
    handleScreenshotsRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Visual Baselines Routing
  if (parsedUrl.pathname === '/api/baselines' || parsedUrl.pathname.startsWith('/api/baselines/')) {
    handleBaselinesRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Website QA Scanning
  if (parsedUrl.pathname === '/api/qa/scan') {
    handleQaScan(req, res);
    return;
  }

  // Automated QA Phase 2 Runner
  if (parsedUrl.pathname === '/api/qa/phase2-run') {
    handlePhase2Qa(req, res);
    return;
  }

  // API Tester
  if (parsedUrl.pathname.startsWith('/api/tester/')) {
    handleApiTesterRequest(req, res, parsedUrl.pathname);
    return;
  }

  // Responsive Tester
  if (parsedUrl.pathname.startsWith('/api/responsive/')) {
    handleResponsiveRequest(req, res, parsedUrl.pathname);
    return;
  }

  // SEO Audit Routing
  if (parsedUrl.pathname === '/api/seo-audits' || parsedUrl.pathname.startsWith('/api/seo-audits/')) {
    handleSeoAuditRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // SEO Intelligence Routing (GSC, Bing, Ahrefs, PageSpeed, Competitors, Logs)
  if (parsedUrl.pathname.startsWith('/api/seo/')) {
    handleSeoIntelligenceRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Design -> Code Studio Routing
  if (parsedUrl.pathname.startsWith('/api/design/')) {
    handleDesignToCodeRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Schema Generator Workspace Routing
  if (parsedUrl.pathname.startsWith('/api/schema')) {
    handleSchemaRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Visual CSS Engineer Routing
  if (parsedUrl.pathname.startsWith('/api/visual-css')) {
    handleVisualCssRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // ACF Architect Routing
  if (parsedUrl.pathname.startsWith('/api/acf-architect') || parsedUrl.pathname.startsWith('/api/acf')) {
    handleAcfArchitectRequest(req, res, parsedUrl.pathname, parsedUrl.searchParams);
    return;
  }

  // Architecture Graph & Context Routing
  if (parsedUrl.pathname.startsWith('/api/architecture')) {
    handleArchitectureRequest(req, res, parsedUrl.pathname);
    return;
  }

  // Redirect legacy /acf-generator to /acf-architect
  if (parsedUrl.pathname === '/acf-generator' || parsedUrl.pathname === '/acf-generator/') {
    res.writeHead(302, { Location: '/acf-architect' });
    res.end();
    return;
  }

  // --- Static File Serving ---
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(parsedUrl.pathname);
  } catch (e) {
    decodedPath = parsedUrl.pathname;
  }
  let safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  
  if (safePath === '/' || safePath === '' || safePath === '/seo-audit' || safePath === 'seo-audit' || safePath === '/profile' || safePath === 'profile' || safePath === '/schema-generator' || safePath === 'schema-generator' || safePath === '/visual-css-engineer' || safePath === 'visual-css-engineer' || safePath === '/ai-css' || safePath === 'ai-css' || safePath === '/acf-architect' || safePath === 'acf-architect' || safePath === '/architecture' || safePath === 'architecture') {
    safePath = '/index.html';
  }

  let filePath = path.join(BASE_DIR, safePath);

  // If path is a directory, serve index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[testing-ai] Node.js server running at http://${HOST}:${PORT}/`);
  console.log(`[testing-ai] Accessible via domain at http://testing-ai.local/`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  server.close(() => {
    console.log('[testing-ai] Server stopped.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('[testing-ai] Server stopped.');
    process.exit(0);
  });
});
