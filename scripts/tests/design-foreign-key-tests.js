/**
 * scripts/tests/design-foreign-key-tests.js
 * Comprehensive Regression & Lifecycle Integrity Test Suite for Design -> Code
 *
 * Verifies:
 * Test 1: Valid authenticated user + valid project -> generation succeeds -> all foreign keys valid
 * Test 2: Valid authenticated user + nonexistent project -> clean validation error -> no orphan child record
 * Test 3: Valid authenticated user + another user's project -> rejected -> no cross-user access
 * Test 4: Standalone generation with no project -> succeeds with NULL project_id -> all foreign keys valid
 * Test 5: Generation persistence failure -> transaction rolls back cleanly -> no partial records
 * Test 6: Existing Project mode -> generation references the correct existing project
 * Test 7: History & Revisions -> saved generation can be loaded without foreign-key errors
 */

const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../server/data/database');
const { handleDesignToCodeRequest } = require('../../server/routes/design-to-code-api');
const { createSession } = require('../../server/middleware/auth');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name} - ${e.message}`);
    console.error(e.stack);
    failed++;
  }
}

// Mock HTTP request / response helper
function createMockHttp(method, path, body, sessionObj) {
  const sessionId = (sessionObj && typeof sessionObj === 'object') ? sessionObj.sessionId : sessionObj;
  const req = {
    method,
    url: path,
    headers: {
      cookie: sessionId ? `studio_session=${sessionId}` : '',
      authorization: sessionId ? `Bearer ${sessionId}` : '',
      'content-type': 'application/json'
    },
    on: function (event, cb) {
      if (event === 'data') {
        if (body) cb(Buffer.from(JSON.stringify(body)));
      }
      if (event === 'end') {
        cb();
      }
      return req;
    }
  };

  let statusCode = 200;
  let headers = {};
  let responseData = '';

  const res = {
    writeHead: function (code, h) {
      statusCode = code;
      headers = { ...headers, ...h };
      return res;
    },
    setHeader: function (name, val) {
      headers[name] = val;
    },
    end: function (data) {
      if (data) responseData = data.toString();
    },
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getBody: () => {
      try {
        return JSON.parse(responseData);
      } catch (_) {
        return responseData;
      }
    }
  };

  return { req, res };
}

(async function run() {
  console.log('\n================================================================');
  console.log('       DESIGN → CODE: FOREIGN KEY INTEGRITY & LIFECYCLE TESTS   ');
  console.log('================================================================\n');

  // Verify SQLite foreign keys enabled
  const fkStatus = db.pragma('foreign_keys', { simple: true });
  assert.strictEqual(fkStatus, 1, 'SQLite PRAGMA foreign_keys must be 1 (ON)');

  // Setup Test Users
  const user1Id = 'user-fk-1-' + Date.now();
  const user2Id = 'user-fk-2-' + Date.now();

  db.prepare(`
    INSERT INTO users (id, email, name) VALUES (?, ?, ?)
  `).run(user1Id, `${user1Id}@example.com`, 'User One');

  db.prepare(`
    INSERT INTO users (id, email, name) VALUES (?, ?, ?)
  `).run(user2Id, `${user2Id}@example.com`, 'User Two');

  const session1 = createSession(user1Id);
  const session2 = createSession(user2Id);

  // Setup Test Workspace Project for User 1
  const project1Id = 'proj-fk-1-' + Date.now();
  db.prepare(`
    INSERT INTO projects (id, user_id, name, website_url) VALUES (?, ?, ?, ?)
  `).run(project1Id, user1Id, 'Client Alpha Website', 'https://client-alpha.com');

  // Setup Test Workspace Project for User 2
  const project2Id = 'proj-fk-2-' + Date.now();
  db.prepare(`
    INSERT INTO projects (id, user_id, name, website_url) VALUES (?, ?, ?, ?)
  `).run(project2Id, user2Id, 'Client Beta Website', 'https://client-beta.com');

  // Minimal 1x1 base64 png
  const sampleDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Sample IR
  const sampleIr = {
    version: '1.0.0',
    source: { type: 'screenshot', name: 'test.png', detectedAt: new Date().toISOString() },
    canvas: { width: 1200, height: 800 },
    tokens: {
      colors: [{ name: 'primary', value: '#2563EB', usage: 'brand' }],
      typography: { fontFamily: 'sans-serif' },
      spacing: { sm: 8, md: 16, lg: 24 }
    },
    sections: [
      {
        id: 'hero',
        type: 'hero',
        name: 'Hero Banner',
        layout: { type: 'flex', direction: 'column' },
        elements: [
          { type: 'heading', level: 1, text: 'Next-Gen Developer Cockpit' },
          { type: 'button', label: 'Get Started', variant: 'primary' }
        ]
      }
    ]
  };

  // -------------------------------------------------------------
  // Test 1: Valid authenticated user + valid project -> generation succeeds -> all foreign keys valid
  // -------------------------------------------------------------
  await test('Test 1: Valid user + valid project -> generation succeeds with valid foreign keys', async () => {
    // 1. Analyze
    const { req: aReq, res: aRes } = createMockHttp('POST', '/api/design/analyze', {
      sourceType: 'screenshot',
      imageInput: sampleDataUri,
      projectId: project1Id
    }, session1);
    await handleDesignToCodeRequest(aReq, aRes, '/api/design/analyze');
    assert.strictEqual(aRes.getStatusCode(), 200, 'Analyze should return 200');
    const aData = aRes.getBody();
    assert.ok(aData.success);
    assert.ok(aData.analysisId);
    assert.ok(aData.sourceId);

    // 2. Generate
    const { req: gReq, res: gRes } = createMockHttp('POST', '/api/design/generate', {
      analysisId: aData.analysisId,
      sourceId: aData.sourceId,
      ir: aData.ir,
      preset: 'react-tailwind',
      projectId: project1Id
    }, session1);
    await handleDesignToCodeRequest(gReq, gRes, '/api/design/generate');
    assert.strictEqual(gRes.getStatusCode(), 200, 'Generate should return 200');
    const gData = gRes.getBody();
    assert.ok(gData.success);
    assert.ok(gData.generationId);
    assert.ok(Array.isArray(gData.files) && gData.files.length > 0);

    // Verify foreign key integrity with SQLite PRAGMA
    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0, 'No foreign key violations allowed in database');

    // Verify relations in SQLite
    const genRow = db.prepare('SELECT * FROM design_generations WHERE id = ?').get(gData.generationId);
    assert.ok(genRow);
    assert.strictEqual(genRow.user_id, user1Id);
    assert.strictEqual(genRow.analysis_id, aData.analysisId);

    // Verify linked design_project
    assert.ok(genRow.design_project_id);
    const dProj = db.prepare('SELECT * FROM design_projects WHERE id = ?').get(genRow.design_project_id);
    assert.ok(dProj);
    assert.strictEqual(dProj.project_id, project1Id);

    // Verify files
    const files = db.prepare('SELECT * FROM design_files WHERE generation_id = ?').all(gData.generationId);
    assert.ok(files.length > 0);

    // Verify revisions
    const revs = db.prepare('SELECT * FROM design_revisions WHERE generation_id = ?').all(gData.generationId);
    assert.ok(revs.length > 0);

    // Verify history & reports
    const hist = db.prepare("SELECT * FROM test_history WHERE user_id = ? AND test_type = 'design-to-code'").all(user1Id);
    assert.ok(hist.length > 0);
  });

  // -------------------------------------------------------------
  // Test 2: Valid authenticated user + nonexistent project -> clean validation error -> no orphan child record
  // -------------------------------------------------------------
  await test('Test 2: Nonexistent project -> clean 404 validation error, zero orphan records', async () => {
    const fakeProjectId = 'proj-nonexistent-' + Date.now();
    const beforeGenerationsCount = db.prepare('SELECT COUNT(*) as c FROM design_generations').get().c;

    const { req, res } = createMockHttp('POST', '/api/design/generate', {
      ir: sampleIr,
      preset: 'react-tailwind',
      projectId: fakeProjectId
    }, session1);

    await handleDesignToCodeRequest(req, res, '/api/design/generate');
    assert.strictEqual(res.getStatusCode(), 404, 'Must return 404 for nonexistent project');
    const body = res.getBody();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'PROJECT_NOT_FOUND');

    const afterGenerationsCount = db.prepare('SELECT COUNT(*) as c FROM design_generations').get().c;
    assert.strictEqual(afterGenerationsCount, beforeGenerationsCount, 'Must not create orphan generation record');

    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0);
  });

  // -------------------------------------------------------------
  // Test 3: Valid authenticated user + another user's project -> rejected -> no cross-user access
  // -------------------------------------------------------------
  await test('Test 3: Cross-user project access rejected with 404', async () => {
    // User 1 attempts to generate code referencing User 2's project (project2Id)
    const { req, res } = createMockHttp('POST', '/api/design/generate', {
      ir: sampleIr,
      preset: 'nextjs-tailwind',
      projectId: project2Id
    }, session1);

    await handleDesignToCodeRequest(req, res, '/api/design/generate');
    assert.strictEqual(res.getStatusCode(), 404, 'Must reject access to another user project with 404');
    const body = res.getBody();
    assert.strictEqual(body.code, 'PROJECT_NOT_FOUND');

    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0);
  });

  // -------------------------------------------------------------
  // Test 4: Standalone generation with no project -> succeeds with NULL project_id -> all foreign keys valid
  // -------------------------------------------------------------
  await test('Test 4: Standalone generation without project succeeds with NULL project_id', async () => {
    // 1. Analyze standalone
    const { req: aReq, res: aRes } = createMockHttp('POST', '/api/design/analyze', {
      sourceType: 'screenshot',
      imageInput: sampleDataUri,
      projectId: null
    }, session1);
    await handleDesignToCodeRequest(aReq, aRes, '/api/design/analyze');
    assert.strictEqual(aRes.getStatusCode(), 200);
    const aData = aRes.getBody();

    // 2. Generate standalone (no projectId)
    const { req: gReq, res: gRes } = createMockHttp('POST', '/api/design/generate', {
      analysisId: aData.analysisId,
      sourceId: aData.sourceId,
      ir: aData.ir,
      preset: 'html-scss',
      projectId: null
    }, session1);
    await handleDesignToCodeRequest(gReq, gRes, '/api/design/generate');
    assert.strictEqual(gRes.getStatusCode(), 200);
    const gData = gRes.getBody();
    assert.ok(gData.success);

    // Verify row has NULL design_project_id
    const genRow = db.prepare('SELECT * FROM design_generations WHERE id = ?').get(gData.generationId);
    assert.strictEqual(genRow.design_project_id, null, 'Standalone generation must have NULL design_project_id');
    assert.strictEqual(genRow.user_id, user1Id);

    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0);
  });

  // -------------------------------------------------------------
  // Test 5: Generation persistence failure -> transaction rolls back -> no partial history/revision records
  // -------------------------------------------------------------
  await test('Test 5: Persistence failure rolls back cleanly with zero partial records', async () => {
    const beforeGenerations = db.prepare('SELECT COUNT(*) as c FROM design_generations').get().c;
    const beforeFiles = db.prepare('SELECT COUNT(*) as c FROM design_files').get().c;
    const beforeRevisions = db.prepare('SELECT COUNT(*) as c FROM design_revisions').get().c;
    const beforeHistory = db.prepare('SELECT COUNT(*) as c FROM test_history').get().c;

    // Passing invalid analysisId that does not exist in DB
    const { req, res } = createMockHttp('POST', '/api/design/generate', {
      analysisId: 'nonexistent-analysis-id',
      preset: 'vue-scss'
    }, session1);

    await handleDesignToCodeRequest(req, res, '/api/design/generate');
    assert.strictEqual(res.getStatusCode(), 404, 'Must fail when analysisId is invalid');

    const afterGenerations = db.prepare('SELECT COUNT(*) as c FROM design_generations').get().c;
    const afterFiles = db.prepare('SELECT COUNT(*) as c FROM design_files').get().c;
    const afterRevisions = db.prepare('SELECT COUNT(*) as c FROM design_revisions').get().c;
    const afterHistory = db.prepare('SELECT COUNT(*) as c FROM test_history').get().c;

    assert.strictEqual(afterGenerations, beforeGenerations, 'No generation created on failure');
    assert.strictEqual(afterFiles, beforeFiles, 'No orphan files created on failure');
    assert.strictEqual(afterRevisions, beforeRevisions, 'No orphan revisions created on failure');
    assert.strictEqual(afterHistory, beforeHistory, 'No orphan history created on failure');

    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0);
  });

  // -------------------------------------------------------------
  // Test 6: Existing Project mode -> generation references the correct existing project
  // -------------------------------------------------------------
  await test('Test 6: Existing Project mode maps to valid design_projects linked to workspace project', async () => {
    const { req, res } = createMockHttp('POST', '/api/design/generate', {
      ir: sampleIr,
      preset: 'react-scss',
      projectId: project1Id,
      projectRules: { reuseButton: true, reuseCard: true }
    }, session1);

    await handleDesignToCodeRequest(req, res, '/api/design/generate');
    assert.strictEqual(res.getStatusCode(), 200);
    const body = res.getBody();
    assert.ok(body.generationId);

    const gen = db.prepare('SELECT * FROM design_generations WHERE id = ?').get(body.generationId);
    assert.ok(gen.design_project_id);

    const dProj = db.prepare('SELECT * FROM design_projects WHERE id = ?').get(gen.design_project_id);
    assert.strictEqual(dProj.project_id, project1Id);
    assert.strictEqual(dProj.user_id, user1Id);

    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0);
  });

  // -------------------------------------------------------------
  // Test 7: History & Revisions -> saved generation can be loaded without foreign-key errors
  // -------------------------------------------------------------
  await test('Test 7: History & Revisions can be retrieved cleanly without foreign-key errors', async () => {
    const { req: hReq, res: hRes } = createMockHttp('GET', '/api/design/history', null, session1);
    await handleDesignToCodeRequest(hReq, hRes, '/api/design/history');
    assert.strictEqual(hRes.getStatusCode(), 200);
    const hData = hRes.getBody();
    assert.ok(hData.success);
    assert.ok(Array.isArray(hData.history));
    assert.ok(hData.history.length > 0);

    const firstItem = hData.history[0];
    assert.ok(firstItem.generation_id);

    // Retrieve full generation by ID
    const { req: gReq, res: gRes } = createMockHttp('GET', `/api/design/generations/${firstItem.generation_id}`, null, session1);
    await handleDesignToCodeRequest(gReq, gRes, `/api/design/generations/${firstItem.generation_id}`);
    assert.strictEqual(gRes.getStatusCode(), 200);
    const gData = gRes.getBody();
    assert.ok(gData.success);
    assert.strictEqual(gData.generation.id, firstItem.generation_id);
    assert.ok(Array.isArray(gData.files));
    assert.ok(gData.files.length > 0);

    // Test refinement revision creation on this generation
    const { req: rReq, res: rRes } = createMockHttp('POST', '/api/design/refine', {
      generationId: firstItem.generation_id,
      prompt: 'Change button color to emerald'
    }, session1);
    await handleDesignToCodeRequest(rReq, rRes, '/api/design/refine');
    assert.strictEqual(rRes.getStatusCode(), 200);
    const rData = rRes.getBody();
    assert.ok(rData.success);

    // Check revision was stored
    const revs = db.prepare('SELECT * FROM design_revisions WHERE generation_id = ?').all(firstItem.generation_id);
    assert.ok(revs.length >= 2); // Initial + refinement

    const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
    assert.strictEqual(fkErrors.length, 0);
  });

  // Clean up test data
  db.prepare('DELETE FROM test_history WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM reports WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM design_generations WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM design_analyses WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM design_sources WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM design_projects WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM projects WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(user1Id, user2Id);

  console.log('\n================================================================');
  console.log(`  FOREIGN KEY TESTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
})();
