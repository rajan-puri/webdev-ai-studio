/**
 * server/routes/acf-architect-api.js
 * REST API handler for ACF Architect WordPress workspace.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth, getSessionUser } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');
const {
  generateAcfJson,
  generatePhpRegistration,
  generatePhpTemplate,
  generateFieldDocumentation,
  calculateArchitectureDiff,
  validateArchitecture,
  sanitizeFieldName
} = require('../services/acf/acf-architect-engine');
const { inspectProject } = require('../services/acf/project-inspector');
const { generateArchitectureFromPrompt, applyAiCommand } = require('../services/acf/ai-patch-engine');

async function handleAcfArchitectRequest(req, res, pathname, searchParams) {
  try {
    const user = getSessionUser(req);
    const activeUser = user || { id: 'user_demo', name: 'WebDev Developer' };

    // Normalize path
    const parts = pathname.split('/').filter(Boolean);
    // e.g. ['api', 'acf-architect', 'generate'] or ['api', 'acf', 'generate']
    const action = parts[2] || '';
    const subId = parts[3] || '';

    // 1. POST /api/acf-architect/generate
    if (action === 'generate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { prompt, context } = body;

      if (!prompt || !prompt.trim()) {
        return sendError(res, 400, 'Prompt/description is required.');
      }

      const result = await generateArchitectureFromPrompt(prompt, context || {});
      const arch = result.architecture;

      // Compile initial outputs
      const acfJsonObj = generateAcfJson(arch);
      const acfJson = JSON.stringify(acfJsonObj, null, 2);
      const phpRegistration = generatePhpRegistration(arch);
      const phpTemplate = generatePhpTemplate(arch);
      const docs = generateFieldDocumentation(arch);
      const validation = validateArchitecture(arch);

      return sendJson(res, 200, {
        success: true,
        architecture: arch,
        explanation: result.explanation,
        outputs: {
          acfJson,
          phpRegistration,
          phpTemplate,
          docs
        },
        validation
      });
    }

    // 2. POST /api/acf-architect/command (AI Patch)
    if (action === 'command' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { architecture, command } = body;

      if (!architecture) return sendError(res, 400, 'Current architecture is required.');
      if (!command) return sendError(res, 400, 'Command string is required.');

      const result = await applyAiCommand(architecture, command);
      const updatedArch = result.updatedArchitecture;

      const acfJsonObj = generateAcfJson(updatedArch);
      const acfJson = JSON.stringify(acfJsonObj, null, 2);
      const phpRegistration = generatePhpRegistration(updatedArch);
      const phpTemplate = generatePhpTemplate(updatedArch);
      const docs = generateFieldDocumentation(updatedArch);
      const diff = calculateArchitectureDiff(architecture, updatedArch);
      const validation = validateArchitecture(updatedArch);

      return sendJson(res, 200, {
        success: true,
        architecture: updatedArch,
        operations: result.operations,
        explanation: result.explanation,
        requiresConfirmation: result.requiresConfirmation,
        affectedFields: result.affectedFields,
        outputs: {
          acfJson,
          phpRegistration,
          phpTemplate,
          docs
        },
        diff,
        validation
      });
    }

    // 3. POST /api/acf-architect/parse-json (Import native ACF JSON)
    if (action === 'parse-json' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { jsonContent } = body;

      if (!jsonContent) return sendError(res, 400, 'JSON content is required.');

      let parsed;
      try {
        parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      } catch (err) {
        return sendError(res, 400, `Invalid JSON syntax: ${err.message}`);
      }

      // If array of field groups, take first
      const rawGroup = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!rawGroup || (!rawGroup.key && !rawGroup.fields)) {
        return sendError(res, 400, 'Imported JSON does not appear to be a valid ACF field group.');
      }

      const architecture = {
        key: rawGroup.key || `group_${Math.random().toString(36).substring(2, 9)}`,
        title: rawGroup.title || 'Imported Field Group',
        fields: rawGroup.fields || [],
        location: rawGroup.location || [],
        menu_order: rawGroup.menu_order || 0,
        position: rawGroup.position || 'normal',
        style: rawGroup.style || 'default',
        active: rawGroup.active !== undefined ? !!rawGroup.active : true,
        description: rawGroup.description || ''
      };

      const acfJson = JSON.stringify(generateAcfJson(architecture), null, 2);
      const phpRegistration = generatePhpRegistration(architecture);
      const phpTemplate = generatePhpTemplate(architecture);
      const docs = generateFieldDocumentation(architecture);
      const validation = validateArchitecture(architecture);

      return sendJson(res, 200, {
        success: true,
        architecture,
        outputs: {
          acfJson,
          phpRegistration,
          phpTemplate,
          docs
        },
        validation,
        message: `Successfully imported "${architecture.title}" with ${(architecture.fields || []).length} top-level fields.`
      });
    }

    // 4. POST /api/acf-architect/compile
    if (action === 'compile' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { architecture, baseArchitecture, templateMode } = body;

      if (!architecture) return sendError(res, 400, 'Architecture object is required.');

      const acfJsonObj = generateAcfJson(architecture);
      const acfJson = JSON.stringify(acfJsonObj, null, 2);
      const phpRegistration = generatePhpRegistration(architecture);
      const phpTemplate = generatePhpTemplate(architecture, { mode: templateMode || 'single' });
      const docs = generateFieldDocumentation(architecture);
      const diff = calculateArchitectureDiff(baseArchitecture || architecture, architecture);
      const validation = validateArchitecture(architecture);

      return sendJson(res, 200, {
        success: true,
        outputs: {
          acfJson,
          phpRegistration,
          phpTemplate,
          docs
        },
        diff,
        validation
      });
    }

    // 5. POST /api/acf-architect/validate
    if (action === 'validate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { architecture } = body;

      if (!architecture) return sendError(res, 400, 'Architecture is required.');
      const validation = validateArchitecture(architecture);

      return sendJson(res, 200, {
        success: true,
        validation
      });
    }

    // 6. POST /api/acf-architect/inspect-project
    if (action === 'inspect-project' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const projectPath = body.projectPath || process.cwd();

      const inspection = await inspectProject(projectPath);
      return sendJson(res, 200, inspection);
    }

    // 7. POST /api/acf-architect/apply (Write to project files)
    if (action === 'apply' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { projectPath, architecture, writeJson, writeTemplate, confirmOverwrite } = body;

      if (!architecture) return sendError(res, 400, 'Architecture is required.');
      const targetDir = projectPath ? path.resolve(projectPath) : process.cwd();

      if (!fs.existsSync(targetDir)) {
        return sendError(res, 400, `Target project path does not exist: ${targetDir}`);
      }

      const acfJsonObj = generateAcfJson(architecture);
      const jsonStr = JSON.stringify(acfJsonObj, null, 2);
      const phpTemplateStr = generatePhpTemplate(architecture);

      const modifiedFiles = [];
      const acfJsonFolder = path.join(targetDir, 'acf-json');
      const jsonFileName = `group_${sanitizeFieldName(architecture.title || 'fields')}.json`;
      const jsonFilePath = path.join(acfJsonFolder, jsonFileName);

      // 1. JSON write
      if (writeJson !== false) {
        if (!fs.existsSync(acfJsonFolder)) {
          fs.mkdirSync(acfJsonFolder, { recursive: true });
        }

        const fileExists = fs.existsSync(jsonFilePath);
        if (fileExists && !confirmOverwrite) {
          return sendJson(res, 200, {
            success: false,
            needsConfirmation: true,
            warning: `File already exists: acf-json/${jsonFileName}. Please confirm overwrite.`,
            targetPath: jsonFilePath
          });
        }

        fs.writeFileSync(jsonFilePath, jsonStr, 'utf8');
        modifiedFiles.push({
          path: `acf-json/${jsonFileName}`,
          status: fileExists ? 'Modified' : 'Created'
        });
      }

      // 2. PHP Template write (if requested)
      if (writeTemplate) {
        const templateFolder = path.join(targetDir, 'template-parts');
        if (!fs.existsSync(templateFolder)) {
          fs.mkdirSync(templateFolder, { recursive: true });
        }
        const templateFileName = `content-${sanitizeFieldName(architecture.title || 'page')}.php`;
        const templateFilePath = path.join(templateFolder, templateFileName);

        const tmplExists = fs.existsSync(templateFilePath);
        fs.writeFileSync(templateFilePath, phpTemplateStr, 'utf8');
        modifiedFiles.push({
          path: `template-parts/${templateFileName}`,
          status: tmplExists ? 'Modified' : 'Created'
        });
      }

      // Save to SQLite history
      const histId = uuidv4();
      try {
        db.prepare(`
          INSERT INTO test_history (id, user_id, project_id, test_type, target_url, status, summary, duration_ms)
          VALUES (?, ?, ?, 'acf_architect', ?, 'completed', ?, 150)
        `).run(
          histId,
          activeUser.id,
          body.projectId || null,
          `file://${targetDir}`,
          JSON.stringify({
            action: 'applied_to_project',
            title: architecture.title,
            files: modifiedFiles
          })
        );
      } catch (dbErr) {
        console.warn('[acf-architect] History log notice:', dbErr.message);
      }

      return sendJson(res, 200, {
        success: true,
        message: `Successfully applied architecture to ${modifiedFiles.length} file(s).`,
        files: modifiedFiles
      });
    }

    // 8. GET /api/acf-architect/history (List saved architectures)
    if (action === 'history' && !subId && req.method === 'GET') {
      const rows = db.prepare(`
        SELECT id, title, architecture_key, validation_summary, created_at, updated_at
        FROM saved_acf_architectures
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 50
      `).all(activeUser.id);

      return sendJson(res, 200, {
        success: true,
        items: rows.map(r => ({
          ...r,
          validation: JSON.parse(r.validation_summary || '{}')
        }))
      });
    }

    // 9. POST /api/acf-architect/history (Save/update architecture)
    if (action === 'history' && !subId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { title, architecture, projectId, id } = body;

      if (!architecture) return sendError(res, 400, 'Architecture is required.');

      const recordId = id || uuidv4();
      const archTitle = title || architecture.title || 'Untitled Architecture';
      const archKey = architecture.key || generateAcfJson(architecture).key;
      const jsonOutput = JSON.stringify(generateAcfJson(architecture), null, 2);
      const phpRegOutput = generatePhpRegistration(architecture);
      const phpTmplOutput = generatePhpTemplate(architecture);
      const validationSummary = JSON.stringify(validateArchitecture(architecture));

      db.prepare(`
        INSERT INTO saved_acf_architectures (
          id, user_id, project_id, title, architecture_key, architecture_json,
          acf_json_output, php_registration_output, php_template_output,
          validation_summary, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          architecture_key = excluded.architecture_key,
          architecture_json = excluded.architecture_json,
          acf_json_output = excluded.acf_json_output,
          php_registration_output = excluded.php_registration_output,
          php_template_output = excluded.php_template_output,
          validation_summary = excluded.validation_summary,
          updated_at = datetime('now')
      `).run(
        recordId,
        activeUser.id,
        projectId || null,
        archTitle,
        archKey,
        JSON.stringify(architecture),
        jsonOutput,
        phpRegOutput,
        phpTmplOutput,
        validationSummary
      );

      return sendJson(res, 201, {
        success: true,
        id: recordId,
        message: 'Architecture saved successfully.'
      });
    }

    // 10. GET /api/acf-architect/history/:id
    if (action === 'history' && subId && req.method === 'GET') {
      const row = db.prepare(`
        SELECT * FROM saved_acf_architectures WHERE id = ? AND user_id = ?
      `).get(subId, activeUser.id);

      if (!row) {
        return sendError(res, 404, 'Architecture not found.');
      }

      return sendJson(res, 200, {
        success: true,
        item: {
          id: row.id,
          title: row.title,
          architecture: JSON.parse(row.architecture_json),
          outputs: {
            acfJson: row.acf_json_output,
            phpRegistration: row.php_registration_output,
            phpTemplate: row.php_template_output
          },
          validation: JSON.parse(row.validation_summary || '{}'),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      });
    }

    // 11. DELETE /api/acf-architect/history/:id
    if (action === 'history' && subId && req.method === 'DELETE') {
      const result = db.prepare('DELETE FROM saved_acf_architectures WHERE id = ? AND user_id = ?').run(subId, activeUser.id);
      if (result.changes === 0) return sendError(res, 404, 'Architecture not found.');

      return sendJson(res, 200, {
        success: true,
        message: 'Architecture deleted.'
      });
    }

    return sendError(res, 404, `Unknown ACF Architect API endpoint: ${pathname}`);
  } catch (err) {
    console.error('[acf-architect-api] Error:', err);
    return sendError(res, 500, `ACF Architect Error: ${err.message}`);
  }
}

module.exports = {
  handleAcfArchitectRequest
};
