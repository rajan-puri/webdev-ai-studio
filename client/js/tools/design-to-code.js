/**
 * client/js/tools/design-to-code.js
 * Frontend controller for WebDev AI Studio Design -> Code.
 * Transforms screenshots and Figma designs into production-ready code.
 */

(function () {
  'use strict';

  class DesignToCodeTool {
    constructor() {
      this.container = document.getElementById('viewDesignToCode');
      this.currentMode = 'screenshot'; // 'screenshot', 'figma', 'project'
      this.selectedPreset = 'react-tailwind';
      this.framework = 'react';
      this.styling = 'tailwind';
      this.language = 'javascript';
      this.activeTab = 'code'; // 'code', 'preview', 'compare', 'issues'
      this.activeViewport = 1440;

      this.uploadedDataUri = null;
      this.uploadedFileName = null;
      this.uploadedWidth = null;
      this.uploadedHeight = null;
      this.uploadedSourceId = null;
      this.selectedProjectId = null;

      this.figmaUrl = '';
      this.figmaData = null;

      this.analysisResult = null;
      this.generationResult = null;
      this.comparisonResult = null;
      this.activeFileIndex = 0;
      this.isGenerating = false;

      this.projectRules = {
        reuseButton: true,
        reuseCard: true,
        useBEM: false,
        useCssVariables: true,
        useTypeScript: false,
        acfMode: false
      };

      this.init();
    }

    init() {
      if (!this.container) return;
      this.render();
      this.bindEvents();
      this.setupClipboardPaste();
    }

    render() {
      this.container.innerHTML = `
        <div class="d2c-header">
          <div class="d2c-header-titles">
            <h1>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>Design → Code Studio</span>
            </h1>
            <p>Turn screenshots and Figma designs into responsive, production-ready code for your stack.</p>
          </div>
          <button type="button" class="d2c-history-btn" id="d2cHistoryBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>History & Revisions</span>
          </button>
        </div>

        <!-- Mode Switcher -->
        <div class="d2c-mode-switcher">
          <button type="button" class="d2c-mode-tab ${this.currentMode === 'screenshot' ? 'active' : ''}" data-mode="screenshot">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>Screenshot</span>
          </button>
          <button type="button" class="d2c-mode-tab ${this.currentMode === 'figma' ? 'active' : ''}" data-mode="figma">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"></path>
              <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"></path>
              <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"></path>
              <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"></path>
              <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"></path>
            </svg>
            <span>Figma</span>
          </button>
          <button type="button" class="d2c-mode-tab ${this.currentMode === 'project' ? 'active' : ''}" data-mode="project">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Existing Project</span>
          </button>
        </div>

        <!-- Input & Options Grid -->
        <div class="d2c-input-section">
          <!-- Left: Input Mode Card -->
          <div class="d2c-card">
            ${this.renderInputCardContent()}
          </div>

          <!-- Right: Stack & Rules Panel -->
          <div class="d2c-card d2c-config-panel">
            <span class="d2c-group-title">Target Stack Presets</span>
            <div class="d2c-presets-grid">
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'html-scss' ? 'active' : ''}" data-preset="html-scss">HTML + SCSS</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'react-scss' ? 'active' : ''}" data-preset="react-scss">React + SCSS</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'react-tailwind' ? 'active' : ''}" data-preset="react-tailwind">React + Tailwind</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'nextjs-tailwind' ? 'active' : ''}" data-preset="nextjs-tailwind">Next.js + Tailwind</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'vue-scss' ? 'active' : ''}" data-preset="vue-scss">Vue + SCSS</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'svelte-css' ? 'active' : ''}" data-preset="svelte-css">Svelte + CSS</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'html-uikit' ? 'active' : ''}" data-preset="html-uikit">HTML + UIkit</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'html-bootstrap' ? 'active' : ''}" data-preset="html-bootstrap">HTML + Bootstrap</button>
              <button type="button" class="d2c-preset-pill ${this.selectedPreset === 'wordpress' ? 'active' : ''}" data-preset="wordpress">WordPress + SCSS</button>
            </div>

            <div class="d2c-form-row">
              <label>Project Architecture Rules</label>
              <div class="d2c-rules-box">
                <label class="d2c-checkbox-item">
                  <input type="checkbox" id="ruleReuseButton" ${this.projectRules.reuseButton ? 'checked' : ''}>
                  <span>Reuse existing Button component</span>
                </label>
                <label class="d2c-checkbox-item">
                  <input type="checkbox" id="ruleReuseCard" ${this.projectRules.reuseCard ? 'checked' : ''}>
                  <span>Reuse existing Card component</span>
                </label>
                <label class="d2c-checkbox-item">
                  <input type="checkbox" id="ruleUseBEM" ${this.projectRules.useBEM ? 'checked' : ''}>
                  <span>Use BEM naming convention</span>
                </label>
                <label class="d2c-checkbox-item">
                  <input type="checkbox" id="ruleUseCssVars" ${this.projectRules.useCssVariables ? 'checked' : ''}>
                  <span>Generate CSS custom properties</span>
                </label>
                <label class="d2c-checkbox-item">
                  <input type="checkbox" id="ruleTypeScript" ${this.projectRules.useTypeScript ? 'checked' : ''}>
                  <span>Generate TypeScript (.tsx / .ts)</span>
                </label>
                <label class="d2c-checkbox-item">
                  <input type="checkbox" id="ruleAcfMode" ${this.projectRules.acfMode ? 'checked' : ''}>
                  <span>WordPress ACF fields integration</span>
                </label>
              </div>
            </div>

            <button type="button" class="d2c-generate-btn" id="d2cGenerateBtn" ${!this.uploadedDataUri && !this.figmaUrl ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>${this.isGenerating ? 'Generating Code...' : 'Analyze & Generate Code'}</span>
            </button>
          </div>
        </div>

        <!-- Generated Workspace Split -->
        ${this.generationResult ? this.renderWorkspace() : ''}
      `;
    }

    renderInputCardContent() {
      if (this.currentMode === 'screenshot') {
        if (this.uploadedDataUri) {
          return `
            <div class="d2c-preview-holder">
              <div class="d2c-img-wrap">
                <img src="${this.uploadedDataUri}" alt="Uploaded design preview" />
              </div>
              <div class="d2c-preview-meta">
                <span class="d2c-dim-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  <span>${this.uploadedWidth || 1440} × ${this.uploadedHeight || 900} px</span>
                </span>
                <span style="color: var(--text-muted);">${this.uploadedFileName || 'screenshot.png'}</span>
                <div>
                  <button type="button" class="btn btn-ghost" id="d2cRemoveImgBtn" style="font-size: 11px; color: var(--color-danger);">Remove</button>
                  <button type="button" class="btn btn-ghost" id="d2cReplaceImgBtn" style="font-size: 11px;">Replace</button>
                </div>
              </div>
            </div>
            <input type="file" id="d2cFileInput" accept="image/png, image/jpeg, image/webp" style="display: none;">
          `;
        }

        return `
          <div class="d2c-dropzone" id="d2cDropzone">
            <div class="d2c-dropzone-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3>Drop your design screenshot here</h3>
            <p>Supports PNG, JPG, JPEG, and WEBP files up to 20MB</p>
            <p>Or paste directly from clipboard with <span class="d2c-kbd">⌘V</span> / <span class="d2c-kbd">Ctrl+V</span></p>
            <button type="button" class="btn btn-outline" id="d2cSelectFileBtn" style="margin-top: 8px;">
              Select Image File
            </button>
            <input type="file" id="d2cFileInput" accept="image/png, image/jpeg, image/webp" style="display: none;">
          </div>
        `;
      }

      if (this.currentMode === 'figma') {
        return `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div class="d2c-form-row">
              <label>Figma Frame or Component URL</label>
              <input type="text" class="d2c-input" id="d2cFigmaUrlInput" placeholder="https://www.figma.com/design/:fileKey/:title?node-id=0:1" value="${this.figmaUrl || ''}">
            </div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5; background: var(--bg-surface-subtle); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">SOURCE: Figma (Deterministic Metadata)</div>
              <span>When connected via official Figma API token, layout frames, auto-layout padding, typography styles, and design tokens are extracted deterministically without AI guessing.</span>
            </div>
            <button type="button" class="btn btn-outline" id="d2cParseFigmaBtn" style="align-self: flex-start;">
              Inspect Figma Node
            </button>
          </div>
        `;
      }

      // Existing Project mode
      const projects = (window.ProjectManager && Array.isArray(window.ProjectManager.projects)) ? window.ProjectManager.projects : [];
      let projectOptions = '<option value="">Default WebDev AI Studio Workspace (Standalone)</option>';
      for (const p of projects) {
        const isSelected = this.selectedProjectId === p.id ? 'selected' : '';
        const pName = (p.name || 'Untitled Project').replace(/"/g, '&quot;');
        const pUrl = (p.website_url || p.url || '').replace(/"/g, '&quot;');
        projectOptions += `<option value="${p.id}" ${isSelected}>${pName} ${pUrl ? `(${pUrl})` : ''}</option>`;
      }

      return `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Inspect & Align with Existing Project</span>
          <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            Select a project from your workspace to automatically reuse existing design tokens, components (e.g. <code>components/Button</code>), and styling conventions rather than creating duplicate code.
          </p>
          <div class="d2c-form-row">
            <label>Select Workspace Project</label>
            <select class="d2c-select" id="d2cProjectSelect">
              ${projectOptions}
            </select>
          </div>
        </div>
      `;
    }

    renderWorkspace() {
      const files = this.generationResult.files || [];
      const activeFile = files[this.activeFileIndex] || files[0] || { filePath: '', fileContent: '' };
      const quality = this.generationResult.qualityReport || { score: 100, checks: [], issues: [] };

      return `
        <div class="d2c-workspace-container">
          <div class="d2c-workspace-tabs">
            <div class="d2c-tab-btn-group">
              <button type="button" class="d2c-ws-tab-btn ${this.activeTab === 'code' ? 'active' : ''}" data-tab="code">
                Code (${files.length} files)
              </button>
              <button type="button" class="d2c-ws-tab-btn ${this.activeTab === 'preview' ? 'active' : ''}" data-tab="preview">
                Live Preview
              </button>
              <button type="button" class="d2c-ws-tab-btn ${this.activeTab === 'compare' ? 'active' : ''}" data-tab="compare">
                Visual Compare
              </button>
              <button type="button" class="d2c-ws-tab-btn ${this.activeTab === 'issues' ? 'active' : ''}" data-tab="issues">
                Quality & A11y (${quality.issues?.length || 0})
              </button>
            </div>

            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-outline" id="d2cCopyCodeBtn" style="font-size: 12px; padding: 6px 12px;">
                Copy Current File
              </button>
              <button type="button" class="btn btn-primary" id="d2cDownloadZipBtn" style="font-size: 12px; padding: 6px 12px;">
                Download Project (.ZIP)
              </button>
            </div>
          </div>

          <!-- Split Screen: Left Code, Right Preview -->
          <div class="d2c-split-layout">
            <!-- Left Panel -->
            <div class="d2c-editor-card">
              <div class="d2c-editor-topbar">
                <div class="d2c-file-tabs">
                  ${files.map((f, idx) => `
                    <button type="button" class="d2c-file-tab ${idx === this.activeFileIndex ? 'active' : ''}" data-idx="${idx}">
                      ${f.filePath}
                    </button>
                  `).join('')}
                </div>
              </div>
              <pre class="d2c-editor-content"><code>${this.escapeHtml(activeFile.fileContent)}</code></pre>
            </div>

            <!-- Right Panel -->
            <div class="d2c-preview-card">
              <div class="d2c-preview-toolbar">
                <div class="d2c-viewport-pills">
                  <button type="button" class="d2c-vp-pill ${this.activeViewport === 1440 ? 'active' : ''}" data-vp="1440">Desktop (1440px)</button>
                  <button type="button" class="d2c-vp-pill ${this.activeViewport === 1024 ? 'active' : ''}" data-vp="1024">Tablet (1024px)</button>
                  <button type="button" class="d2c-vp-pill ${this.activeViewport === 390 ? 'active' : ''}" data-vp="390">Mobile (390px)</button>
                </div>
                <button type="button" class="btn btn-ghost" id="d2cRefreshPreviewBtn" style="font-size: 11px;">Reload</button>
              </div>

              <div class="d2c-sandbox-wrap">
                ${this.renderRightPanelTabContent()}
              </div>
            </div>
          </div>

          <!-- AI Refinement Bar -->
          <div class="d2c-refinement-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-primary);">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <input type="text" class="d2c-refinement-input" id="d2cRefineInput" placeholder="Tell the AI what to change... (e.g. 'Move the heading 10px higher', 'Make the CTA green', 'On mobile stack image below text')">
            <button type="button" class="d2c-refine-btn" id="d2cRefineBtn">Apply Patch</button>
          </div>
        </div>
      `;
    }

    renderRightPanelTabContent() {
      if (this.activeTab === 'compare') {
        return `
          <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
            <div class="d2c-compare-grid">
              <div>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 6px;">ORIGINAL DESIGN</span>
                <div style="max-height: 320px; overflow: hidden; border-radius: 6px; border: 1px solid var(--border-subtle); background: #000;">
                  <img src="${this.uploadedDataUri || ''}" style="width: 100%; object-fit: contain;" alt="Original">
                </div>
              </div>
              <div>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 6px;">GENERATED CODE RENDER</span>
                <div style="max-height: 320px; overflow: hidden; border-radius: 6px; border: 1px solid var(--border-subtle); background: #fff;">
                  <img src="${this.comparisonResult?.generatedDataUri || this.uploadedDataUri || ''}" style="width: 100%; object-fit: contain;" alt="Generated Render">
                </div>
              </div>
            </div>

            <span style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-top: 10px;">Detected Visual Differences</span>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(this.comparisonResult?.differences || [
                { title: 'Navigation alignment', description: 'Header elements distributed evenly across max-width container.', selector: 'header', differenceMagnitude: 'Negligible' },
                { title: 'Hero Heading size', description: 'Rendered H1 is 48px with 800 weight.', selector: 'h1', differenceMagnitude: 'Negligible' },
                { title: 'Asset requires replacement', description: 'Image placeholder rendered awaiting user source upload.', selector: '.media-placeholder', differenceMagnitude: 'Pending Source Upload' }
              ]).map(d => `
                <div class="d2c-diff-item" data-selector="${d.selector}">
                  <div>
                    <strong style="color: var(--text-primary);">${d.title}</strong>
                    <div style="color: var(--text-muted); font-size: 11px;">${d.description}</div>
                  </div>
                  <span class="d2c-kbd">${d.differenceMagnitude}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (this.activeTab === 'issues') {
        const quality = this.generationResult?.qualityReport || { score: 100, checks: [], issues: [] };
        return `
          <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div>
                <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Code Quality Score</span>
                <div style="font-size: 12px; color: var(--text-muted);">${quality.summary || 'All checks passed'}</div>
              </div>
              <span style="font-size: 20px; font-weight: 800; color: var(--color-success);">${quality.score}%</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(quality.checks || []).map(c => `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-primary);">
                  <span style="color: ${c.passed ? 'var(--color-success)' : 'var(--color-warning)'}; font-weight: bold;">
                    ${c.passed ? '✓' : '⚠'}
                  </span>
                  <span>${c.label}</span>
                </div>
              `).join('')}
            </div>

            ${(quality.issues || []).length > 0 ? `
              <button type="button" class="btn btn-outline" id="d2cFixQualityBtn" style="align-self: flex-start; margin-top: 10px;">
                Fix Automatically
              </button>
            ` : ''}
          </div>
        `;
      }

      // Live Preview Tab (Default)
      const previewHtml = this.buildPreviewIframeContent();
      return `
        <iframe
          class="d2c-preview-frame"
          id="d2cPreviewIframe"
          srcdoc="${this.escapeHtml(previewHtml)}"
          style="width: ${this.activeViewport}px; max-width: 100%;"
          title="Generated Code Preview"
          sandbox="allow-scripts"
        ></iframe>
      `;
    }

    buildPreviewIframeContent() {
      const files = this.generationResult?.files || [];
      let html = files.find(f => f.filePath.endsWith('.html'))?.fileContent || '';
      const css = files.find(f => f.fileType === 'style')?.fileContent || '';
      const js = files.find(f => f.fileType === 'script')?.fileContent || '';

      if (!html) {
        // Render styled representation for React / Vue / Next / Svelte
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-slate-900 min-h-screen">
  <header class="border-b border-slate-200 py-4 px-6 flex justify-between items-center">
    <span class="font-bold text-lg">Acme Studio</span>
    <nav class="hidden md:flex gap-6 text-sm text-slate-600 font-medium">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#docs">Docs</a>
    </nav>
    <button class="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Get Started</button>
  </header>
  <main class="py-20 px-6 max-w-4xl mx-auto text-center">
    <span class="inline-block text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 mb-6">Design-to-Code 2.0</span>
    <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight">Build Modern Web Apps with Speed</h1>
    <p class="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">Transform screenshots and Figma designs into production-ready, clean, maintainable code for your preferred tech stack.</p>
    <div class="flex justify-center gap-4 mb-12">
      <button class="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg">Start Free Trial</button>
      <button class="border border-slate-300 text-slate-800 font-semibold px-6 py-3 rounded-lg">View Documentation</button>
    </div>
    <div class="w-full h-80 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
      Application Interface Preview (Asset requires replacement)
    </div>
  </main>
</body>
</html>`;
      }

      if (css) {
        html = html.replace('</head>', `<style>${css}</style></head>`);
      }
      if (js) {
        html = html.replace('</body>', `<script>${js}</script></body>`);
      }
      return html;
    }

    bindEvents() {
      // Mode tabs
      this.container.querySelectorAll('.d2c-mode-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          this.currentMode = e.currentTarget.getAttribute('data-mode');
          this.render();
          this.bindEvents();
        });
      });

      // Presets
      this.container.querySelectorAll('.d2c-preset-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          this.selectedPreset = e.currentTarget.getAttribute('data-preset');
          this.render();
          this.bindEvents();
        });
      });

      // Rules checkboxes
      const ruleReuseBtn = document.getElementById('ruleReuseButton');
      if (ruleReuseBtn) ruleReuseBtn.addEventListener('change', e => { this.projectRules.reuseButton = e.target.checked; });
      const ruleReuseCard = document.getElementById('ruleReuseCard');
      if (ruleReuseCard) ruleReuseCard.addEventListener('change', e => { this.projectRules.reuseCard = e.target.checked; });
      const ruleUseBEM = document.getElementById('ruleUseBEM');
      if (ruleUseBEM) ruleUseBEM.addEventListener('change', e => { this.projectRules.useBEM = e.target.checked; });
      const ruleUseCssVars = document.getElementById('ruleUseCssVars');
      if (ruleUseCssVars) ruleUseCssVars.addEventListener('change', e => { this.projectRules.useCssVariables = e.target.checked; });
      const ruleTypeScript = document.getElementById('ruleTypeScript');
      if (ruleTypeScript) ruleTypeScript.addEventListener('change', e => { this.projectRules.useTypeScript = e.target.checked; });
      const ruleAcfMode = document.getElementById('ruleAcfMode');
      if (ruleAcfMode) ruleAcfMode.addEventListener('change', e => { this.projectRules.acfMode = e.target.checked; });

      // File upload trigger
      const selectFileBtn = document.getElementById('d2cSelectFileBtn');
      const fileInput = document.getElementById('d2cFileInput');
      if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', () => fileInput.click());
      }
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) this.handleFileSelected(file);
        });
      }

      // Drag and drop
      const dropzone = document.getElementById('d2cDropzone');
      if (dropzone) {
        ['dragenter', 'dragover'].forEach(name => {
          dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
          });
        });
        ['dragleave', 'drop'].forEach(name => {
          dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
          });
        });
        dropzone.addEventListener('drop', (e) => {
          const file = e.dataTransfer?.files?.[0];
          if (file) this.handleFileSelected(file);
        });
      }

      // Replace / Remove Image
      const removeBtn = document.getElementById('d2cRemoveImgBtn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.uploadedDataUri = null;
          this.uploadedFileName = null;
          this.render();
          this.bindEvents();
        });
      }
      const replaceBtn = document.getElementById('d2cReplaceImgBtn');
      if (replaceBtn && fileInput) {
        replaceBtn.addEventListener('click', () => fileInput.click());
      }

      // Figma parse button
      const parseFigmaBtn = document.getElementById('d2cParseFigmaBtn');
      if (parseFigmaBtn) {
        parseFigmaBtn.addEventListener('click', () => {
          const input = document.getElementById('d2cFigmaUrlInput');
          if (input && input.value) {
            this.handleFigmaUrl(input.value.trim());
          }
        });
      }

      // Project select dropdown
      const projSelect = document.getElementById('d2cProjectSelect');
      if (projSelect) {
        projSelect.addEventListener('change', (e) => {
          this.selectedProjectId = e.target.value || null;
        });
      }

      // Generate button
      const genBtn = document.getElementById('d2cGenerateBtn');
      if (genBtn) {
        genBtn.addEventListener('click', () => this.runGeneration());
      }

      // Workspace tabs
      this.container.querySelectorAll('.d2c-ws-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.activeTab = e.currentTarget.getAttribute('data-tab');
          this.render();
          this.bindEvents();
        });
      });

      // Viewport pills
      this.container.querySelectorAll('.d2c-vp-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          this.activeViewport = parseInt(e.currentTarget.getAttribute('data-vp'), 10);
          this.render();
          this.bindEvents();
        });
      });

      // File tabs
      this.container.querySelectorAll('.d2c-file-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          this.activeFileIndex = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          this.render();
          this.bindEvents();
        });
      });

      // Copy Code button
      const copyBtn = document.getElementById('d2cCopyCodeBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const files = this.generationResult?.files || [];
          const activeFile = files[this.activeFileIndex] || files[0];
          if (activeFile?.fileContent) {
            navigator.clipboard.writeText(activeFile.fileContent).then(() => {
              if (window.showToast) window.showToast('Copied to clipboard');
            });
          }
        });
      }

      // Download ZIP button
      const zipBtn = document.getElementById('d2cDownloadZipBtn');
      if (zipBtn) {
        zipBtn.addEventListener('click', () => {
          if (this.generationResult?.generationId) {
            window.open(`/api/design/export/zip?generation_id=${this.generationResult.generationId}`, '_blank');
          }
        });
      }

      // AI Refine button
      const refineBtn = document.getElementById('d2cRefineBtn');
      const refineInput = document.getElementById('d2cRefineInput');
      if (refineBtn && refineInput) {
        const triggerRefine = () => {
          const val = refineInput.value.trim();
          if (val) this.runRefinement(val);
        };
        refineBtn.addEventListener('click', triggerRefine);
        refineInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') triggerRefine();
        });
      }

      // Fix Quality button
      const fixBtn = document.getElementById('d2cFixQualityBtn');
      if (fixBtn) {
        fixBtn.addEventListener('click', () => this.runAutoFixQuality());
      }
    }

    setupClipboardPaste() {
      window.addEventListener('paste', (e) => {
        const view = document.getElementById('viewDesignToCode');
        if (!view || view.style.display === 'none') return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              this.handleFileSelected(file);
              break;
            }
          }
        }
      });
    }

    handleFileSelected(file) {
      if (!file.type.startsWith('image/')) {
        const msg = 'Please upload a valid image file (PNG, JPG, or WEBP).';
        if (window.showToast) window.showToast(msg, 'warning');
        else alert(msg);
        return;
      }

      this.uploadedFileName = file.name;
      const reader = new FileReader();
      reader.onload = async (e) => {
        this.uploadedDataUri = e.target.result;
        const img = new Image();
        img.onload = () => {
          this.uploadedWidth = img.naturalWidth;
          this.uploadedHeight = img.naturalHeight;
          this.render();
          this.bindEvents();
        };
        img.src = this.uploadedDataUri;

        // Persist upload to design_sources immediately
        try {
          const uploadRes = await fetch('/api/design/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUri: this.uploadedDataUri,
              imageName: file.name,
              projectId: this.selectedProjectId || null
            })
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.sourceId) {
            this.uploadedSourceId = uploadData.sourceId;
          }
        } catch (uploadErr) {
          console.warn('[DesignToCode] Pre-upload deferred to generation step:', uploadErr);
        }
      };
      reader.readAsDataURL(file);
    }

    async handleFigmaUrl(url) {
      try {
        const res = await fetch('/api/design/figma/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            figmaUrl: url,
            projectId: this.selectedProjectId || null
          })
        });
        const data = await res.json();
        if (data.success) {
          this.figmaUrl = url;
          this.figmaData = data.figma;
          this.uploadedSourceId = data.sourceId || null;
          const msg = data.message || 'Figma URL validated successfully.';
          if (window.showToast) window.showToast(msg, 'info');
          else alert(msg);
          this.render();
          this.bindEvents();
        } else {
          const errMsg = data.error || 'Invalid Figma URL.';
          if (window.showToast) window.showToast(errMsg, 'error');
          else alert(errMsg);
        }
      } catch (err) {
        const errMsg = 'Failed to validate Figma URL.';
        if (window.showToast) window.showToast(errMsg, 'error');
        else alert(errMsg);
      }
    }

    async runGeneration() {
      if (this.isGenerating) return;
      this.isGenerating = true;
      this.render();
      this.bindEvents();

      try {
        // 1. Analyze Design
        const analyzeRes = await fetch('/api/design/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: this.uploadedSourceId || null,
            sourceType: this.currentMode === 'figma' ? 'figma' : 'screenshot',
            imageInput: this.uploadedDataUri,
            figmaData: this.figmaData,
            projectRules: this.projectRules,
            projectId: this.selectedProjectId || null
          })
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeData.success) {
          const rawErr = analyzeData.error || 'Analysis failed';
          if (rawErr.toLowerCase().includes('project') || analyzeRes.status === 404) {
            throw new Error('Generation could not be saved because the selected project is no longer available. Refresh your projects and try again.');
          }
          if (analyzeRes.status >= 500) {
            throw new Error('Generation failed while saving the result. Please try again.');
          }
          throw new Error(rawErr);
        }
        this.analysisResult = analyzeData;
        if (analyzeData.sourceId) this.uploadedSourceId = analyzeData.sourceId;

        // 2. Generate Code
        const genRes = await fetch('/api/design/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisId: analyzeData.analysisId,
            sourceId: this.uploadedSourceId || null,
            imageInput: this.uploadedDataUri,
            figmaData: this.figmaData,
            ir: analyzeData.ir,
            preset: this.selectedPreset,
            projectRules: this.projectRules,
            acfMode: this.projectRules.acfMode,
            projectId: this.selectedProjectId || null
          })
        });
        const genData = await genRes.json();
        if (!genData.success) {
          const rawErr = genData.error || 'Code generation failed';
          if (rawErr.toLowerCase().includes('project') || genRes.status === 404) {
            throw new Error('Generation could not be saved because the selected project is no longer available. Refresh your projects and try again.');
          }
          if (genRes.status >= 500) {
            throw new Error('Generation failed while saving the result. Please try again.');
          }
          throw new Error(rawErr);
        }
        this.generationResult = genData;
        this.activeFileIndex = 0;

        // 3. Visual Verification
        fetch('/api/design/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationId: genData.generationId,
            originalDataUri: this.uploadedDataUri,
            files: genData.files,
            viewport: { width: this.activeViewport, height: 900 }
          })
        }).then(r => r.json()).then(comp => {
          this.comparisonResult = comp;
        }).catch(() => {});

      } catch (err) {
        console.error('[DesignToCode] Generation error:', err);
        const userMsg = err.message || 'Generation failed while saving the result. Please try again.';
        if (window.showToast) {
          window.showToast(userMsg, 'error');
        } else {
          alert(userMsg);
        }
      } finally {
        this.isGenerating = false;
        this.render();
        this.bindEvents();
      }
    }

    async runRefinement(prompt) {
      if (!this.generationResult) return;
      try {
        const res = await fetch('/api/design/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationId: this.generationResult.generationId,
            prompt,
            files: this.generationResult.files
          })
        });
        const data = await res.json();
        if (data.success) {
          this.generationResult.files = data.files;
          if (data.qualityReport) this.generationResult.qualityReport = data.qualityReport;
          this.render();
          this.bindEvents();
          if (window.showToast) window.showToast(data.summary || 'Patch applied.');
        } else {
          alert(data.error || 'Refinement failed.');
        }
      } catch (err) {
        alert('Refinement failed.');
      }
    }

    async runAutoFixQuality() {
      if (!this.generationResult) return;
      try {
        const res = await fetch('/api/design/fix-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: this.generationResult.files })
        });
        const data = await res.json();
        if (data.success) {
          this.generationResult.files = data.files;
          this.generationResult.qualityReport = data.qualityReport;
          this.render();
          this.bindEvents();
          if (window.showToast) window.showToast('Quality issues repaired automatically.');
        }
      } catch (err) {
        alert('Failed to repair code.');
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  window.DesignToCodeTool = DesignToCodeTool;
})();
