/**
 * server/routes/design-to-code-api.js
 * API Router for WebDev AI Studio Design -> Code Platform.
 * Enforces transactional database integrity, user isolation, and safe parent-child lifecycles.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');
const { parseImageMetadata } = require('../services/design-to-code/analyzer');
const { parseFigmaUrl, fetchFigmaNodes } = require('../services/design-to-code/figma-parser');
const { registry } = require('../services/design-to-code/ai-provider');
const { fixCodeQuality, inspectCodeQuality } = require('../services/design-to-code/quality-engine');
const { compareVisualDesign } = require('../services/design-to-code/visual-verifier');
const { createZipArchive } = require('../services/design-to-code/zip-exporter');

// Temporary server-side diagnostic logger for foreign key lifecycle tracking
function logDbDiagnostics(step, details) {
  console.log(`[DesignToCode:DB:${step}]`, JSON.stringify({
    userId: details.userId,
    projectId: details.projectId || null,
    designProjectId: details.designProjectId || null,
    sourceId: details.sourceId || null,
    analysisId: details.analysisId || null,
    generationId: details.generationId || null,
    revisionId: details.revisionId || null,
    table: details.table || null,
    fkRelationship: details.fkRelationship || null
  }));
}

// Helper: Safely resolve or create design project linked to workspace project or standalone
function resolveDesignProject(userId, rawProjectId, rawDesignProjectId, framework = 'html', styling = 'scss', language = 'javascript', rules = {}) {
  const cleanProjectId = (typeof rawProjectId === 'string' && rawProjectId.trim()) ? rawProjectId.trim() : null;
  const cleanDesignProjectId = (typeof rawDesignProjectId === 'string' && rawDesignProjectId.trim()) ? rawDesignProjectId.trim() : null;

  // 1. If a workspace project ID is provided, validate ownership
  if (cleanProjectId) {
    const wsProj = db.prepare('SELECT id, name FROM projects WHERE id = ? AND user_id = ?').get(cleanProjectId, userId);
    if (!wsProj) {
      return { error: 'Selected project not found or does not belong to user.', code: 'PROJECT_NOT_FOUND', status: 404 };
    }
    // Find or create linked record in design_projects
    let dProj = db.prepare('SELECT id FROM design_projects WHERE project_id = ? AND user_id = ?').get(cleanProjectId, userId);
    if (!dProj) {
      const newDProjId = 'dproj_' + uuidv4().replace(/-/g, '').substring(0, 16);
      logDbDiagnostics('INSERT', {
        userId,
        projectId: cleanProjectId,
        designProjectId: newDProjId,
        table: 'design_projects',
        fkRelationship: 'design_projects.project_id -> projects.id, design_projects.user_id -> users.id'
      });
      db.prepare(`
        INSERT INTO design_projects (id, user_id, project_id, name, framework, styling, language, rules_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(newDProjId, userId, cleanProjectId, wsProj.name, framework, styling, language, JSON.stringify(rules || {}));
      return { designProjectId: newDProjId, workspaceProjectId: cleanProjectId };
    }
    return { designProjectId: dProj.id, workspaceProjectId: cleanProjectId };
  }

  // 2. If a design project ID is provided directly, validate ownership
  if (cleanDesignProjectId) {
    const dProj = db.prepare('SELECT id, project_id FROM design_projects WHERE id = ? AND user_id = ?').get(cleanDesignProjectId, userId);
    if (!dProj) {
      return { error: 'Selected design project not found or does not belong to user.', code: 'DESIGN_PROJECT_NOT_FOUND', status: 404 };
    }
    return { designProjectId: dProj.id, workspaceProjectId: dProj.project_id || null };
  }

  // 3. Standalone generation without project
  return { designProjectId: null, workspaceProjectId: null };
}

// Helper: Safely resolve or create design source record
function resolveOrCreateSource(userId, designProjectId, rawSourceId, sourceType = 'screenshot', imageInput = null, figmaData = null) {
  const cleanSourceId = (typeof rawSourceId === 'string' && rawSourceId.trim()) ? rawSourceId.trim() : null;

  if (cleanSourceId) {
    const existing = db.prepare('SELECT * FROM design_sources WHERE id = ? AND user_id = ?').get(cleanSourceId, userId);
    if (!existing) {
      return { error: 'Design source not found or not owned by user.', code: 'SOURCE_NOT_FOUND', status: 404 };
    }
    return { sourceId: existing.id, sourceRecord: existing };
  }

  // Create source record safely
  const newSourceId = 'src_' + uuidv4().replace(/-/g, '').substring(0, 16);
  logDbDiagnostics('INSERT', {
    userId,
    designProjectId,
    sourceId: newSourceId,
    table: 'design_sources',
    fkRelationship: 'design_sources.user_id -> users.id, design_sources.design_project_id -> design_projects.id'
  });

  if (sourceType === 'figma' && figmaData) {
    db.prepare(`
      INSERT INTO design_sources (id, user_id, design_project_id, source_type, figma_url, figma_file_key, figma_node_id, metadata_json, created_at)
      VALUES (?, ?, ?, 'figma', ?, ?, ?, ?, datetime('now'))
    `).run(
      newSourceId,
      userId,
      designProjectId || null,
      figmaData.fullUrl || '',
      figmaData.fileKey || '',
      figmaData.nodeId || '',
      JSON.stringify(figmaData)
    );
  } else {
    const imgData = imageInput || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    let meta = { width: 1200, height: 800, format: 'png' };
    try {
      meta = parseImageMetadata(imgData);
    } catch (_) {}

    db.prepare(`
      INSERT INTO design_sources (id, user_id, design_project_id, source_type, image_data_uri, image_name, image_width, image_height, metadata_json, created_at)
      VALUES (?, ?, ?, 'screenshot', ?, 'screenshot.png', ?, ?, ?, datetime('now'))
    `).run(
      newSourceId,
      userId,
      designProjectId || null,
      imgData,
      meta.width || 1200,
      meta.height || 800,
      JSON.stringify(meta)
    );
  }

  const created = db.prepare('SELECT * FROM design_sources WHERE id = ?').get(newSourceId);
  return { sourceId: newSourceId, sourceRecord: created };
}

// Helper: Safely resolve or create design analysis record
function resolveOrCreateAnalysis(userId, sourceId, rawAnalysisId, ir, provider = 'design-vision-engine', model = 'v1') {
  const cleanAnalysisId = (typeof rawAnalysisId === 'string' && rawAnalysisId.trim()) ? rawAnalysisId.trim() : null;

  if (cleanAnalysisId) {
    const existing = db.prepare('SELECT * FROM design_analyses WHERE id = ? AND user_id = ?').get(cleanAnalysisId, userId);
    if (!existing) {
      return { error: 'Analysis record not found or not owned by user.', code: 'ANALYSIS_NOT_FOUND', status: 404 };
    }
    return { analysisId: existing.id, ir: JSON.parse(existing.ir_json) };
  }

  if (!ir) {
    return { error: 'Design Intermediate Representation (IR) or analysisId is required.', code: 'MISSING_IR', status: 400 };
  }

  const newAnalysisId = 'ana_' + uuidv4().replace(/-/g, '').substring(0, 16);
  logDbDiagnostics('INSERT', {
    userId,
    sourceId,
    analysisId: newAnalysisId,
    table: 'design_analyses',
    fkRelationship: 'design_analyses.user_id -> users.id, design_analyses.source_id -> design_sources.id'
  });

  db.prepare(`
    INSERT INTO design_analyses (
      id, user_id, source_id, ir_json, tokens_json, components_json,
      sections_json, responsive_rules_json, interactions_json, provider, model, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    newAnalysisId,
    userId,
    sourceId,
    JSON.stringify(ir),
    JSON.stringify(ir.tokens || {}),
    JSON.stringify(ir.components || []),
    JSON.stringify(ir.sections || []),
    JSON.stringify(ir.responsiveRules || []),
    JSON.stringify(ir.interactions || []),
    provider,
    model
  );

  return { analysisId: newAnalysisId, ir };
}

// Transaction: Atomic multi-table persistence for code generation
const persistGenerationTransaction = db.transaction((params) => {
  const {
    userId,
    analysisId,
    designProjectId,
    workspaceProjectId,
    framework,
    styling,
    language,
    qualityReport,
    provider,
    model,
    generationSettings,
    files
  } = params;

  const generationId = 'gen_' + uuidv4().replace(/-/g, '').substring(0, 16);
  const revisionId = 'rev_' + uuidv4().replace(/-/g, '').substring(0, 16);
  const historyId = 'hist_' + uuidv4().replace(/-/g, '').substring(0, 16);
  const reportId = 'rep_' + uuidv4().replace(/-/g, '').substring(0, 16);

  logDbDiagnostics('INSERT', {
    userId,
    projectId: workspaceProjectId,
    designProjectId,
    analysisId,
    generationId,
    table: 'design_generations',
    fkRelationship: 'design_generations.user_id -> users.id, design_generations.analysis_id -> design_analyses.id, design_generations.design_project_id -> design_projects.id'
  });

  db.prepare(`
    INSERT INTO design_generations (
      id, user_id, analysis_id, design_project_id, framework, styling, language,
      quality_report_json, status, provider, model, generation_settings_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    generationId,
    userId,
    analysisId,
    designProjectId || null,
    framework,
    styling,
    language,
    JSON.stringify(qualityReport || {}),
    provider,
    model,
    JSON.stringify(generationSettings || {})
  );

  // Insert generated code files
  const insertFileStmt = db.prepare(`
    INSERT INTO design_files (id, generation_id, file_path, file_content, file_type, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const f of files) {
    insertFileStmt.run(
      'file_' + uuidv4().replace(/-/g, '').substring(0, 16),
      generationId,
      f.filePath || f.path,
      f.fileContent || f.content,
      f.fileType || 'component'
    );
  }

  // Insert initial revision audit log
  logDbDiagnostics('INSERT', {
    userId,
    generationId,
    revisionId,
    table: 'design_revisions',
    fkRelationship: 'design_revisions.generation_id -> design_generations.id, design_revisions.user_id -> users.id'
  });

  db.prepare(`
    INSERT INTO design_revisions (id, user_id, generation_id, prompt, patch_json, summary, created_at)
    VALUES (?, ?, ?, 'Initial Code Generation', '[]', ?, datetime('now'))
  `).run(
    revisionId,
    userId,
    generationId,
    `Initial ${framework}+${styling} generation (${files.length} files)`
  );

  // Record in workspace test_history and reports
  const targetUrl = `design://${framework}-${styling}`;
  const historySummary = {
    framework,
    styling,
    language,
    filesCount: files.length,
    qualityScore: qualityReport?.score || 100,
    generationId
  };

  db.prepare(`
    INSERT INTO test_history (id, user_id, project_id, test_type, target_url, status, summary, duration_ms, created_at)
    VALUES (?, ?, ?, 'design-to-code', ?, 'completed', ?, 0, datetime('now'))
  `).run(
    historyId,
    userId,
    workspaceProjectId || null,
    targetUrl,
    JSON.stringify(historySummary)
  );

  db.prepare(`
    INSERT INTO reports (id, user_id, project_id, history_id, test_type, target_url, result_json, created_at)
    VALUES (?, ?, ?, ?, 'design-to-code', ?, ?, datetime('now'))
  `).run(
    reportId,
    userId,
    workspaceProjectId || null,
    historyId,
    targetUrl,
    JSON.stringify({
      generationId,
      framework,
      styling,
      language,
      qualityReport,
      filesSummary: files.map(f => ({ path: f.filePath || f.path, type: f.fileType || 'component' }))
    })
  );

  return { generationId, revisionId, historyId, reportId };
});

async function handleDesignToCodeRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return;

  const method = req.method;
  const segments = pathname.replace('/api/design', '').split('/').filter(Boolean);
  const action = segments[0] || '';

  try {
    // 1. POST /api/design/upload - Upload Screenshot
    if (action === 'upload' && method === 'POST') {
      const body = await readJsonBody(req);
      const { dataUri, imageName = 'screenshot.png', projectId = null, designProjectId = null } = body;

      if (!dataUri || typeof dataUri !== 'string') {
        return sendError(res, 400, 'A valid image dataUri string is required.', 'VALIDATION_ERROR');
      }

      // Resolve optional project
      const projRes = resolveDesignProject(user.id, projectId, designProjectId);
      if (projRes.error) {
        return sendError(res, projRes.status, projRes.error, projRes.code);
      }

      const meta = parseImageMetadata(dataUri);
      const sourceId = 'src_' + uuidv4().replace(/-/g, '').substring(0, 16);

      logDbDiagnostics('INSERT', {
        userId: user.id,
        projectId: projRes.workspaceProjectId,
        designProjectId: projRes.designProjectId,
        sourceId,
        table: 'design_sources',
        fkRelationship: 'design_sources.user_id -> users.id, design_sources.design_project_id -> design_projects.id'
      });

      db.prepare(`
        INSERT INTO design_sources (id, user_id, design_project_id, source_type, image_data_uri, image_name, image_width, image_height, metadata_json, created_at)
        VALUES (?, ?, ?, 'screenshot', ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        sourceId,
        user.id,
        projRes.designProjectId || null,
        dataUri,
        imageName,
        meta.width,
        meta.height,
        JSON.stringify(meta)
      );

      return sendJson(res, 200, {
        success: true,
        sourceId,
        image: {
          name: imageName,
          width: meta.width,
          height: meta.height,
          format: meta.format,
          sizeBytes: meta.sizeBytes || Math.round(dataUri.length * 0.75)
        }
      });
    }

    // 2. POST /api/design/figma/parse - Parse Figma URL
    if (action === 'figma' && segments[1] === 'parse' && method === 'POST') {
      const body = await readJsonBody(req);
      const { figmaUrl, projectId = null, designProjectId = null } = body;

      const parsed = parseFigmaUrl(figmaUrl);
      if (!parsed.isValid) {
        return sendError(res, 400, parsed.error || 'Invalid or unsupported Figma URL.', 'INVALID_FIGMA_URL');
      }

      // Check for user connected Figma token or env token
      const envToken = process.env.FIGMA_ACCESS_TOKEN || null;
      const userConn = db.prepare(`
        SELECT api_key FROM seo_provider_connections
        WHERE user_id = ? AND provider = 'figma'
      `).get(user.id);
      const token = userConn?.api_key || envToken;

      let figmaMetadata = null;
      let isConnected = !!token;

      if (token) {
        try {
          figmaMetadata = await fetchFigmaNodes(parsed.fileKey, parsed.nodeId, token);
        } catch (err) {
          console.warn('[figma-api]', err.message);
          return sendJson(res, 200, {
            success: true,
            figma: parsed,
            connected: false,
            message: err.message
          });
        }
      }

      // Resolve optional project
      const projRes = resolveDesignProject(user.id, projectId, designProjectId);
      if (projRes.error) {
        return sendError(res, projRes.status, projRes.error, projRes.code);
      }

      const sourceId = 'src_' + uuidv4().replace(/-/g, '').substring(0, 16);
      logDbDiagnostics('INSERT', {
        userId: user.id,
        projectId: projRes.workspaceProjectId,
        designProjectId: projRes.designProjectId,
        sourceId,
        table: 'design_sources',
        fkRelationship: 'design_sources.user_id -> users.id, design_sources.design_project_id -> design_projects.id'
      });

      db.prepare(`
        INSERT INTO design_sources (id, user_id, design_project_id, source_type, figma_url, figma_file_key, figma_node_id, metadata_json, created_at)
        VALUES (?, ?, ?, 'figma', ?, ?, ?, ?, datetime('now'))
      `).run(
        sourceId,
        user.id,
        projRes.designProjectId || null,
        parsed.fullUrl,
        parsed.fileKey,
        parsed.nodeId || '',
        JSON.stringify({ parsed, isConnected, hasMetadata: !!figmaMetadata })
      );

      return sendJson(res, 200, {
        success: true,
        sourceId,
        figma: parsed,
        connected: isConnected,
        message: isConnected ? 'Figma metadata loaded successfully.' : 'Connect Figma to inspect design metadata.'
      });
    }

    // 3. POST /api/design/analyze - Design Analysis Engine (generates DIR)
    if (action === 'analyze' && method === 'POST') {
      const body = await readJsonBody(req);
      const {
        sourceId,
        sourceType = 'screenshot',
        imageInput,
        figmaData,
        options = {},
        projectRules = {},
        projectId = null,
        designProjectId = null
      } = body;

      // 1. Resolve project ownership safely
      const projRes = resolveDesignProject(user.id, projectId, designProjectId);
      if (projRes.error) {
        return sendError(res, projRes.status, projRes.error, projRes.code);
      }

      // 2. Resolve or create design source record safely
      const sourceRes = resolveOrCreateSource(user.id, projRes.designProjectId, sourceId, sourceType, imageInput, figmaData);
      if (sourceRes.error) {
        return sendError(res, sourceRes.status, sourceRes.error, sourceRes.code);
      }

      let rawImage = imageInput;
      if (!rawImage && sourceRes.sourceRecord?.image_data_uri) {
        rawImage = sourceRes.sourceRecord.image_data_uri;
      }

      // 3. Run Analysis
      const analysisResult = await registry.analysis.analyze({
        sourceType,
        imageInput: rawImage,
        figmaData,
        projectRules
      }, options);

      // 4. Resolve or create analysis record safely
      const analysisRes = resolveOrCreateAnalysis(
        user.id,
        sourceRes.sourceId,
        null,
        analysisResult.ir,
        analysisResult.provider,
        analysisResult.model
      );
      if (analysisRes.error) {
        return sendError(res, analysisRes.status, analysisRes.error, analysisRes.code);
      }

      return sendJson(res, 200, {
        success: true,
        analysisId: analysisRes.analysisId,
        sourceId: sourceRes.sourceId,
        ir: analysisResult.ir,
        provider: analysisResult.provider,
        model: analysisResult.model
      });
    }

    // 4. POST /api/design/generate - Code Generation Engine
    if (action === 'generate' && method === 'POST') {
      const body = await readJsonBody(req);
      const {
        analysisId,
        sourceId = null,
        imageInput = null,
        figmaData = null,
        ir,
        framework = 'html',
        styling = 'scss',
        language = 'javascript',
        preset = null,
        projectRules = {},
        acfMode = false,
        projectId = null,
        designProjectId = null
      } = body;

      // 1. Resolve project ownership safely
      const projRes = resolveDesignProject(user.id, projectId, designProjectId, framework, styling, language, projectRules);
      if (projRes.error) {
        return sendError(res, projRes.status, projRes.error, projRes.code);
      }

      // 2. Resolve or create design source record safely
      const sourceRes = resolveOrCreateSource(user.id, projRes.designProjectId, sourceId, imageInput ? 'screenshot' : 'figma', imageInput, figmaData);
      if (sourceRes.error) {
        return sendError(res, sourceRes.status, sourceRes.error, sourceRes.code);
      }

      // 3. Resolve or retrieve target IR
      let targetIr = ir;
      if (!targetIr && analysisId) {
        const cleanAnalysisId = (typeof analysisId === 'string') ? analysisId.trim() : null;
        const row = db.prepare('SELECT ir_json FROM design_analyses WHERE id = ? AND user_id = ?').get(cleanAnalysisId, user.id);
        if (row) {
          targetIr = JSON.parse(row.ir_json);
        } else {
          return sendError(res, 404, 'Analysis record not found or not owned by user.', 'ANALYSIS_NOT_FOUND');
        }
      }

      if (!targetIr) {
        // If image provided, run quick analysis
        if (imageInput) {
          const quickAnalysis = await registry.analysis.analyze({
            sourceType: 'screenshot',
            imageInput,
            projectRules
          });
          targetIr = quickAnalysis.ir;
        } else {
          return sendError(res, 400, 'Design Intermediate Representation (IR) or analysisId is required.', 'MISSING_IR');
        }
      }

      // 4. Resolve or create analysis record safely
      const analysisRes = resolveOrCreateAnalysis(user.id, sourceRes.sourceId, analysisId, targetIr);
      if (analysisRes.error) {
        return sendError(res, analysisRes.status, analysisRes.error, analysisRes.code);
      }

      // 5. Execute Code Generation
      const genResult = await registry.generation.generateCode(targetIr, {
        framework,
        styling,
        language,
        preset,
        projectRules,
        acfMode
      });

      // 6. Execute Atomic Transaction Persistence
      let persisted;
      try {
        persisted = persistGenerationTransaction({
          userId: user.id,
          analysisId: analysisRes.analysisId,
          designProjectId: projRes.designProjectId,
          workspaceProjectId: projRes.workspaceProjectId,
          framework: genResult.framework,
          styling: genResult.styling,
          language: genResult.language,
          qualityReport: genResult.qualityReport,
          provider: genResult.provider,
          model: genResult.model,
          generationSettings: genResult.generationSettings,
          files: genResult.files
        });
      } catch (txErr) {
        console.error('[DesignToCode:DB:TransactionError]', txErr);
        return sendError(res, 500, 'Generation failed while saving the result. Please try again.', 'PERSISTENCE_ERROR');
      }

      return sendJson(res, 200, {
        success: true,
        generationId: persisted.generationId,
        analysisId: analysisRes.analysisId,
        framework: genResult.framework,
        styling: genResult.styling,
        language: genResult.language,
        files: genResult.files,
        qualityReport: genResult.qualityReport,
        metadata: {
          provider: genResult.provider,
          model: genResult.model,
          timestamp: genResult.timestamp
        }
      });
    }

    // 5. POST /api/design/refine - Surgical AI Refinement Patch
    if (action === 'refine' && method === 'POST') {
      const body = await readJsonBody(req);
      const { generationId, prompt, files = [] } = body;

      if (!prompt) {
        return sendError(res, 400, 'A refinement prompt is required.', 'MISSING_PROMPT');
      }

      if (!generationId) {
        return sendError(res, 400, 'A valid generationId is required for refinement.', 'MISSING_GENERATION_ID');
      }

      // Validate generation ownership
      const gen = db.prepare('SELECT id FROM design_generations WHERE id = ? AND user_id = ?').get(generationId, user.id);
      if (!gen) {
        return sendError(res, 404, 'Generation record not found or not owned by user.', 'NOT_FOUND');
      }

      let currentFiles = files;
      if (currentFiles.length === 0) {
        const rows = db.prepare('SELECT file_path, file_content, file_type FROM design_files WHERE generation_id = ?').all(generationId);
        currentFiles = rows.map(r => ({ filePath: r.file_path, fileContent: r.file_content, fileType: r.file_type }));
      }

      const refineResult = await registry.refinement.refineCode(currentFiles, prompt);

      // Record revision & update files in transaction
      const revisionId = 'rev_' + uuidv4().replace(/-/g, '').substring(0, 16);
      db.transaction(() => {
        logDbDiagnostics('INSERT', {
          userId: user.id,
          generationId,
          revisionId,
          table: 'design_revisions',
          fkRelationship: 'design_revisions.generation_id -> design_generations.id, design_revisions.user_id -> users.id'
        });

        db.prepare(`
          INSERT INTO design_revisions (id, user_id, generation_id, prompt, patch_json, summary, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          revisionId,
          user.id,
          generationId,
          prompt,
          JSON.stringify(refineResult.patchesApplied),
          refineResult.summary
        );

        const updateFile = db.prepare('UPDATE design_files SET file_content = ? WHERE generation_id = ? AND file_path = ?');
        for (const f of refineResult.files) {
          updateFile.run(f.fileContent, generationId, f.filePath);
        }
      })();

      const qualityReport = inspectCodeQuality(refineResult.files);

      return sendJson(res, 200, {
        success: true,
        files: refineResult.files,
        modifiedFiles: refineResult.modifiedFiles,
        patchesApplied: refineResult.patchesApplied,
        summary: refineResult.summary,
        qualityReport
      });
    }

    // 6. POST /api/design/verify - Playwright Visual Verification & Diff
    if (action === 'verify' && method === 'POST') {
      const body = await readJsonBody(req);
      const { generationId, originalDataUri, files = [], viewport = { width: 1440, height: 900 } } = body;

      if (!generationId) {
        return sendError(res, 400, 'A valid generationId is required for visual verification.', 'MISSING_GENERATION_ID');
      }

      // Validate generation ownership
      const gen = db.prepare('SELECT id FROM design_generations WHERE id = ? AND user_id = ?').get(generationId, user.id);
      if (!gen) {
        return sendError(res, 404, 'Generation record not found or not owned by user.', 'NOT_FOUND');
      }

      let currentFiles = files;
      if (currentFiles.length === 0) {
        const rows = db.prepare('SELECT file_path, file_content, file_type FROM design_files WHERE generation_id = ?').all(generationId);
        currentFiles = rows.map(r => ({ filePath: r.file_path, fileContent: r.file_content, fileType: r.file_type }));
      }

      const compResult = await compareVisualDesign({
        originalDataUri,
        generatedFiles: currentFiles,
        viewport
      });

      const compId = 'comp_' + uuidv4().replace(/-/g, '').substring(0, 16);
      logDbDiagnostics('INSERT', {
        userId: user.id,
        generationId,
        table: 'design_visual_comparisons',
        fkRelationship: 'design_visual_comparisons.generation_id -> design_generations.id, design_visual_comparisons.user_id -> users.id'
      });

      db.prepare(`
        INSERT INTO design_visual_comparisons (
          id, user_id, generation_id, original_data_uri, generated_data_uri,
          diff_data_uri, differences_json, viewport_width, viewport_height, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        compId,
        user.id,
        generationId,
        compResult.originalDataUri || '',
        compResult.generatedDataUri,
        compResult.diffDataUri || '',
        JSON.stringify(compResult.differences || []),
        viewport.width,
        viewport.height
      );

      return sendJson(res, 200, compResult);
    }

    // 7. POST /api/design/fix-quality - Auto-fix Code Quality
    if (action === 'fix-quality' && method === 'POST') {
      const body = await readJsonBody(req);
      const { files = [] } = body;

      const repairedFiles = fixCodeQuality(files);
      const newReport = inspectCodeQuality(repairedFiles);

      return sendJson(res, 200, {
        success: true,
        files: repairedFiles,
        qualityReport: newReport
      });
    }

    // 8. GET /api/design/export/zip - Download Multi-File Project ZIP
    if (action === 'export' && segments[1] === 'zip' && method === 'GET') {
      const generationId = queryParams.get('generation_id');
      if (!generationId) {
        return sendError(res, 400, 'generation_id query parameter is required.', 'MISSING_ID');
      }

      const gen = db.prepare('SELECT id, framework FROM design_generations WHERE id = ? AND user_id = ?').get(generationId, user.id);
      if (!gen) {
        return sendError(res, 404, 'Generation record not found or not owned by user.', 'NOT_FOUND');
      }

      const files = db.prepare('SELECT file_path, file_content FROM design_files WHERE generation_id = ?').all(generationId);
      if (!files || files.length === 0) {
        return sendError(res, 404, 'No generated files found for this generation.', 'EMPTY_PROJECT');
      }

      const zipBuffer = createZipArchive(files.map(f => ({ filePath: f.file_path, fileContent: f.file_content })));

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="webdev-${gen.framework}-project.zip"`,
        'Content-Length': zipBuffer.length
      });
      res.end(zipBuffer);
      return;
    }

    // 9. GET /api/design/history - List Previous Design Projects & Generations
    if (action === 'history' && method === 'GET') {
      const rows = db.prepare(`
        SELECT 
          dg.id as generation_id,
          dg.framework,
          dg.styling,
          dg.language,
          dg.quality_report_json,
          dg.created_at,
          ds.source_type,
          ds.image_name,
          ds.figma_url,
          p.name as project_name,
          p.id as project_id,
          (SELECT COUNT(*) FROM design_files df WHERE df.generation_id = dg.id) as files_count
        FROM design_generations dg
        LEFT JOIN design_analyses da ON da.id = dg.analysis_id
        LEFT JOIN design_sources ds ON ds.id = da.source_id
        LEFT JOIN design_projects dp ON dp.id = dg.design_project_id
        LEFT JOIN projects p ON p.id = dp.project_id
        WHERE dg.user_id = ?
        ORDER BY dg.created_at DESC
        LIMIT 25
      `).all(user.id);

      return sendJson(res, 200, {
        success: true,
        history: rows.map(r => ({
          ...r,
          qualityReport: r.quality_report_json ? JSON.parse(r.quality_report_json) : null
        }))
      });
    }

    // 10. GET /api/design/generations/:id - Retrieve full files for a generation
    if (action === 'generations' && segments[1] && method === 'GET') {
      const genId = segments[1];
      const gen = db.prepare('SELECT * FROM design_generations WHERE id = ? AND user_id = ?').get(genId, user.id);
      if (!gen) {
        return sendError(res, 404, 'Generation not found.', 'NOT_FOUND');
      }

      const files = db.prepare('SELECT file_path, file_content, file_type FROM design_files WHERE generation_id = ?').all(genId);

      return sendJson(res, 200, {
        success: true,
        generation: gen,
        files: files.map(f => ({ filePath: f.file_path, fileContent: f.file_content, fileType: f.file_type }))
      });
    }

    return sendError(res, 404, `Unknown Design -> Code route: ${pathname}`, 'ROUTE_NOT_FOUND');
  } catch (err) {
    console.error('[design-to-code-api:Error]', err);
    return sendError(res, 500, 'Generation failed while saving the result. Please try again.', 'SERVER_ERROR');
  }
}

module.exports = {
  handleDesignToCodeRequest
};
