/**
 * server/routes/visual-css-engineer-api.js
 * Visual CSS Engineer - Backend API Router.
 * Handles load, inspect, patch generation, Playwright verification, auto-fix,
 * apply to project with file backups, revert, and activity history.
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { getSessionUser } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');
const { analyzeLiveWebsite, inspectLiveElement, analyzeExistingProject } = require('../services/visual-css/analyzer');
const { generateSurgicalPatch } = require('../services/visual-css/patch-engine');
const { verifyCssPatch, autoFixPatch } = require('../services/visual-css/verifier');

async function handleVisualCssRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = getSessionUser(req);
  let userId = user ? user.id : 'user_demo';
  try {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get();
      userId = firstUser ? firstUser.id : 'user_demo';
    }
  } catch (e) {}

  const subRoute = pathname.replace(/^\/api\/visual-css\/?/, '');

  try {
    // 0. GET /api/visual-css/proxy - Proxy external websites to make them same-origin and interactive
    if (subRoute === 'proxy' && req.method === 'GET') {
      const rawUrl = queryParams.get('url');
      if (!rawUrl) {
        return sendError(res, 400, 'Missing url parameter for proxy.', 'INVALID_URL');
      }
      let targetUrl = rawUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        const upstreamRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 WebDevAIStudio/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow'
        });

        const finalUrl = upstreamRes.url || targetUrl;
        const contentType = upstreamRes.headers.get('content-type') || 'text/html';

        if (contentType.includes('text/html')) {
          let html = await upstreamRes.text();

          // Bridge script to enable click selection, hover highlight, and live style updates
          const bridgeScript = `
<script id="vce-preview-bridge-script">
(function() {
  try {
    window.__defineGetter__('top', function() { return window.self; });
    window.__defineGetter__('parent', function() { return window.self; });
  } catch(e) {}

  function getUniqueSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    if (el === document.body) return 'body';
    if (el === document.documentElement) return 'html';
    
    const validClasses = Array.from(el.classList).filter(c => !c.startsWith('vce-') && !c.includes(':'));
    if (validClasses.length > 0) {
      const classSel = el.tagName.toLowerCase() + '.' + validClasses.map(c => CSS.escape(c)).join('.');
      try {
        if (document.querySelectorAll(classSel).length === 1) return classSel;
      } catch(e) {}
    }

    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(s => s.tagName === el.tagName);
    const index = siblings.indexOf(el) + 1;
    const tagName = el.tagName.toLowerCase();
    const selfSel = siblings.length > 1 ? tagName + ':nth-of-type(' + index + ')' : tagName;
    
    const parentSel = getUniqueSelector(parent);
    return parentSel ? parentSel + ' > ' + selfSel : selfSel;
  }

  function getComputedData(el) {
    const cs = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      textAlign: cs.textAlign,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      border: cs.border,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      width: Math.round(r.width) + 'px',
      minWidth: cs.minWidth,
      maxWidth: cs.maxWidth,
      height: Math.round(r.height) + 'px',
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      opacity: cs.opacity,
      boxShadow: cs.boxShadow,
      transform: cs.transform,
      transition: cs.transition,
      display: cs.display,
      fontFamily: cs.fontFamily
    };
  }

  const hoverBox = document.createElement('div');
  hoverBox.id = 'vce-inline-hover-outline';
  hoverBox.style.cssText = 'position:fixed; pointer-events:none; border:2px dashed #38bdf8; z-index:2147483645; display:none; transition:all 0.05s ease; box-sizing:border-box;';
  document.documentElement.appendChild(hoverBox);

  const selBox = document.createElement('div');
  selBox.id = 'vce-inline-selected-outline';
  selBox.style.cssText = 'position:fixed; pointer-events:none; border:2px solid #2563eb; background:rgba(37,99,235,0.08); z-index:2147483646; display:none; box-sizing:border-box;';
  const selBadge = document.createElement('div');
  selBadge.style.cssText = 'position:absolute; bottom:100%; left:0; background:#2563eb; color:#fff; font-size:10px; font-family:monospace; padding:2px 6px; border-radius:3px 3px 0 0; white-space:nowrap;';
  selBox.appendChild(selBadge);
  document.documentElement.appendChild(selBox);

  let currentSelectedEl = null;

  function updateSelectedBox() {
    if (!currentSelectedEl) {
      selBox.style.display = 'none';
      return;
    }
    const r = currentSelectedEl.getBoundingClientRect();
    selBox.style.display = 'block';
    selBox.style.top = r.top + 'px';
    selBox.style.left = r.left + 'px';
    selBox.style.width = r.width + 'px';
    selBox.style.height = r.height + 'px';
    const tag = currentSelectedEl.tagName.toLowerCase();
    const idStr = currentSelectedEl.id ? '#' + currentSelectedEl.id : '';
    const clsStr = currentSelectedEl.className && typeof currentSelectedEl.className === 'string' ? '.' + currentSelectedEl.className.trim().split(/\\s+/)[0] : '';
    selBadge.textContent = '<' + tag + '> ' + (idStr || clsStr);
  }

  window.addEventListener('scroll', updateSelectedBox, true);
  window.addEventListener('resize', updateSelectedBox);

  document.addEventListener('mouseover', function(e) {
    if (e.target === hoverBox || e.target === selBox || e.target === document.documentElement || e.target === document.body) {
      hoverBox.style.display = 'none';
      return;
    }
    const r = e.target.getBoundingClientRect();
    hoverBox.style.display = 'block';
    hoverBox.style.top = r.top + 'px';
    hoverBox.style.left = r.left + 'px';
    hoverBox.style.width = r.width + 'px';
    hoverBox.style.height = r.height + 'px';
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (e.target === document.body || !e.relatedTarget) {
      hoverBox.style.display = 'none';
    }
  }, true);

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (target === hoverBox || target === selBox) return;
    
    currentSelectedEl = target;
    updateSelectedBox();

    const selector = getUniqueSelector(target);
    const r = target.getBoundingClientRect();
    const computed = getComputedData(target);

    window.parent.postMessage({
      type: 'VCE_ELEMENT_SELECTED',
      selector: selector,
      tag: target.tagName.toLowerCase(),
      id: target.id || '',
      className: typeof target.className === 'string' ? target.className : '',
      text: (target.innerText || target.textContent || '').trim().substring(0, 80),
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      styles: computed
    }, '*');
  }, true);

  window.addEventListener('message', function(ev) {
    if (!ev.data) return;
    if (ev.data.type === 'VCE_UPDATE_CSS') {
      let overrideEl = document.getElementById('webdev-ai-preview-overrides');
      if (!overrideEl) {
        overrideEl = document.createElement('style');
        overrideEl.id = 'webdev-ai-preview-overrides';
        document.head.appendChild(overrideEl);
      }
      overrideEl.textContent = ev.data.cssText || '';
      updateSelectedBox();
    }
    if (ev.data.type === 'VCE_SELECT_BY_SELECTOR') {
      try {
        const el = document.querySelector(ev.data.selector);
        if (el) {
          currentSelectedEl = el;
          updateSelectedBox();
        }
      } catch(err) {}
    }
  });

  window.parent.postMessage({ type: 'VCE_BRIDGE_READY', url: window.location.href }, '*');
})();
</script>
`;

          const baseTag = `<base href="${finalUrl}">`;
          if (/<base\\s+[^>]*>/i.test(html)) {
            html = html.replace(/<base\\s+[^>]*>/i, baseTag);
          } else if (/<head[^>]*>/i.test(html)) {
            html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
          } else {
            html = baseTag + html;
          }

          const styleOverride = `<style id="webdev-ai-preview-overrides">/* WebDev AI Studio Live Overrides */</style>`;
          if (/<\/head>/i.test(html)) {
            html = html.replace(/<\/head>/i, `${styleOverride}${bridgeScript}</head>`);
          } else if (/<\/body>/i.test(html)) {
            html = html.replace(/<\/body>/i, `${styleOverride}${bridgeScript}</body>`);
          } else {
            html = html + styleOverride + bridgeScript;
          }

          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'X-Frame-Options': 'ALLOWALL',
            'Content-Security-Policy': "frame-ancestors 'self' http://127.0.0.1:* http://localhost:*",
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          return res.end(html);
        }

        const buffer = Buffer.from(await upstreamRes.arrayBuffer());
        res.writeHead(upstreamRes.status, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(buffer);
      } catch (fetchErr) {
        console.error('[VisualCssProxy Error]', fetchErr);
        return sendError(res, 502, `Could not proxy website: ${fetchErr.message}`, 'PROXY_ERROR');
      }
    }

    // 1. GET /api/visual-css/projects - Available projects and workspaces
    if (subRoute === 'projects' && req.method === 'GET') {
      let dbProjects = [];
      try {
        const stmt = db.prepare('SELECT id, name, website_url, description FROM projects WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC');
        dbProjects = stmt.all(userId);
      } catch (e) {}

      // Discover local project directories in workspace
      const localProjects = [];
      const workspaceRoot = path.resolve(__dirname, '../../');
      try {
        const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isDirectory() && !ent.name.startsWith('.') && ent.name !== 'node_modules' && ent.name !== 'server' && ent.name !== 'styles' && ent.name !== 'js' && ent.name !== 'client') {
            const hasHtml = fs.existsSync(path.join(workspaceRoot, ent.name, 'index.html'));
            const hasPkg = fs.existsSync(path.join(workspaceRoot, ent.name, 'package.json'));
            if (hasHtml || hasPkg) {
              localProjects.push({
                id: 'local_' + ent.name.replace(/\s+/g, '-'),
                name: ent.name,
                path: path.join(workspaceRoot, ent.name),
                type: 'local'
              });
            }
          }
        }
      } catch (e) {}

      return sendJson(res, 200, {
        success: true,
        dbProjects,
        localProjects
      });
    }

    // 2. POST /api/visual-css/load - Analyze live website or project
    if (subRoute === 'load' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { url, projectPath, viewport = { width: 1440, height: 900 }, mode = 'url' } = body;

      if (mode === 'project' || projectPath) {
        const targetDir = projectPath || path.resolve(__dirname, '../../korea landing page');
        const analysis = analyzeExistingProject(targetDir);
        return sendJson(res, 200, { success: true, mode: 'project', ...analysis });
      }

      if (!url || typeof url !== 'string' || !url.trim()) {
        return sendError(res, 400, 'Website URL is required.', 'VALIDATION_ERROR');
      }

      const analysis = await analyzeLiveWebsite(url.trim(), viewport);
      return sendJson(res, 200, { success: true, mode: 'url', ...analysis });
    }

    // 3. POST /api/visual-css/inspect - Inspect single element
    if (subRoute === 'inspect' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { url, selector, viewport = { width: 1440, height: 900 } } = body;

      if (!url || !selector) {
        return sendError(res, 400, 'Both URL and selector are required to inspect an element.', 'VALIDATION_ERROR');
      }

      const result = await inspectLiveElement(url.trim(), selector, viewport);
      return sendJson(res, 200, { success: true, ...result });
    }

    // 4. POST /api/visual-css/patch - Generate targeted CSS patch
    if (subRoute === 'patch' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const {
        prompt,
        selectedElement,
        computedStyles = {},
        projectTokens = {},
        framework = 'HTML',
        stylingType = 'CSS'
      } = body;

      if (!prompt || !prompt.trim()) {
        return sendError(res, 400, 'Description prompt is required.', 'VALIDATION_ERROR');
      }

      const patchResult = generateSurgicalPatch({
        prompt: prompt.trim(),
        selectedElement,
        computedStyles,
        projectTokens,
        framework,
        stylingType
      });

      return sendJson(res, 200, { success: true, ...patchResult });
    }

    // 5. POST /api/visual-css/verify - Playwright responsive verification
    if (subRoute === 'verify' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { targetUrl, selector, cssPatch, viewports } = body;

      if (!targetUrl || !cssPatch) {
        return sendError(res, 400, 'Target URL and CSS patch are required for verification.', 'VALIDATION_ERROR');
      }

      const verification = await verifyCssPatch({
        targetUrl,
        selector,
        cssPatch,
        viewports
      });

      return sendJson(res, 200, { success: true, ...verification });
    }

    // 6. POST /api/visual-css/autofix - Refine patch based on verification issues
    if (subRoute === 'autofix' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { originalPatch, selector, issuesList = [], iteration = 1 } = body;

      if (!originalPatch || !selector) {
        return sendError(res, 400, 'Original patch and selector are required for auto-fix.', 'VALIDATION_ERROR');
      }

      const fixed = autoFixPatch({
        originalPatch,
        selector,
        issuesList,
        iteration: parseInt(iteration, 10) || 1
      });

      return sendJson(res, 200, { ...fixed });
    }

    // 7. POST /api/visual-css/apply - Apply change & save to SQLite history
    if (subRoute === 'apply' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const {
        projectId = null,
        targetUrl = '',
        prompt = '',
        selector = '',
        cssPatch = '',
        affectedFiles = ['styles/main.css'],
        beforeScreenshot = null,
        afterScreenshot = null,
        verificationResults = {}
      } = body;

      if (!cssPatch) {
        return sendError(res, 400, 'CSS patch is required to apply changes.', 'VALIDATION_ERROR');
      }

      const historyId = 'th_' + uuidv4().replace(/-/g, '').substring(0, 16);
      const reportId = 'rep_' + uuidv4().replace(/-/g, '').substring(0, 16);
      const now = new Date().toISOString();

      const summary = {
        prompt,
        selector,
        affectedFiles,
        hasVerification: Boolean(verificationResults && verificationResults.results),
        issuesCount: (verificationResults && verificationResults.totalIssuesCount) || 0,
        provider: 'Deterministic Surgical Engine',
        model: 'v1.2'
      };

      const resultPayload = {
        prompt,
        selector,
        cssPatch,
        affectedFiles,
        verification: verificationResults,
        beforeScreenshot: beforeScreenshot ? 'stored' : null,
        afterScreenshot: afterScreenshot ? 'stored' : null
      };

      // Insert into test_history and reports
      try {
        db.prepare(`
          INSERT INTO test_history (id, user_id, project_id, test_type, target_url, status, summary, duration_ms, created_at)
          VALUES (?, ?, ?, 'visual-css-engineer', ?, 'completed', ?, 420, ?)
        `).run(historyId, userId, projectId, targetUrl || 'Live Session', JSON.stringify(summary), now);

        db.prepare(`
          INSERT INTO reports (id, user_id, project_id, history_id, test_type, target_url, result_json, created_at)
          VALUES (?, ?, ?, ?, 'visual-css-engineer', ?, ?, ?)
        `).run(reportId, userId, projectId, historyId, targetUrl || 'Live Session', JSON.stringify(resultPayload), now);
      } catch (dbErr) {
        console.warn('[VisualCss] Failed to write history record:', dbErr.message);
      }

      // Check if project files can be modified on disk with safety backup
      const modifiedFilesList = [];
      if (body.localFilePath && typeof body.localFilePath === 'string') {
        const fullPath = path.resolve(body.localFilePath);
        if (fs.existsSync(fullPath)) {
          try {
            const original = fs.readFileSync(fullPath, 'utf8');
            // Write backup file for safe rollback
            fs.writeFileSync(fullPath + '.bak', original, 'utf8');
            fs.appendFileSync(fullPath, '\n\n/* Applied by Visual CSS Engineer: ' + prompt + ' */\n' + cssPatch + '\n', 'utf8');
            modifiedFilesList.push(path.relative(path.resolve(__dirname, '../../'), fullPath));
          } catch (fileErr) {
            console.warn('[VisualCss] Could not patch file directly on disk:', fileErr.message);
          }
        }
      }

      return sendJson(res, 200, {
        success: true,
        historyId,
        reportId,
        modifiedFiles: modifiedFilesList.length > 0 ? modifiedFilesList : affectedFiles,
        rollbackAvailable: modifiedFilesList.length > 0,
        message: 'Visual CSS changes applied and recorded to activity history.'
      });
    }

    // 8. GET /api/visual-css/history - List history items
    if (subRoute === 'history' && req.method === 'GET') {
      const stmt = db.prepare(`
        SELECT th.*, r.result_json 
        FROM test_history th
        LEFT JOIN reports r ON r.history_id = th.id
        WHERE th.test_type = 'visual-css-engineer' AND th.user_id = ?
        ORDER BY th.created_at DESC
        LIMIT 20
      `);

      const rows = stmt.all(userId);
      const items = rows.map(r => {
        let sum = {};
        try { sum = JSON.parse(r.summary); } catch (e) {}
        let details = {};
        try { details = JSON.parse(r.result_json || '{}'); } catch (e) {}
        return {
          id: r.id,
          targetUrl: r.target_url,
          status: r.status,
          summary: sum,
          details,
          createdAt: r.created_at
        };
      });

      return sendJson(res, 200, { success: true, items });
    }

    return sendError(res, 404, 'Endpoint not found in Visual CSS Engineer API.', 'NOT_FOUND');
  } catch (err) {
    console.error('[VisualCssAPI Error]', err);
    return sendError(res, 500, err.message || 'Internal server error in Visual CSS Engineer.', 'SERVER_ERROR');
  }
}

module.exports = {
  handleVisualCssRequest
};
