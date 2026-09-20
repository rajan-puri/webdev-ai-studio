/**
 * scripts/tests/verify-real-generation.js
 * End-to-end live verification of Design -> Code generation and SQLite records.
 */

const assert = require('assert');
const { db } = require('../../server/data/database');
const { handleDesignToCodeRequest } = require('../../server/routes/design-to-code-api');
const { createSession } = require('../../server/middleware/auth');
const { buildPreviewHtml } = require('../../server/services/design-to-code/generator/generator-engine');

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

(async function () {
  console.log('\n>>> Starting Real End-to-End Generation & SQLite Inspection...\n');

  // Verify foreign keys active
  const fkOn = db.pragma('foreign_keys', { simple: true });
  console.log('1. Checking PRAGMA foreign_keys:', fkOn === 1 ? 'ON (Verified)' : 'OFF (Error!)');
  assert.strictEqual(fkOn, 1);

  // Setup user and session
  const testUserId = 'user-real-' + Date.now();
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(testUserId, `${testUserId}@example.com`, 'Real Test User');
  const session = createSession(testUserId);

  const testProjId = 'proj-real-' + Date.now();
  db.prepare('INSERT INTO projects (id, user_id, name, website_url) VALUES (?, ?, ?, ?)').run(testProjId, testUserId, 'E2E Testing Project', 'https://e2e.example.com');

  const pngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const presetsToTest = [
    { preset: 'react-tailwind', label: 'React + Tailwind' },
    { preset: 'html-scss', label: 'HTML + SCSS' },
    { preset: 'react-scss', label: 'React + SCSS' },
    { preset: 'nextjs-tailwind', label: 'Next.js + Tailwind' },
    { preset: 'wordpress', label: 'WordPress + SCSS (ACF)', acfMode: true }
  ];

  for (const { preset, label, acfMode } of presetsToTest) {
    console.log(`\nTesting Preset: ${label} (${preset}) ...`);

    // Step 1: Upload Screenshot
    const { req: uReq, res: uRes } = createMockHttp('POST', '/api/design/upload', {
      dataUri: pngDataUri,
      imageName: `${preset}-sample.png`,
      projectId: testProjId
    }, session);
    await handleDesignToCodeRequest(uReq, uRes, '/api/design/upload');
    assert.strictEqual(uRes.getStatusCode(), 200, `Upload should return 200 for ${preset}`);
    const uData = uRes.getBody();
    assert.ok(uData.sourceId);

    // Step 2: Analyze Design
    const { req: aReq, res: aRes } = createMockHttp('POST', '/api/design/analyze', {
      sourceId: uData.sourceId,
      sourceType: 'screenshot',
      imageInput: pngDataUri,
      projectId: testProjId
    }, session);
    await handleDesignToCodeRequest(aReq, aRes, '/api/design/analyze');
    assert.strictEqual(aRes.getStatusCode(), 200, `Analyze should return 200 for ${preset}`);
    const aData = aRes.getBody();
    assert.ok(aData.analysisId);
    assert.ok(aData.ir);

    // Step 3: Generate Code
    const { req: gReq, res: gRes } = createMockHttp('POST', '/api/design/generate', {
      analysisId: aData.analysisId,
      sourceId: uData.sourceId,
      ir: aData.ir,
      preset,
      acfMode: !!acfMode,
      projectId: testProjId
    }, session);
    await handleDesignToCodeRequest(gReq, gRes, '/api/design/generate');
    assert.strictEqual(gRes.getStatusCode(), 200, `Generate should return 200 for ${preset}`);
    const gData = gRes.getBody();
    assert.ok(gData.success);
    assert.ok(gData.generationId);
    assert.ok(Array.isArray(gData.files));
    assert.ok(gData.files.length > 0);

    // Verify SQLite generation record
    const genDb = db.prepare('SELECT * FROM design_generations WHERE id = ?').get(gData.generationId);
    assert.ok(genDb, 'Generation record must exist in SQLite');
    assert.strictEqual(genDb.user_id, testUserId);
    assert.strictEqual(genDb.analysis_id, aData.analysisId);
    assert.strictEqual(genDb.status, 'completed');

    // Verify SQLite files records
    const filesDb = db.prepare('SELECT * FROM design_files WHERE generation_id = ?').all(gData.generationId);
    assert.strictEqual(filesDb.length, gData.files.length, 'Files count in SQLite must match generated files');

    // Verify SQLite revisions record
    const revsDb = db.prepare('SELECT * FROM design_revisions WHERE generation_id = ?').all(gData.generationId);
    assert.ok(revsDb.length > 0, 'Revisions must be recorded in SQLite');

    // Verify preview HTML renders
    const previewHtml = buildPreviewHtml(gData.files, gData.framework);
    assert.ok(previewHtml.length > 100, 'Preview HTML must assemble properly');

    console.log(`  ✓ ${label} successfully generated & persisted (${filesDb.length} files in SQLite)`);
  }

  // Standalone Generation without project
  console.log('\nTesting Standalone Generation (No Project Selected) ...');
  const { req: sReq, res: sRes } = createMockHttp('POST', '/api/design/generate', {
    imageInput: pngDataUri,
    preset: 'react-tailwind',
    projectId: null
  }, session);
  await handleDesignToCodeRequest(sReq, sRes, '/api/design/generate');
  assert.strictEqual(sRes.getStatusCode(), 200, 'Standalone generation must succeed');
  const sData = sRes.getBody();
  assert.ok(sData.generationId);
  const sGen = db.prepare('SELECT * FROM design_generations WHERE id = ?').get(sData.generationId);
  assert.strictEqual(sGen.design_project_id, null, 'Standalone design_project_id must be NULL');
  console.log('  ✓ Standalone generation successfully persisted with NULL design_project_id');

  // Verify foreign key integrity across entire database
  const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
  assert.strictEqual(fkCheck.length, 0, 'PRAGMA foreign_key_check must return 0 violations');
  console.log('\nPRAGMA foreign_key_check: 0 violations (100% clean)');

  // Clean up
  db.prepare('DELETE FROM test_history WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM reports WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM design_generations WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM design_analyses WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM design_sources WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM design_projects WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM projects WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);

  console.log('\n>>> All Real Generations & SQLite Records Verified Successfully!\n');
})();
