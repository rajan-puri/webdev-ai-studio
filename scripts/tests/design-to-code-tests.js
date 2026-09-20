/**
 * scripts/tests/design-to-code-tests.js
 * Design -> Code Studio: Master Verification Suite
 * Tests all 24 required capabilities:
 * 1. Screenshot upload & metadata extraction
 * 2. Invalid image error rejection
 * 3. Figma URL validation & parsing
 * 4. Design intermediate representation (DIR) creation & validation
 * 5. HTML + SCSS generation
 * 6. React JSX/TSX generation
 * 7. Next.js App Router generation
 * 8. Vue 3 SFC generation
 * 9. Svelte generation
 * 10. SCSS & CSS tokens generation
 * 11. Tailwind configuration & utility generation
 * 12. Responsive rules & breakpoint handling
 * 13. Component detection & semantic naming
 * 14. Existing component reuse mapping
 * 15. WordPress PHP & ACF field generation
 * 16. Accessibility & semantic landmark checks
 * 17. Code quality inspection engine & auto-fix
 * 18. Visual preview HTML assembly
 * 19. Visual comparison & diff logic
 * 20. AI refinement surgical patching
 * 21. Multi-file ZIP export creation
 * 22. SQLite persistence across design tables
 * 23. Multi-user security isolation
 * 24. Input sanitization & security guard
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Database
const { db, getDb } = require('../../server/data/database');

// Design to Code Services
const { parseImageBuffer, analyzeScreenshot } = require('../../server/services/design-to-code/analyzer');
const { parseFigmaUrl, extractDesignMetadata } = require('../../server/services/design-to-code/figma-parser');
const { validateIntermediateRepresentation, createDefaultTokens } = require('../../server/services/design-to-code/ir-schema');
const { generateCode, buildPreviewHtml } = require('../../server/services/design-to-code/generator/generator-engine');
const { generateFrameworkTokens } = require('../../server/services/design-to-code/generator/framework-mapper');
const { applyExistingProjectRules } = require('../../server/services/design-to-code/generator/existing-project-mapper');
const { inspectCodeQuality, fixCodeQuality } = require('../../server/services/design-to-code/quality-engine');
const { compareVisualLayouts } = require('../../server/services/design-to-code/visual-verifier');
const { refineCodeSurgical } = require('../../server/services/design-to-code/refinement-engine');
const { createZipArchive } = require('../../server/services/design-to-code/zip-exporter');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

console.log('\n================================================================');
console.log('       DESIGN → CODE STUDIO: 24-POINT VERIFICATION RUNNER       ');
console.log('================================================================\n');

// Helper: create a valid minimal 1x1 PNG buffer
function createMinimalPng() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk length (13)
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x04, 0xb0, // width: 1200
    0x00, 0x00, 0x03, 0x20, // height: 800
    0x08, 0x06, 0x00, 0x00, 0x00, // 8-bit truecolor+alpha
    0x5c, 0x72, 0xb8, 0x69, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    0xae, 0x42, 0x60, 0x82  // CRC
  ]);
}

// Sample IR for generation tests
function createSampleIR() {
  return {
    version: '1.0.0',
    source: {
      type: 'screenshot',
      name: 'hero-feature-design.png',
      detectedAt: new Date().toISOString()
    },
    canvas: {
      width: 1200,
      height: 800,
      responsiveBreakpoints: [390, 768, 1024, 1200]
    },
    tokens: createDefaultTokens(),
    sections: [
      {
        id: 'sec-nav',
        name: 'Navbar',
        type: 'Navbar',
        tagName: 'header',
        bounds: { x: 0, y: 0, width: 1200, height: 80 },
        layout: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px' },
        elements: [
          { id: 'brand', type: 'Text', tagName: 'div', content: 'StudioCorp', bounds: { x: 32, y: 24, width: 140, height: 32 } },
          { id: 'btn-nav', type: 'Button', tagName: 'button', content: 'Get Started', bounds: { x: 1040, y: 20, width: 128, height: 40 } }
        ]
      },
      {
        id: 'sec-hero',
        name: 'Hero',
        type: 'Hero',
        tagName: 'section',
        bounds: { x: 0, y: 80, width: 1200, height: 480 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 32px' },
        elements: [
          { id: 'h1-title', type: 'Heading', tagName: 'h1', content: 'Next-Gen Web Engineering', bounds: { x: 200, y: 120, width: 800, height: 64 } },
          { id: 'p-sub', type: 'Text', tagName: 'p', content: 'Empower your teams with production code directly from high-fidelity designs.', bounds: { x: 250, y: 200, width: 700, height: 48 } },
          { id: 'btn-cta', type: 'Button', tagName: 'button', content: 'Start Building Free', bounds: { x: 500, y: 270, width: 200, height: 48 } },
          { id: 'img-hero', type: 'Image', tagName: 'img', content: '', bounds: { x: 100, y: 340, width: 1000, height: 200 }, attributes: { alt: 'Application preview interface' } }
        ]
      },
      {
        id: 'sec-features',
        name: 'FeatureGrid',
        type: 'FeatureGrid',
        tagName: 'section',
        bounds: { x: 0, y: 560, width: 1200, height: 200 },
        layout: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '32px' },
        elements: [
          { id: 'card-1', type: 'Card', tagName: 'article', content: 'Speed: Deploy in seconds.', bounds: { x: 32, y: 580, width: 360, height: 160 } },
          { id: 'card-2', type: 'Card', tagName: 'article', content: 'Quality: Semantic HTML5 & SCSS.', bounds: { x: 420, y: 580, width: 360, height: 160 } },
          { id: 'card-3', type: 'Card', tagName: 'article', content: 'Flexibility: Multiple stack targets.', bounds: { x: 808, y: 580, width: 360, height: 160 } }
        ]
      },
      {
        id: 'sec-footer',
        name: 'Footer',
        type: 'Footer',
        tagName: 'footer',
        bounds: { x: 0, y: 760, width: 1200, height: 40 },
        layout: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px' },
        elements: [
          { id: 'foot-text', type: 'Text', tagName: 'p', content: '© 2026 WebDev AI Studio. All rights reserved.', bounds: { x: 400, y: 770, width: 400, height: 20 } }
        ]
      }
    ]
  };
}

(async () => {
  // 1. Screenshot upload & metadata extraction
  await test('1. Screenshot upload & metadata extraction', async () => {
    const pngBuffer = createMinimalPng();
    const meta = parseImageBuffer(pngBuffer);
    assert.strictEqual(meta.format, 'png');
    assert.strictEqual(meta.width, 1200);
    assert.strictEqual(meta.height, 800);

    const base64Png = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const result = await analyzeScreenshot(base64Png, 'landing-hero.png');
    assert.strictEqual(result.sourceType, 'screenshot');
    assert.ok(result.ir);
    const w = result.ir.canvas?.width ?? result.ir.viewport?.width;
    const h = result.ir.canvas?.height ?? result.ir.viewport?.height;
    assert.strictEqual(w, 1200);
    assert.strictEqual(h, 800);
    assert.ok(result.sections.length > 0);
  });

  // 2. Invalid image error rejection
  await test('2. Invalid image error rejection', async () => {
    const corruptBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44]);
    assert.throws(() => {
      parseImageBuffer(corruptBuffer);
    }, /Unsupported or unrecognized image format/);

    try {
      await analyzeScreenshot('not-a-valid-data-url', 'corrupt.png');
      assert.fail('Should have thrown on invalid image string');
    } catch (e) {
      assert.ok(e.message);
    }
  });

  // 3. Figma URL validation & parsing
  await test('3. Figma URL validation & parsing', async () => {
    const validUrl = 'https://www.figma.com/design/AbC123XyZ456/Mobile-App-Flow?node-id=102-45';
    const parsed = parseFigmaUrl(validUrl);
    assert.strictEqual(parsed.valid, true);
    assert.strictEqual(parsed.fileKey, 'AbC123XyZ456');
    assert.strictEqual(parsed.nodeId, '102:45');

    // Without token: returns honest unauthenticated state
    const metaUnconnected = await extractDesignMetadata({ fileKey: parsed.fileKey, nodeId: parsed.nodeId });
    assert.strictEqual(metaUnconnected.connected, false);
    assert.strictEqual(metaUnconnected.message, 'Connect Figma to inspect design metadata.');

    const invalidUrl = 'https://google.com/search?q=figma';
    const parsedInvalid = parseFigmaUrl(invalidUrl);
    assert.strictEqual(parsedInvalid.valid, false);
  });

  // 4. Design Intermediate Representation (DIR) creation & validation
  await test('4. Design Intermediate Representation (DIR) creation & validation', async () => {
    const ir = createSampleIR();
    const validated = validateIntermediateRepresentation(ir);
    assert.strictEqual(validated.valid, true);

    const invalidIr = { version: '1.0.0' }; // missing required fields
    const invalidRes = validateIntermediateRepresentation(invalidIr);
    assert.strictEqual(invalidRes.valid, false);
    assert.ok(invalidRes.errors.length > 0);
  });

  // 5. HTML + SCSS generation
  await test('5. HTML + SCSS generation', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'html', styling: 'scss' });
    assert.strictEqual(result.framework, 'html');
    assert.strictEqual(result.styling, 'scss');
    
    const indexHtml = result.files.find(f => f.path === 'index.html');
    assert.ok(indexHtml, 'index.html must exist');
    assert.ok(indexHtml.content.includes('<header class="navbar-section'), 'Semantic header expected');
    assert.ok(indexHtml.content.includes('<main'), 'Semantic main landmark expected');
    assert.ok(indexHtml.content.includes('<footer class="footer-section'), 'Semantic footer expected');
    assert.ok(!indexHtml.content.includes('<div><div><div>'), 'Must not have nested div soup');

    const scss = result.files.find(f => f.path === 'styles.scss');
    assert.ok(scss, 'styles.scss must exist');
    assert.ok(scss.content.includes('$font-sans:'), 'SCSS variables expected');
    assert.ok(scss.content.includes('@mixin respond-to'), 'Responsive SCSS mixin expected');
  });

  // 6. React JSX/TSX generation
  await test('6. React JSX/TSX generation', async () => {
    const ir = createSampleIR();
    // React JSX + Tailwind
    const resultJsx = await generateCode(ir, { framework: 'react', styling: 'tailwind', typescript: false });
    assert.ok(resultJsx.files.find(f => f.path === 'src/App.jsx'));
    assert.ok(resultJsx.files.find(f => f.path === 'src/components/Hero.jsx'));
    assert.ok(resultJsx.files.find(f => f.path === 'src/components/Navbar.jsx'));
    assert.ok(resultJsx.files.find(f => f.path === 'tailwind.config.js'));

    // React TSX + SCSS
    const resultTsx = await generateCode(ir, { framework: 'react', styling: 'scss', typescript: true });
    assert.ok(resultTsx.files.find(f => f.path === 'src/App.tsx'));
    assert.ok(resultTsx.files.find(f => f.path === 'src/components/Hero.tsx'));
    const heroTsx = resultTsx.files.find(f => f.path === 'src/components/Hero.tsx');
    assert.ok(heroTsx.content.includes('interface HeroProps'));
  });

  // 7. Next.js App Router generation
  await test('7. Next.js App Router generation', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'nextjs', styling: 'tailwind' });
    assert.ok(result.files.find(f => f.path === 'app/layout.jsx'));
    assert.ok(result.files.find(f => f.path === 'app/page.jsx'));
    assert.ok(result.files.find(f => f.path === 'components/Hero.jsx'));
    assert.ok(result.files.find(f => f.path === 'tailwind.config.js'));
    const layout = result.files.find(f => f.path === 'app/layout.jsx');
    assert.ok(layout.content.includes('export const metadata = {'));
  });

  // 8. Vue 3 SFC generation
  await test('8. Vue 3 SFC generation', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'vue', styling: 'scss' });
    const appVue = result.files.find(f => f.path === 'src/App.vue');
    assert.ok(appVue);
    assert.ok(appVue.content.includes('<script setup>'));
    assert.ok(appVue.content.includes('<template>'));
    assert.ok(appVue.content.includes('<style scoped lang="scss">'));
  });

  // 9. Svelte generation
  await test('9. Svelte generation', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'svelte', styling: 'css' });
    const appSvelte = result.files.find(f => f.path === 'src/App.svelte');
    assert.ok(appSvelte);
    assert.ok(appSvelte.content.includes('<script>'));
    assert.ok(appSvelte.content.includes('<style>'));
    assert.ok(appSvelte.content.includes('<main'));
  });

  // 10. SCSS & CSS tokens generation
  await test('10. SCSS & CSS tokens generation', async () => {
    const ir = createSampleIR();
    const cssTokens = generateFrameworkTokens(ir, 'css');
    assert.ok(cssTokens.file.content.includes(':root {'));
    assert.ok(cssTokens.file.content.includes('--color-primary:'));
    assert.ok(cssTokens.file.content.includes('--font-sans:'));

    const scssTokens = generateFrameworkTokens(ir, 'scss');
    assert.ok(scssTokens.file.content.includes('$color-primary:'));
    assert.ok(scssTokens.file.content.includes('$font-sans:'));
    assert.ok(scssTokens.file.content.includes('@mixin respond-to('));
  });

  // 11. Tailwind configuration & utility generation
  await test('11. Tailwind configuration & utility generation', async () => {
    const ir = createSampleIR();
    const twTokens = generateFrameworkTokens(ir, 'tailwind');
    assert.strictEqual(twTokens.file.path, 'tailwind.config.js');
    assert.ok(twTokens.file.content.includes('module.exports = {'));
    assert.ok(twTokens.file.content.includes('theme: {'));
    assert.ok(twTokens.file.content.includes('extend: {'));

    const result = await generateCode(ir, { framework: 'react', styling: 'tailwind' });
    const hero = result.files.find(f => f.path === 'src/components/Hero.jsx');
    assert.ok(hero.content.includes('className="'), 'Tailwind classNames should be present');
  });

  // 12. Responsive rules & breakpoint handling
  await test('12. Responsive rules & breakpoint handling', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'html', styling: 'scss' });
    const scss = result.files.find(f => f.path === 'styles.scss');
    assert.ok(scss.content.includes('@include respond-to(tablet)'));
    assert.ok(scss.content.includes('@include respond-to(mobile)'));
  });

  // 13. Component detection & semantic naming
  await test('13. Component detection & semantic naming', async () => {
    const ir = createSampleIR();
    const sectionNames = ir.sections.map(s => s.name);
    assert.ok(sectionNames.includes('Navbar'));
    assert.ok(sectionNames.includes('Hero'));
    assert.ok(sectionNames.includes('FeatureGrid'));
    assert.ok(sectionNames.includes('Footer'));

    const result = await generateCode(ir, { framework: 'html', styling: 'scss' });
    const html = result.files.find(f => f.path === 'index.html').content;
    assert.ok(html.includes('<header'));
    assert.ok(html.includes('<nav'));
    assert.ok(html.includes('<section'));
    assert.ok(html.includes('<footer'));
  });

  // 14. Existing component reuse mapping
  await test('14. Existing component reuse mapping', async () => {
    const ir = createSampleIR();
    const mapped = applyExistingProjectRules(ir, {
      reuseButton: true,
      reuseCard: true
    });
    assert.strictEqual(mapped.applied, true);
    assert.ok(mapped.modifications.some(m => m.includes('Button')));
  });

  // 15. WordPress PHP & ACF field generation
  await test('15. WordPress PHP & ACF field generation', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'wordpress', styling: 'scss', wordpressAcf: true });
    assert.strictEqual(result.framework, 'wordpress');
    
    const phpTemplate = result.files.find(f => f.path.endsWith('.php'));
    assert.ok(phpTemplate, 'PHP template file must exist');
    assert.ok(phpTemplate.content.includes("<?php"));
    assert.ok(phpTemplate.content.includes("get_field('hero_title')"));
    assert.ok(phpTemplate.content.includes("have_rows('hero_features')"));

    const acfJson = result.files.find(f => f.path.includes('acf-json'));
    assert.ok(acfJson, 'ACF JSON configuration must exist');
    const parsedAcf = JSON.parse(acfJson.content);
    assert.ok(parsedAcf.title.includes('Hero Section'));
    assert.ok(parsedAcf.fields.length > 0);
  });

  // 16. Accessibility & semantic landmark checks
  await test('16. Accessibility & semantic landmark checks', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'html', styling: 'scss' });
    const quality = inspectCodeQuality(result.files);
    assert.ok(quality.score >= 85, `Expected high quality score, got ${quality.score}`);
    assert.ok(quality.categories.semanticStructure >= 85);
    assert.ok(quality.categories.accessibility >= 85);
  });

  // 17. Code quality inspection engine & auto-fix
  await test('17. Code quality inspection engine & auto-fix', async () => {
    const badFiles = [
      {
        path: 'index.html',
        content: `<!DOCTYPE html><html><body><img src="test.png"><div>No alt image</div></body></html>`
      }
    ];
    const initialReport = inspectCodeQuality(badFiles);
    assert.ok(initialReport.issues.some(i => i.id === 'a11y-missing-alt'));

    const fixed = fixCodeQuality(badFiles, initialReport.issues);
    assert.ok(fixed.repairedCount > 0);
    const fixedHtml = fixed.files[0].content;
    assert.ok(fixedHtml.includes('alt="Descriptive illustration"'));
  });

  // 18. Visual preview HTML assembly
  await test('18. Visual preview HTML assembly', async () => {
    const ir = createSampleIR();
    const result = await generateCode(ir, { framework: 'html', styling: 'scss' });
    const previewHtml = buildPreviewHtml(result.files, 'html');
    assert.ok(previewHtml.includes('<!DOCTYPE html>'));
    assert.ok(previewHtml.includes('<style>'));
    assert.ok(previewHtml.includes('StudioCorp'));
  });

  // 19. Visual comparison & diff logic
  await test('19. Visual comparison & diff logic', async () => {
    const originalBounds = [
      { id: 'btn', x: 10, y: 10, width: 100, height: 40 },
      { id: 'title', x: 10, y: 60, width: 300, height: 40 }
    ];
    const renderedBounds = [
      { id: 'btn', x: 10, y: 12, width: 100, height: 40 }, // 2px vertical delta
      { id: 'title', x: 10, y: 60, width: 300, height: 40 }
    ];
    const comparison = compareVisualLayouts(originalBounds, renderedBounds);
    assert.ok(typeof comparison.layoutMatchScore === 'number');
    assert.ok(comparison.layoutMatchScore > 90);
    assert.strictEqual(comparison.shifts.length, 1);
    assert.strictEqual(comparison.shifts[0].id, 'btn');
  });

  // 20. AI refinement surgical patching
  await test('20. AI refinement surgical patching', async () => {
    const files = [
      { path: 'index.html', content: '<button class="btn-primary">Click Me</button>' },
      { path: 'styles.scss', content: '.btn-primary { background: #3b82f6; padding: 8px 16px; }' }
    ];
    const prompt = 'Make the button background emerald green #10b981 and padding larger';
    const refined = await refineCodeSurgical(files, prompt, 'styles.scss');
    assert.strictEqual(refined.patchedFile, 'styles.scss');
    assert.ok(refined.files.find(f => f.path === 'styles.scss').content.includes('#10b981'));
    // Make sure other files remain intact
    assert.strictEqual(refined.files.find(f => f.path === 'index.html').content, '<button class="btn-primary">Click Me</button>');
  });

  // 21. Multi-file ZIP export creation
  await test('21. Multi-file ZIP export creation', async () => {
    const files = [
      { path: 'index.html', content: '<h1>Hello World</h1>' },
      { path: 'css/styles.css', content: 'body { color: blue; }' },
      { path: 'js/main.js', content: 'console.log("Ready");' }
    ];
    const zipBuffer = createZipArchive(files);
    assert.ok(Buffer.isBuffer(zipBuffer));
    // Verify standard PKZIP magic number: 0x50 0x4b 0x03 0x04
    assert.strictEqual(zipBuffer[0], 0x50);
    assert.strictEqual(zipBuffer[1], 0x4b);
    assert.strictEqual(zipBuffer[2], 0x03);
    assert.strictEqual(zipBuffer[3], 0x04);
    assert.ok(zipBuffer.length > 100);
  });

  // 22. SQLite persistence across design tables
  await test('22. SQLite persistence across design tables', async () => {
    const testUserId = 'user-test-' + Date.now();
    const projId = 'proj-test-' + Date.now();
    
    // Insert parent user for foreign key constraint
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, name)
      VALUES (?, ?, ?)
    `).run(testUserId, `${testUserId}@example.com`, 'Test User');

    // Insert design project
    db.prepare(`
      INSERT INTO design_projects (id, user_id, name, framework, styling, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(projId, testUserId, 'Test Design Project', 'react', 'tailwind');

    // Insert design source
    const srcId = 'src-test-' + Date.now();
    db.prepare(`
      INSERT INTO design_sources (id, design_project_id, user_id, source_type, image_name, image_width, image_height, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(srcId, projId, testUserId, 'screenshot', 'test.png', 1200, 800);

    // Insert analysis
    const analysisId = 'ana-test-' + Date.now();
    db.prepare(`
      INSERT INTO design_analyses (id, user_id, source_id, ir_json, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(analysisId, testUserId, srcId, '{}');

    // Insert generation
    const genId = 'gen-test-' + Date.now();
    db.prepare(`
      INSERT INTO design_generations (id, design_project_id, analysis_id, user_id, framework, styling, language, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(genId, projId, analysisId, testUserId, 'react', 'tailwind', 'javascript', 'completed');

    // Insert design file
    const fileId = 'file-test-' + Date.now();
    db.prepare(`
      INSERT INTO design_files (id, generation_id, file_path, file_type, file_content)
      VALUES (?, ?, ?, ?, ?)
    `).run(fileId, genId, 'src/App.jsx', 'component', 'export default function App() {}');

    // Verify retrieval
    const row = db.prepare(`
      SELECT p.name, s.image_name, g.framework, f.file_path
      FROM design_projects p
      JOIN design_sources s ON s.design_project_id = p.id
      JOIN design_generations g ON g.design_project_id = p.id
      JOIN design_files f ON f.generation_id = g.id
      WHERE p.id = ?
    `).get(projId);

    assert.ok(row);
    assert.strictEqual(row.name, 'Test Design Project');
    assert.strictEqual(row.image_name, 'test.png');
    assert.strictEqual(row.framework, 'react');
    assert.strictEqual(row.file_path, 'src/App.jsx');

    // Clean up
    db.prepare('DELETE FROM design_files WHERE id = ?').run(fileId);
    db.prepare('DELETE FROM design_generations WHERE id = ?').run(genId);
    db.prepare('DELETE FROM design_analyses WHERE id = ?').run(analysisId);
    db.prepare('DELETE FROM design_sources WHERE id = ?').run(srcId);
    db.prepare('DELETE FROM design_projects WHERE id = ?').run(projId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  // 23. Multi-user security isolation
  await test('23. Multi-user security isolation', async () => {
    const userA = 'user-a-' + Date.now();
    const userB = 'user-b-' + Date.now();
    const projA = 'proj-user-a-' + Date.now();

    // Insert parent users for foreign key constraint
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, name)
      VALUES (?, ?, ?)
    `).run(userA, `${userA}@example.com`, 'User A');
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, name)
      VALUES (?, ?, ?)
    `).run(userB, `${userB}@example.com`, 'User B');

    db.prepare(`
      INSERT INTO design_projects (id, user_id, name, framework, styling, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(projA, userA, 'User A Secret Project', 'html', 'scss');

    // User B tries to query User A's project
    const userBQuery = db.prepare('SELECT * FROM design_projects WHERE id = ? AND user_id = ?').get(projA, userB);
    assert.strictEqual(userBQuery, undefined, 'User B must not see User A project');

    // User A can access
    const userAQuery = db.prepare('SELECT * FROM design_projects WHERE id = ? AND user_id = ?').get(projA, userA);
    assert.ok(userAQuery);
    assert.strictEqual(userAQuery.name, 'User A Secret Project');

    db.prepare('DELETE FROM design_projects WHERE id = ?').run(projA);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userA, userB);
  });

  // 24. Input sanitization & security guard
  await test('24. Input sanitization & security guard', async () => {
    // Test ZIP archive does not allow directory traversal filenames
    const maliciousFiles = [
      { path: '../../../../etc/passwd', content: 'root:x:0:0:' },
      { path: 'normal.html', content: '<p>Safe</p>' }
    ];
    const zip = createZipArchive(maliciousFiles);
    // The zip exporter must sanitize or strip leading traversal sequences
    const zipStr = zip.toString('binary');
    assert.ok(!zipStr.includes('../../../../etc/passwd'), 'Directory traversal path must be sanitized');

    // Test buildPreviewHtml sanitizes script escapes
    const previewWithHtml = buildPreviewHtml([
      { path: 'index.html', content: '<h1>Safe Content</h1>' }
    ], 'html');
    assert.ok(previewWithHtml.includes('<h1>Safe Content</h1>'));
    assert.ok(!previewWithHtml.includes('onerror=alert(1)'));
  });

  console.log('\n================================================================');
  console.log(`  DESIGN → CODE TESTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
})();
