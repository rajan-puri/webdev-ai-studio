/**
 * scripts/tests/test-architecture-graph.js
 * Comprehensive automated Playwright test suite for WebDev AI Studio:
 * Architecture Knowledge Graph & AI Context Token Optimization Engine
 * Verifies: Viewport Centering & Fit, Level-of-Detail (LOD) Readability,
 * Community Layout, Selected/Hovered Highlights, and Data Integrity (912 nodes / 1,470 edges).
 */

const { chromium } = require('playwright');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name} ${details ? '- ' + details : ''}`);
  }
}

async function requestJson(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('\n======================================================');
  console.log('TEST SUITE: ARCHITECTURE GRAPH & AI CONTEXT ENGINE');
  console.log('======================================================\n');

  // --- 1. REST API & DATA INTEGRITY VERIFICATION ---
  console.log('--- 1. Backend REST API & Data Integrity Tests ---');

  // Test 1: GET /api/architecture/graph
  const graphRes = await requestJson('/api/architecture/graph');
  logTest('GET /api/architecture/graph returns status 200', graphRes.status === 200);
  logTest('Graph response has nodes and edges', Array.isArray(graphRes.data?.nodes) && Array.isArray(graphRes.data?.edges));
  logTest('All 912 real nodes preserved in graph data', graphRes.data?.nodes?.length >= 912, `Count: ${graphRes.data?.nodes?.length}`);
  logTest('All 1,470 real relations preserved in graph data', graphRes.data?.edges?.length >= 1470, `Count: ${graphRes.data?.edges?.length}`);
  logTest('Graph includes high-impact nodes ranking', Array.isArray(graphRes.data?.stats?.highImpactNodes) && graphRes.data?.stats?.highImpactNodes.length > 0);

  // Test 2: Node Detail
  const sampleNode = graphRes.data.nodes.find(n => n.type === 'FUNCTION' || n.type === 'FILE');
  const nodeDetail = await requestJson(`/api/architecture/node/${encodeURIComponent(sampleNode.id)}`);
  logTest('GET /api/architecture/node/:id returns node properties', nodeDetail.status === 200 && nodeDetail.data?.node?.id === sampleNode.id);
  logTest('Node detail includes incoming and outgoing edges', Array.isArray(nodeDetail.data?.inEdges) && Array.isArray(nodeDetail.data?.outEdges));

  // Test 3: Shortest Path
  const startNode = graphRes.data.nodes.find(n => n.type === 'TOOL');
  const endNode = graphRes.data.nodes.find(n => n.type === 'TABLE');
  if (startNode && endNode) {
    const pathRes = await requestJson(`/api/architecture/path?source=${encodeURIComponent(startNode.id)}&target=${encodeURIComponent(endNode.id)}`);
    logTest('GET /api/architecture/path executes BFS shortest path', pathRes.status === 200 && pathRes.data.success !== undefined);
  }

  // Test 4: Neighborhood Subgraph
  const nHood = await requestJson(`/api/architecture/neighborhood?nodeId=${encodeURIComponent(sampleNode.id)}&hops=1`);
  logTest('GET /api/architecture/neighborhood extracts 1-hop subgraph', nHood.status === 200 && Array.isArray(nHood.data?.nodes));

  // Test 5: Impact Analysis
  const impact = await requestJson('/api/architecture/impact/file:server/data/database.js');
  logTest('GET /api/architecture/impact/:id computes blast radius', impact.status === 200 && impact.data?.riskLevel);
  logTest('Database impact is correctly classified as CRITICAL or HIGH', ['CRITICAL', 'HIGH'].includes(impact.data?.riskLevel));
  logTest('Impact analysis reports affected routes and tools', impact.data?.stats?.affectedRoutesCount >= 0 && impact.data?.stats?.affectedToolsCount >= 0);

  // Test 6: AI Context Preview & Token Reduction
  const preview = await requestJson('/api/architecture/context/preview', 'POST', {
    query: 'acf php template generation',
    tokenBudget: 8000,
    strategy: 'graph_optimized'
  });
  logTest('POST /api/architecture/context/preview slices AST', preview.status === 200 && preview.data?.snippetCount > 0);
  logTest('Graph optimization reduces tokens vs full file baseline', preview.data?.reductionPercent > 20, `Achieved ${preview.data?.reductionPercent}% reduction`);
  logTest('Packed tokens fit strictly within 8000 budget', preview.data?.packedTokens <= 8000, `Tokens: ${preview.data?.packedTokens}`);

  // Test 7: AI Context Query Execution
  const aiQuery = await requestJson('/api/architecture/context/query', 'POST', {
    query: 'How does ACF Architect export field schemas?',
    tokenBudget: 8000
  });
  logTest('POST /api/architecture/context/query executes with measured metrics', aiQuery.status === 200 && aiQuery.data?.metrics);
  logTest('Recorded input tokens and token reduction in metrics', aiQuery.data?.metrics?.inputTokens > 0 && aiQuery.data?.metrics?.reductionPercent !== undefined);
  logTest('Architectural analysis response returned', typeof aiQuery.data?.response === 'string' && aiQuery.data.response.length > 50);

  // Test 8: Query History
  const history = await requestJson('/api/architecture/history');
  logTest('GET /api/architecture/history returns logged queries', history.status === 200 && Array.isArray(history.data?.queries));

  // --- 2. FRONTEND PLAYWRIGHT AUTOMATION ---
  console.log('\n--- 2. Frontend Playwright UI Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Navigate directly to /architecture
    await page.goto('http://127.0.0.1:3000/architecture', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Verify view container is displayed
    const isViewVisible = await page.$eval('#viewArchitecture', el => window.getComputedStyle(el).display !== 'none');
    logTest('Direct route /architecture displays #viewArchitecture', isViewVisible);

    // Verify Toolbar Elements
    const titleText = await page.$eval('.arch-title span', el => el.textContent.trim());
    logTest('Title displays "Architecture Graph"', titleText.includes('Architecture Graph'));

    const statusPillText = await page.$eval('#archStatusText', el => el.textContent.trim());
    logTest('Live status pill displays index count', statusPillText.includes('nodes'), `Status: "${statusPillText}"`);

    // Verify Canvas
    const canvasExists = await page.$eval('#archCanvas', el => el && el.width > 0 && el.height > 0);
    logTest('Interactive Canvas rendered with positive dimensions', canvasExists);

    // ==========================================
    // BUG 1 VERIFICATION: Centering & Viewport Fit
    // ==========================================
    console.log('\n--- Bug 1 Verification: Initial Centering & Viewport Fit ---');

    const viewportState = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      const container = tool.canvas.parentElement;
      const rect = container.getBoundingClientRect();
      return {
        panX: tool.panX,
        panY: tool.panY,
        zoom: tool.zoom,
        containerWidth: rect.width,
        containerHeight: rect.height,
        canvasWidth: tool.canvas.width,
        canvasHeight: tool.canvas.height
      };
    });

    logTest('Canvas container has positive viewport area', viewportState.containerWidth > 300 && viewportState.containerHeight > 300, `Size: ${viewportState.containerWidth}x${viewportState.containerHeight}`);
    logTest('Graph is NOT stuck at 0,0 top-left corner', viewportState.panX !== 0 && viewportState.panY !== 0, `Pan: (${viewportState.panX.toFixed(1)}, ${viewportState.panY.toFixed(1)})`);
    logTest('Initial fit zoom is scaled comfortably for 912 nodes', viewportState.zoom >= 0.18 && viewportState.zoom <= 0.8, `Zoom: ${viewportState.zoom.toFixed(3)}`);

    // Test Fit Button Action
    await page.click('#archFitScreen');
    await page.waitForTimeout(300);
    const fitState = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      return { panX: tool.panX, panY: tool.panY, zoom: tool.zoom };
    });
    logTest('Fit button reliably calculates viewport fit', fitState.zoom > 0.15 && fitState.zoom < 1.0, `Fit Zoom: ${fitState.zoom.toFixed(3)}`);

    // Test Zoom In / Out Buttons
    const beforeZoom = fitState.zoom;
    await page.click('#archZoomIn');
    await page.waitForTimeout(200);
    const zoomedIn = await page.evaluate(() => window.architectureGraphInstance.zoom);
    logTest('Zoom In button increases zoom factor', zoomedIn > beforeZoom, `${beforeZoom.toFixed(3)} -> ${zoomedIn.toFixed(3)}`);

    await page.click('#archResetView');
    await page.waitForTimeout(200);
    const resetZoom = await page.evaluate(() => window.architectureGraphInstance.zoom);
    logTest('Reset View restores overview fit', Math.abs(resetZoom - fitState.zoom) < 0.05);

    // ==========================================
    // BUG 2 VERIFICATION: Level-of-Detail (LOD) Readability
    // ==========================================
    console.log('\n--- Bug 2 Verification: Level-of-Detail (LOD) & Readability ---');

    // At overview zoom: ensure no massive pile of 912 text labels
    const overviewLOD = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      tool.fitGraphToViewport({ padding: 60 });
      // Count how many node labels would be rendered under the current zoom (< 0.55)
      let labelCount = 0;
      tool.filteredNodes.forEach(node => {
        const isSelected = tool.selectedNode && tool.selectedNode.id === node.id;
        const isHovered = tool.hoveredNode && tool.hoveredNode.id === node.id;
        if (isSelected || isHovered) labelCount++;
        else if (tool.zoom >= 1.8) labelCount++;
        else if (tool.zoom >= 1.2 && (node.degree_in + node.degree_out >= 8)) labelCount++;
        else if (tool.zoom >= 0.75 && (node.degree_in + node.degree_out >= 25)) labelCount++;
      });
      return { zoom: tool.zoom, labelCount, totalNodes: tool.nodes.length };
    });

    logTest('Overview zoom does NOT render 912 full text labels', overviewLOD.labelCount === 0 || overviewLOD.labelCount < 10, `Rendered labels: ${overviewLOD.labelCount} of ${overviewLOD.totalNodes} nodes`);
    logTest('Community centroids populated for overview orientation', await page.evaluate(() => window.architectureGraphInstance.subsystemCentroids.size >= 10));

    // Verify Subsystems in Left Sidebar
    const subsystemCount = await page.$$eval('.arch-subsystem-item', els => els.length);
    logTest('Left sidebar populates subsystem clusters', subsystemCount >= 5, `Found ${subsystemCount} subsystems`);

    // Verify High Impact Nodes in Left Sidebar
    const impactNodesCount = await page.$$eval('#archHighImpactList .arch-conn-item', els => els.length);
    logTest('Left sidebar populates high-impact nodes list', impactNodesCount > 0);

    // Click first High-Impact Node to test Selection & Inspector
    await page.click('#archHighImpactList .arch-conn-item:first-child');
    await page.waitForTimeout(600);

    const selectedState = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      return {
        hasSelectedNode: !!tool.selectedNode,
        selectedName: tool.selectedNode ? tool.selectedNode.name : null
      };
    });
    logTest('Selected node is tracked in state', selectedState.hasSelectedNode, `Selected: ${selectedState.selectedName}`);

    const inspectorTitle = await page.$eval('#archInspectorTitle', el => el.textContent.trim());
    logTest('Clicking node updates Right Inspector with title', inspectorTitle.length > 0, `Title: ${inspectorTitle}`);

    const hasProperties = await page.$eval('#archInspectorBody', el => el.innerHTML.includes('Properties'));
    logTest('Right Inspector shows node properties and relations', hasProperties);

    // Test "What breaks?" button in UI
    await page.click('#archBtnAnalyzeImpact');
    await page.waitForTimeout(800);

    const impactRendered = await page.$eval('#archImpactSection', el => el.style.display !== 'none' && el.innerHTML.includes('RISK LEVEL'));
    logTest('Clicking "What breaks?" renders impact blast radius in UI', impactRendered);

    // Test Search Input: typing "acf" centers on matching node and zooms in
    await page.fill('#archSearchInput', 'acf');
    await page.waitForTimeout(600);

    const searchState = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      return {
        zoom: tool.zoom,
        hasSelected: !!tool.selectedNode,
        name: tool.selectedNode?.name
      };
    });
    logTest('Search centers and zooms to detail level (> 1.0)', searchState.zoom >= 1.0, `Zoom: ${searchState.zoom.toFixed(2)}`);
    logTest('Search automatically selects top matching node', searchState.hasSelected, `Selected: ${searchState.name}`);

    // Test Subsystem Filter: Selecting "acf" filters and auto-fits
    await page.selectOption('#archSubsystemFilter', 'acf');
    await page.waitForTimeout(500);

    const filterState = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      return {
        filteredCount: tool.filteredNodes.length,
        zoom: tool.zoom
      };
    });
    logTest('Subsystem filter updates filtered node set', filterState.filteredCount > 0 && filterState.filteredCount < 900, `Filtered: ${filterState.filteredCount}`);
    logTest('Subsystem filter auto-fits viewport comfortably', filterState.zoom > 0.3, `Zoom: ${filterState.zoom.toFixed(2)}`);

    // Reset Subsystem filter back to all
    await page.selectOption('#archSubsystemFilter', 'all');
    await page.waitForTimeout(500);

    // Test AI Context Drawer Interaction
    const drawer = await page.$('#archAiDrawer');
    logTest('AI Context Drawer is rendered', !!drawer);

    await page.fill('#archPromptInput', 'ACF WordPress field registration');
    await page.click('#archBtnPreviewContext');
    await page.waitForTimeout(1000);

    const baselineTokens = await page.$eval('#archScoreBaseline', el => el.textContent.trim());
    const packedTokens = await page.$eval('#archScorePacked', el => el.textContent.trim());
    const reductionPercent = await page.$eval('#archScoreReduction', el => el.textContent.trim());

    logTest('Scorecard shows Baseline tokens count', baselineTokens !== '-' && parseInt(baselineTokens.replace(/,/g, '')) > 0, `Baseline: ${baselineTokens}`);
    logTest('Scorecard shows Graph-packed tokens count', packedTokens !== '-' && parseInt(packedTokens.replace(/,/g, '')) > 0, `Packed: ${packedTokens}`);
    logTest('Scorecard displays real token reduction percentage', reductionPercent.includes('%'), `Reduction: ${reductionPercent}`);

    const snippetsLoaded = await page.$$eval('.arch-snippet-item', els => els.length);
    logTest('AI Context Drawer populates surgical code snippets list', snippetsLoaded > 0, `Snippets count: ${snippetsLoaded}`);

    // Test Ask AI with Graph in UI
    await page.click('#archBtnExecuteAiQuery');
    await page.waitForTimeout(2000);

    const responseText = await page.$eval('#archResponseBox', el => el.textContent.trim());
    logTest('AI Assistant responds with architectural synthesis', responseText.includes('Architecture Graph') || responseText.includes('Component') || responseText.length > 60);

    // Test Sidebar Navigation to Architecture Graph
    await page.click('#navDashboard');
    await page.waitForTimeout(500);
    const isDashVisible = await page.$eval('#viewDashboard', el => window.getComputedStyle(el).display !== 'none');
    logTest('Navigation to Overview works', isDashVisible);

    await page.click('#navArchitectureGraph');
    await page.waitForTimeout(600);
    const isArchVisibleAgain = await page.$eval('#viewArchitecture', el => window.getComputedStyle(el).display !== 'none');
    logTest('Navigation back to Architecture Graph via sidebar works', isArchVisibleAgain);

    // Verify onViewActivated centered and maintained positive viewport dimensions
    const renavState = await page.evaluate(() => {
      const tool = window.architectureGraphInstance;
      return { panX: tool.panX, panY: tool.panY, zoom: tool.zoom };
    });
    logTest('Renavigation maintains valid centered viewport coordinates', renavState.panX !== 0 && renavState.zoom > 0.15);

    // Test Dashboard Tile Click
    await page.click('#navDashboard');
    await page.waitForTimeout(500);
    await page.click('#toolCardArchitecture');
    await page.waitForTimeout(600);
    const isArchVisibleViaTile = await page.$eval('#viewArchitecture', el => window.getComputedStyle(el).display !== 'none');
    logTest('Dashboard toolkit tile opens Architecture Graph', isArchVisibleViaTile);

  } catch (err) {
    console.error('Playwright UI test error:', err);
    logTest('Playwright UI flow completed without unexpected crash', false, err.message);
  } finally {
    await browser.close();
  }

  // --- Final Summary ---
  console.log('\n======================================================');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('======================================================\n');

  process.exit(failedTests === 0 ? 0 : 1);
})();
