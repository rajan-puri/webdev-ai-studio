# Design → Code Studio Architecture & Developer Guide

> **"Turn screenshots and Figma designs into responsive, production-ready code for your stack."**

The **Design → Code** module in WebDev AI Studio transforms visual designs (PNG, JPEG, WEBP screenshots, or official Figma document node trees) into clean, maintainable, production-ready code across 6 frontend frameworks and 5 styling systems.

Unlike SaaS converters that output absolute-positioned `<div>` soup or generate proprietary component runtimes, WebDev AI Studio is built for professional developers:
- **Zero Vendor Lock-In**: Outputs standard framework code, idiomatic project folder structures, and zero runtime dependencies.
- **Developer-Defined Stack Presets**: 9 ready-to-run presets including HTML+SCSS, React+Tailwind, Next.js+Tailwind, Vue+SCSS, Svelte+CSS, and WordPress+SCSS with ACF JSON fields.
- **Design Intermediate Representation (DIR)**: Framework-agnostic JSON intermediate schema separating visual layout analysis from code synthesis.
- **Semantic & A11y Quality Engine**: Enforces semantic tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), ARIA compliance (`aria-label`, alt attributes), responsive CSS rules, and one-click automatic fixes.
- **Visual Verification & Diffing**: Playwright Chromium sandboxed DOM preview extraction, bounding-box layout verification, and shift detection.
- **Surgical AI Refinement**: Intelligent patch engine that updates specific component files without triggering full destructive code regenerations.
- **Zero Fake Data**: Honest status indicators; unauthenticated Figma requests return clear connection instructions without hallucinating mock tokens.

---

## 🏗️ Architectural Overview

```
Visual Inputs (Screenshot / Figma URL)
                  │
                  ▼
       ┌─────────────────────┐
       │   Analyzer Engine   │
       │ (analyzer.js /      │
       │  figma-parser.js)   │
       └──────────┬──────────┘
                  │ Validates
                  ▼
       ┌─────────────────────┐
       │   DIR Schema (IR)   │
       │    (ir-schema.js)   │
       └──────────┬──────────┘
                  │ Transpiles
                  ▼
       ┌─────────────────────┐
       │  Generator Engine   │◄─── Existing Project Rules
       │ (generator-engine)  │     (existing-project-mapper)
       └──────────┬──────────┘
                  │ Produces
                  ▼
   ┌──────────────┼──────────────┐
   │              │              │
   ▼              ▼              ▼
Generated      Semantic       Visual Verifier
Files          Quality        (Playwright
(Multi-File)   Inspection     Chromium Sandbox)
   │              │              │
   └──────────────┴──────────────┘
                  │
                  ▼
         Pure Node.js PKZIP
         Export / Refinement
```

---

## 📐 Design Intermediate Representation (DIR)

All inputs normalize into the canonical **DIR schema** (`server/services/design-to-code/ir-schema.js`). The DIR ensures the code generators remain completely decoupled from the image analysis or Figma API models.

### Schema Fields
- `version`: DIR schema version (e.g. `"1.0.0"`).
- `name`: Design or component name.
- `viewport`: `{ width: number, height: number, type: 'desktop' | 'tablet' | 'mobile' }`.
- `canvas`: Background and dimensions `{ width, height, background }`.
- `tokens`:
  - `colors`: Array of `{ name, value, usage }` (e.g., `#2563EB`, primary brand).
  - `typography`: Font family, font sizes, line heights, font weights.
  - `spacing`: Canonical spacing scale (px/rem).
  - `radii`: Border radii tokens.
  - `shadows`: Box shadow tokens.
- `sections`: Array of semantic sections:
  - `id`: Section identifier.
  - `type`: Semantic category (`hero`, `navbar`, `features`, `testimonials`, `footer`, `cta`, `content`).
  - `name`: Human-readable label.
  - `layout`: Layout mode (`flex` or `grid`), direction, alignment, gap, padding.
  - `elements`: Array of element nodes with semantic roles (`button`, `heading`, `text`, `image`, `card`, `input`).
- `metadata`: Source type (`screenshot` or `figma`), extracted date, image dimensions, hash.

---

## ⚡ Framework & Styling Presets

The studio provides 9 enterprise presets plus custom framework/styling combinations:

| Preset ID | Framework | Styling System | Key Outputs |
|---|---|---|---|
| `html-scss` | HTML5 | SCSS | `index.html`, `styles/main.scss`, `styles/_variables.scss`, `script.js` |
| `react-scss` | React 18 | SCSS | `App.tsx`, `components/Navbar.tsx`, `components/Hero.tsx`, `components/Button.tsx`, `styles/Hero.module.scss` |
| `react-tailwind` | React 18 | Tailwind CSS | `App.tsx`, `components/Hero.tsx`, `components/Button.tsx`, `tailwind.config.js` |
| `nextjs-tailwind` | Next.js (App Router) | Tailwind CSS | `app/layout.tsx`, `app/page.tsx`, `components/Hero.tsx`, `tailwind.config.js` |
| `vue-scss` | Vue 3 (SFC) | SCSS | `App.vue`, `components/Hero.vue`, `components/Navbar.vue`, `components/Button.vue` (with `<script setup>` and `<style scoped>`) |
| `svelte-css` | Svelte | Standard CSS | `App.svelte`, `components/Hero.svelte`, `components/Button.svelte` (scoped `<style>`) |
| `html-uikit` | HTML5 | UIkit | `index.html` with UIkit classes (`uk-navbar-container`, `uk-button-primary`, `uk-grid`) |
| `html-bootstrap` | HTML5 | Bootstrap 5 | `index.html` with Bootstrap grid (`container`, `row`, `col-md-*`, `btn-primary`) |
| `wordpress-scss` | WordPress / PHP | SCSS + ACF | `template-hero.php`, `hero.scss`, `group_webdev_hero_section.json` (ACF JSON field group definition) |

