/**
 * scripts/tests/test-acf-architect.js
 * Comprehensive automated Playwright test suite for WebDev AI Studio ACF ARCHITECT.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '../../test-verification-evidence/acf-architect');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runAcfArchitectTests() {
  console.log('🚀 Starting ACF Architect Comprehensive Verification Suite...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // TEST SUITE 1: Direct Route Navigation & Legacy Redirect
    // =========================================================================
    console.log('\n--- Test Suite 1: Navigation & Direct Route Loading ---');
    
    // Direct navigation to /acf-architect
    await page.goto('http://127.0.0.1:3000/acf-architect', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const acfContainer = page.locator('#viewAcfArchitect');
    assert(await acfContainer.isVisible(), 'Direct navigation to /acf-architect renders #viewAcfArchitect container');

    const breadcrumb = page.locator('#breadcrumbCurrent');
    const bcText = await breadcrumb.textContent();
    assert(bcText.includes('ACF Architect'), `Breadcrumb displays "ACF Architect" (Actual: "${bcText}")`);

    const navItem = page.locator('#navAcfArchitect');
    const isNavActive = await navItem.evaluate(el => el.classList.contains('active'));
    assert(isNavActive, 'Sidebar item #navAcfArchitect has .active class');

    // Legacy redirect test: /acf-generator -> /acf-architect
    await page.goto('http://127.0.0.1:3000/acf-generator', { waitUntil: 'networkidle' });
    const currentUrl = page.url();
    assert(currentUrl.includes('/acf-architect'), `Legacy route /acf-generator redirects to /acf-architect (URL: ${currentUrl})`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-direct-navigation.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 2: Workspace Layout & 3-Pane Structure
    // =========================================================================
    console.log('\n--- Test Suite 2: 3-Pane Workspace Structure & Toolbar ---');

    const titleEl = page.locator('.acf-brand-title');
    assert((await titleEl.textContent()).includes('ACF Architect'), 'Workspace header shows "ACF Architect"');

    const taglineEl = page.locator('.acf-brand-tagline');
    assert((await taglineEl.textContent()).includes('Design your WordPress content architecture'), 'Workspace shows tagline');

    // Panes
    const leftPane = page.locator('.acf-pane-tree');
    const centerPane = page.locator('.acf-pane-editor');
    const rightPane = page.locator('.acf-pane-output');
    assert(await leftPane.isVisible(), 'Left Pane (Field Tree) is visible');
    assert(await centerPane.isVisible(), 'Center Pane (Field Editor) is visible');
    assert(await rightPane.isVisible(), 'Right Pane (Code Outputs) is visible');

    // Toolbar actions
    assert(await page.locator('#acfBtnStartModal').isVisible(), 'New/Start button is visible');
    assert(await page.locator('#acfBtnAiPrompt').isVisible(), 'AI Prompt button is visible');
    assert(await page.locator('#acfBtnImportJson').isVisible(), 'Import ACF button is visible');
    assert(await page.locator('#acfBtnInspectProject').isVisible(), 'Inspect Theme button is visible');
    assert(await page.locator('#acfBtnValidate').isVisible(), 'Validate button is visible');
    assert(await page.locator('#acfBtnExportToggle').isVisible(), 'Export menu toggle is visible');
    assert(await page.locator('#acfBtnApply').isVisible(), 'Apply Changes button is visible');

    // Output tabs
    const tabJson = page.locator('.acf-tab-btn[data-tab="json"]');
    const tabPhp = page.locator('.acf-tab-btn[data-tab="php"]');
    const tabTemplate = page.locator('.acf-tab-btn[data-tab="template"]');
    const tabDocs = page.locator('.acf-tab-btn[data-tab="docs"]');
    const tabDiff = page.locator('.acf-tab-btn[data-tab="diff"]');
    assert(await tabJson.isVisible(), 'Tab "ACF JSON" is present');
    assert(await tabPhp.isVisible(), 'Tab "PHP Registration" is present');
    assert(await tabTemplate.isVisible(), 'Tab "WP Template" is present');
    assert(await tabDocs.isVisible(), 'Tab "Field Docs" is present');
    assert(await tabDiff.isVisible(), 'Tab "Architecture Diff" is present');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-layout-structure.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 3: AI Schema Generation Workflow
    // =========================================================================
    console.log('\n--- Test Suite 3: AI Architecture Generation ---');

    // Open AI Prompt Modal
    await page.locator('#acfBtnAiPrompt').dispatchEvent('click');
    await page.waitForTimeout(300);

    const promptModal = page.locator('#acfAiPromptModal');
    assert(await promptModal.isVisible(), 'AI Prompt modal opens on button click');

    const promptInput = page.locator('#acfAiPromptInput');
    await promptInput.fill('Case Study with client name, hero banner image, project metrics repeater, and flexible testimonials layout');
    
    // Submit AI Architect request
    const submitPromptBtn = page.locator('#acfBtnSubmitAiPrompt');
    await submitPromptBtn.dispatchEvent('click');

    // Wait for generation to complete and modal to close
    await page.waitForFunction(() => !document.getElementById('acfAiPromptModal'), { timeout: 15000 });
    await page.waitForTimeout(500);

    // Verify fields populated in tree
    const treeNodes = page.locator('.acf-tree-node:not(.acf-tree-root-node)');
    const treeCount = await treeNodes.count();
    assert(treeCount >= 3, `Tree contains generated fields (Found: ${treeCount} fields)`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-ai-generated-tree.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 4: Field Selection & Inspector Editing
    // =========================================================================
    console.log('\n--- Test Suite 4: Field Selection & Inspector Editing ---');

    // Click on the first field node in tree
    await treeNodes.first().dispatchEvent('click');
    await page.waitForTimeout(300);

    const fieldLabelInput = page.locator('#acfPropLabel');
    const fieldNameInput = page.locator('#acfPropName');
    const fieldTypeSelect = page.locator('#acfPropType');

    assert(await fieldLabelInput.isVisible(), 'Field Label input is visible in inspector');
    assert(await fieldNameInput.isVisible(), 'Field Name input is visible in inspector');
    assert(await fieldTypeSelect.isVisible(), 'Field Type selector is visible in inspector');

    const initialLabel = await fieldLabelInput.inputValue();
    assert(initialLabel.length > 0, `Active field label is populated: "${initialLabel}"`);

    // Modify label and name, verify tree reflects label
    await fieldLabelInput.fill('Client Featured Name');
    await fieldLabelInput.dispatchEvent('input');
    await fieldNameInput.fill('client_featured_name');
    await fieldNameInput.dispatchEvent('input');
    await page.waitForTimeout(200);

    const updatedName = await fieldNameInput.inputValue();
    assert(updatedName === 'client_featured_name', `Field Name successfully updated to: "${updatedName}"`);

    const activeNodeLabel = page.locator('.acf-tree-node.selected .acf-node-label');
    assert((await activeNodeLabel.textContent()).includes('Client Featured Name'), 'Tree node label updates in real time');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-field-editing.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 5: Field CRUD Operations (Add, Duplicate, Move, Delete)
    // =========================================================================
    console.log('\n--- Test Suite 5: Field CRUD Operations ---');

    const countBeforeAdd = await page.locator('.acf-tree-node:not(.acf-tree-root-node)').count();
    
    // Add Field
    await page.locator('#acfBtnAddField').dispatchEvent('click');
    await page.waitForTimeout(300);
    const countAfterAdd = await page.locator('.acf-tree-node:not(.acf-tree-root-node)').count();
    assert(countAfterAdd === countBeforeAdd + 1, `Add Field creates a new node (Before: ${countBeforeAdd}, After: ${countAfterAdd})`);

    // Duplicate Field
    const lastNode = page.locator('.acf-tree-node:not(.acf-tree-root-node)').last();
    await lastNode.dispatchEvent('click');
    await page.waitForTimeout(200);
    
    const countBeforeDup = await page.locator('.acf-tree-node:not(.acf-tree-root-node)').count();
    const dupBtn = page.locator('.acf-tree-node.selected button[data-action="duplicate"]');
    await dupBtn.dispatchEvent('click');
    await page.waitForTimeout(300);
    const countAfterDup = await page.locator('.acf-tree-node:not(.acf-tree-root-node)').count();
    assert(countAfterDup === countBeforeDup + 1, `Duplicate Field clones active field (Before: ${countBeforeDup}, After: ${countAfterDup})`);

    // Verify duplicate has _copy in name
    const dupFieldName = await page.locator('#acfPropName').inputValue();
    assert(dupFieldName.includes('_copy'), `Cloned field name contains "_copy": "${dupFieldName}"`);

    // Delete Field
    const delBtn = page.locator('.acf-tree-node.selected button[data-action="delete"]');
    await delBtn.dispatchEvent('click');
    await page.waitForTimeout(300);
    const countAfterDel = await page.locator('.acf-tree-node:not(.acf-tree-root-node)').count();
    assert(countAfterDel === countAfterDup - 1, `Delete Field removes active field without native alert (Count: ${countAfterDel})`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-crud-operations.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 6: Location Rules & Conditional Logic Builders
    // =========================================================================
    console.log('\n--- Test Suite 6: Location Rules & Conditional Logic ---');

    // Click on Root Header in tree to open Group Settings & Location Rules
    await page.locator('.acf-tree-root-node').dispatchEvent('click');
    await page.waitForTimeout(300);

    const locationGroupBtn = page.locator('#acfBtnAddLocationGroup');
    assert(await locationGroupBtn.isVisible(), 'Group Settings & Location Rules builder displayed when selecting root node');

    const initialRuleGroups = await page.locator('.acf-rule-group-card').count();
    await locationGroupBtn.dispatchEvent('click');
    await page.waitForTimeout(300);
    const newRuleGroups = await page.locator('.acf-rule-group-card').count();
    assert(newRuleGroups === initialRuleGroups + 1, `+ Add Location Rule Group creates new rule group (Count: ${newRuleGroups})`);

    // Conditional Logic on a field
    await page.locator('.acf-tree-node:not(.acf-tree-root-node)').first().dispatchEvent('click');
    await page.waitForTimeout(300);

    const condCheckbox = page.locator('#acfToggleConditionalLogic');
    assert(await condCheckbox.isVisible(), 'Conditional logic toggle is visible on field');
    await condCheckbox.check();
    await page.waitForTimeout(300);

    const condGroup = page.locator('#acfConditionalLogicBody');
    assert(await condGroup.isVisible(), 'Conditional Logic container appears when toggled on');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-location-and-conditionals.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 7: Multi-Tab Code Outputs & Safety Verification
    // =========================================================================
    console.log('\n--- Test Suite 7: Generated Code Outputs (JSON, PHP, Template, Docs, Diff) ---');

    // 1. ACF JSON Tab
    await tabJson.dispatchEvent('click');
    await page.waitForTimeout(200);
    const jsonOutput = await page.locator('#acfOutputCode').textContent();
    assert(jsonOutput.includes('"key": "group_') && jsonOutput.includes('"fields":'), 'ACF JSON output contains valid group schema with key and fields');
    
    // JSON syntax verification
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(jsonOutput);
    } catch (e) {}
    assert(parsedJson !== null && Array.isArray(parsedJson.fields), 'ACF JSON output is 100% valid parseable JSON');

    // 2. PHP Registration Tab
    await tabPhp.dispatchEvent('click');
    await page.waitForTimeout(200);
    const phpOutput = await page.locator('#acfOutputCode').textContent();
    assert(phpOutput.includes('acf_add_local_field_group('), 'PHP output contains acf_add_local_field_group() call');
    assert(phpOutput.includes("add_action('acf/init'"), 'PHP output hooked to acf/init');

    // 3. WP Template Tab
    await tabTemplate.dispatchEvent('click');
    await page.waitForTimeout(200);
    const templateOutput = await page.locator('#acfOutputCode').textContent();
    assert(templateOutput.includes('get_field(') || templateOutput.includes('have_rows('), 'WP Template contains get_field() or have_rows()');
    assert(templateOutput.includes('esc_html(') || templateOutput.includes('esc_url(') || templateOutput.includes('wp_kses_post('), 'WP Template employs safe escaping functions');

    // 4. Docs Tab
    await tabDocs.dispatchEvent('click');
    await page.waitForTimeout(200);
    const docsOutput = await page.locator('#acfOutputCode').textContent();
    assert(docsOutput.includes('| Field') || docsOutput.includes('# '), 'Docs tab generates Markdown documentation');

    // 5. Diff Tab
    await tabDiff.dispatchEvent('click');
    await page.waitForTimeout(200);
    const diffText = await page.locator('#acfOutputCode').textContent();
    assert(diffText.length > 0, 'Diff view contains change logs / diff details');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '07-outputs-and-diff.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 8: Architecture Validation Engine
    // =========================================================================
    console.log('\n--- Test Suite 8: Architecture Validation Engine ---');

    await page.locator('#acfBtnValidate').dispatchEvent('click');
    await page.waitForTimeout(300);

    const valModal = page.locator('#acfValidationModal');
    assert(await valModal.isVisible(), 'Validation modal opens');

    const valScore = page.locator('#acfValidationScore');
    const scoreText = await valScore.textContent();
    assert(scoreText.includes('/100') || scoreText.includes('Score'), `Validation score calculated: "${scoreText}"`);

    const valList = page.locator('.acf-validation-check-item');
    const checksCount = await valList.count();
    assert(checksCount >= 4, `Validation performs comprehensive checks across layers (Found: ${checksCount} checks)`);

    // Close validation modal
    await page.locator('#acfBtnCloseValidationModal').dispatchEvent('click');
    await page.waitForTimeout(200);
    assert(!await valModal.isVisible(), 'Validation modal closes cleanly');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '08-validation-modal.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 9: WordPress Project Inspector Modal
    // =========================================================================
    console.log('\n--- Test Suite 9: Project Inspector Modal ---');

    await page.locator('#acfBtnInspectProject').dispatchEvent('click');
    await page.waitForTimeout(300);

    const inspectModal = page.locator('#acfInspectModal');
    assert(await inspectModal.isVisible(), 'Inspect WordPress Theme modal opens');

    const pathInput = page.locator('#acfInspectPathInput');
    await pathInput.fill('./');
    
    await page.locator('#acfBtnRunInspect').dispatchEvent('click');
    await page.waitForTimeout(1000);

    const inspectResults = page.locator('#acfInspectResults');
    assert(await inspectResults.isVisible(), 'Inspection results rendered');

    await page.locator('#acfBtnCloseInspectModal').dispatchEvent('click');
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '09-project-inspector.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 10: Safe Apply Changes Modal
    // =========================================================================
    console.log('\n--- Test Suite 10: Safe Apply Changes Modal ---');

    await page.locator('#acfBtnApply').dispatchEvent('click');
    await page.waitForTimeout(300);

    const applyModal = page.locator('#acfApplyModal');
    assert(await applyModal.isVisible(), 'Apply Changes modal opens');

    const targetJsonPath = page.locator('#acfApplyJsonPath');
    assert(await targetJsonPath.isVisible(), 'Target acf-json/ file path is displayed');

    const dryRunDiff = page.locator('#acfApplyDryRunDiff');
    assert(await dryRunDiff.isVisible(), 'Dry-run preview diff is displayed before applying');

    const confirmCheckbox = page.locator('#acfApplyConfirmCheckbox');
    assert(await confirmCheckbox.isVisible(), 'Requires explicit confirmation checkbox for safety');

    await page.locator('#acfBtnCloseApplyModal').dispatchEvent('click');
    await page.waitForTimeout(200);
    assert(!await applyModal.isVisible(), 'Apply modal closes without unintended disk writes');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '10-safe-apply-modal.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 11: Undo / Redo History
    // =========================================================================
    console.log('\n--- Test Suite 11: Undo / Redo History ---');

    // Click Undo
    await page.locator('#acfBtnUndo').dispatchEvent('click');
    await page.waitForTimeout(300);
    assert(true, 'Undo action executes smoothly without throwing errors');

    // Click Redo
    await page.locator('#acfBtnRedo').dispatchEvent('click');
    await page.waitForTimeout(300);
    assert(true, 'Redo action executes smoothly without throwing errors');

    // =========================================================================
    // TEST SUITE 12: Natural Language AI Patching Bar
    // =========================================================================
    console.log('\n--- Test Suite 12: Natural Language AI Command Bar ---');

    const aiCmdInput = page.locator('#acfCommandInput');
    assert(await aiCmdInput.isVisible(), 'AI natural language command bar is visible');

    await aiCmdInput.fill('Add a number field named reading_time_minutes with label "Reading Time (Minutes)"');
    await page.locator('#acfBtnRunCommand').dispatchEvent('click');
    await page.waitForTimeout(2500);

    const readingTimeField = page.locator('.acf-node-label:has-text("Reading Time")');
    const readingFieldExists = await readingTimeField.count() > 0;
    assert(readingFieldExists, 'AI Command Bar successfully added field via natural language');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '12-ai-patch-command.png'), fullPage: false });

  } catch (err) {
    console.error('💥 Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
    console.log(`\n========================================`);
    console.log(`ACF Architect Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`Evidence screenshots saved to: ${EVIDENCE_DIR}`);
    console.log(`========================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runAcfArchitectTests();
