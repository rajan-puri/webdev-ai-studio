/**
 * server/services/acf/project-inspector.js
 * Analyzes local WordPress projects for existing themes, ACF JSON field groups,
 * template files, SCSS, and code <-> field mappings.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively search for files matching extensions, avoiding node_modules and vendor
 */
function findFiles(dir, extensions, maxDepth = 6, currentDepth = 0) {
  let results = [];
  if (currentDepth > maxDepth || !fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'vendor') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findFiles(fullPath, extensions, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (err) {
    // Ignore unreadable directories
  }
  return results;
}

/**
 * Inspect an existing local project folder
 */
async function inspectProject(projectPath) {
  const normalizedPath = path.resolve(projectPath);

  if (!fs.existsSync(normalizedPath)) {
    return {
      success: false,
      error: `Project directory not found: ${projectPath}`,
      insights: {
        framework: 'Unavailable',
        theme: 'Unavailable',
        acf: 'Not detected',
        fieldGroupsCount: 0,
        templatesCount: 0,
        scss: 'Not detected'
      }
    };
  }

  // 1. Detect WordPress structure
  const wpContentPath = path.join(normalizedPath, 'wp-content');
  const hasWpContent = fs.existsSync(wpContentPath);
  const hasWpConfig = fs.existsSync(path.join(normalizedPath, 'wp-config.php'));
  const hasFunctionsPhp = fs.existsSync(path.join(normalizedPath, 'functions.php'));

  const isWordPress = hasWpContent || hasWpConfig || hasFunctionsPhp;

  // 2. Locate Themes
  let themesDir = '';
  if (hasWpContent && fs.existsSync(path.join(wpContentPath, 'themes'))) {
    themesDir = path.join(wpContentPath, 'themes');
  } else if (hasFunctionsPhp) {
    themesDir = normalizedPath;
  }

  let themeName = 'Not detected';
  let activeThemePath = normalizedPath;

  if (themesDir && themesDir !== normalizedPath) {
    try {
      const themes = fs.readdirSync(themesDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'));
      if (themes.length > 0) {
        themeName = themes[0].name;
        activeThemePath = path.join(themesDir, themeName);
      }
    } catch (e) {}
  } else if (hasFunctionsPhp) {
    themeName = path.basename(normalizedPath);
    activeThemePath = normalizedPath;
  }

  // 3. Search for acf-json directory
  const possibleAcfJsonDirs = [
    path.join(activeThemePath, 'acf-json'),
    path.join(normalizedPath, 'acf-json'),
    path.join(normalizedPath, 'wp-content', 'acf-json')
  ];

  let acfJsonDir = null;
  for (const p of possibleAcfJsonDirs) {
    if (fs.existsSync(p)) {
      acfJsonDir = p;
      break;
    }
  }

  const existingFieldGroups = [];
  const definedFieldNames = new Set();

  if (acfJsonDir) {
    try {
      const files = fs.readdirSync(acfJsonDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          const content = fs.readFileSync(path.join(acfJsonDir, f), 'utf8');
          const parsed = JSON.parse(content);
          if (parsed && (parsed.key || parsed.fields)) {
            existingFieldGroups.push({
              fileName: f,
              path: path.join(acfJsonDir, f),
              key: parsed.key,
              title: parsed.title || f.replace('.json', ''),
              fieldCount: (parsed.fields || []).length,
              fields: parsed.fields || []
            });

            // Index field names
            const indexNames = (fields) => {
              (fields || []).forEach(field => {
                if (field.name) definedFieldNames.add(field.name);
                if (field.sub_fields) indexNames(field.sub_fields);
                if (field.layouts) {
                  field.layouts.forEach(l => indexNames(l.sub_fields));
                }
              });
            };
            indexNames(parsed.fields);
          }
        } catch (parseErr) {}
      }
    } catch (e) {}
  }

  // 4. Find PHP templates & search for get_field calls
  const phpFiles = findFiles(activeThemePath, ['.php'], 5);
  const scssFiles = findFiles(activeThemePath, ['.scss', '.sass'], 5);

  const codeFieldMapping = {}; // fieldName -> [{ file, line, functionName }]
  const referencedFields = new Set();

  const getFieldRegex = /(get_field|the_field|have_rows|get_sub_field|the_sub_field)\s*\(\s*['"]([a-zA-Z0-9_\-]+)['"]/g;

  phpFiles.forEach(filePath => {
    try {
      const relPath = path.relative(normalizedPath, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((lineText, lineIdx) => {
        let match;
        while ((match = getFieldRegex.exec(lineText)) !== null) {
          const fnName = match[1];
          const fName = match[2];
          referencedFields.add(fName);

          if (!codeFieldMapping[fName]) {
            codeFieldMapping[fName] = [];
          }
          codeFieldMapping[fName].push({
            file: relPath,
            line: lineIdx + 1,
            call: `${fnName}('${fName}')`
          });
        }
      });
    } catch (e) {}
  });

  // 5. Detect Orphan & Missing Fields
  const orphanFields = [];
  definedFieldNames.forEach(dfName => {
    if (!referencedFields.has(dfName)) {
      orphanFields.push(dfName);
    }
  });

  const missingFields = [];
  referencedFields.forEach(rfName => {
    if (definedFieldNames.size > 0 && !definedFieldNames.has(rfName)) {
      missingFields.push(rfName);
    }
  });

  // 6. Naming conventions detection
  const prefixes = {};
  definedFieldNames.forEach(name => {
    const parts = name.split('_');
    if (parts.length > 1) {
      prefixes[parts[0]] = (prefixes[parts[0]] || 0) + 1;
    }
  });
  const commonPrefix = Object.keys(prefixes).sort((a, b) => prefixes[b] - prefixes[a])[0] || 'none';

  return {
    success: true,
    projectPath: normalizedPath,
    insights: {
      framework: isWordPress ? 'WordPress' : 'Not detected',
      theme: themeName,
      acf: (acfJsonDir || existingFieldGroups.length > 0) ? 'Detected' : 'Not detected',
      fieldGroupsCount: existingFieldGroups.length,
      templatesCount: phpFiles.length,
      scss: scssFiles.length > 0 ? 'Detected' : 'Not detected',
      namingConvention: commonPrefix !== 'none' ? `${commonPrefix}_*` : 'standard snake_case'
    },
    existingFieldGroups,
    codeFieldMapping,
    orphanFields,
    missingFields,
    acfJsonDir: acfJsonDir ? path.relative(normalizedPath, acfJsonDir) : 'acf-json'
  };
}

module.exports = {
  inspectProject
};