---

## 🛡️ Semantic & Accessibility Quality Engine

The **Quality Engine** (`server/services/design-to-code/quality-engine.js`) audits generated code before it reaches the developer:

1. **Semantic Structure Score**:
   - Requires top-level landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`.
   - Prohibits excessive `<div>` nesting and warns when unsemantic container counts exceed standards.
   - Requires semantic text elements (`<h1>` through `<h6>`, `<p>`).
2. **Accessibility Score**:
   - Audits for missing `alt` attributes on `<img>` elements.
   - Enforces accessible names on icon buttons and inputs (`aria-label` or button text).
   - Verifies landmark IDs for keyboard skip-links (`#main-content`).
3. **Responsiveness Score**:
   - Inspects CSS for media queries (`@media`, `@include respond-to`).
   - Flags rigid fixed pixel dimensions and absolute positioning (`position: absolute; left: ...`).
   - Rewards CSS Grid and Flexbox responsive layouts.
4. **Automatic Remediation (`fixCodeQuality`)**:
   - Automatically populates missing image `alt` attributes with contextual labels.
   - Replaces fragile absolute positioning with flexbox alignments.
   - Inserts ARIA labels where required.

---

## 👁️ Visual Verifier & Layout Comparison

The **Visual Verifier** (`server/services/design-to-code/visual-verifier.js`) leverages headless Playwright Chromium to validate generated code against the source design:
- Loads the generated preview inside an isolated sandboxed iframe.
- Queries DOM bounding client rectangles for all major landmarks and components.
- Compares rendered element positions, dimensions, and aspect ratios against DIR coordinates.
- Computes layout shift percentages and flags layout deviations.
- Outputs layout accuracy metrics without fabricating unrealistic 100% scores.

---

## 🗄️ SQLite Database Schema

The Design → Code subsystem persists all runs, sources, analyses, generations, files, revisions, and comparisons in `server/data/studio.db`:

1. `design_projects`: Workspace projects tracking name, description, framework, styling, and existing project settings.
2. `design_sources`: Captured or uploaded visual source assets (screenshot binary metadata, dimensions, or Figma URLs/file keys).
3. `design_analyses`: Stored DIR intermediate representations, detected sections, extracted tokens, and bounding boxes.
4. `design_generations`: Completed code generation runs containing framework, styling, preset, generation time, and bundle summary.
5. `design_files`: Individual generated files (`path`, `content`, `file_type`, `size_bytes`) belonging to a generation.
6. `design_revisions`: AI refinement audit log tracking user prompts, applied surgical diffs, and updated files.
7. `design_visual_comparisons`: Layout verification scores, matched elements count, detected shifts, and Playwright execution metadata.

---

## 🔌 REST API Reference

All endpoints require authentication and are mounted under `/api/design/*`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/design/upload` | Upload screenshot image (PNG, JPG, JPEG, WEBP). Analyzes binary dimensions and returns source record. |
| `POST` | `/api/design/figma/parse` | Parse Figma URL (fileKey, nodeId) and fetch official node tree if `FIGMA_ACCESS_TOKEN` is configured. |
| `POST` | `/api/design/analyze` | Execute DIR layout analysis on an uploaded source or Figma node tree. |
| `POST` | `/api/design/generate` | Generate multi-file code bundle for specified framework and styling preset. |
| `POST` | `/api/design/refine` | Apply prompt-based surgical refinement to modify specific files in a generation. |
| `POST` | `/api/design/verify` | Execute Playwright visual layout comparison and element bounding-box shift audit. |
| `POST` | `/api/design/fix-quality` | Run automatic quality fixes (add missing alt tags, convert absolute positioning). |
| `GET` | `/api/design/export/zip?generationId=...` | Stream standard PKZIP archive with traversal protection. |
| `GET` | `/api/design/history` | List recent design-to-code generations for authenticated user. |
| `GET` | `/api/design/generations/:id` | Fetch complete generation detail, file tree, preview HTML, and quality score. |

---

## 📦 Zero-Dependency PKZIP Exporter

The ZIP export engine (`server/services/design-to-code/zip-exporter.js`) is implemented in pure standard Node.js (`Buffer`, `crc32`, and stream piping) without native C++ compilation or third-party npm dependencies:
- Formats standard PKZIP local file headers (`0x04034b50`), central directory records (`0x02014b50`), and end of central directory records (`0x06054b50`).
- Strict directory traversal sanitization (`../` strip and leading slash removal) prevents ZIP-slip attacks.
- Streams `.zip` files directly to the browser for instant IDE unpacking.
