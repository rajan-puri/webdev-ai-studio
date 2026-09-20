# Changelog

All notable changes to the **WebDev AI Studio** application are documented in this file.

---

## [Design → Code Studio Upgrade] - 2026-09-18
### Added
- **Design → Code Studio**: Upgraded legacy "Figma → HTML" into a full-featured developer cockpit.
  - Multi-source ingestion: PNG, JPG, JPEG, WEBP drag-and-drop/clipboard paste with native binary dimension extraction; official Figma design URL parser with nodeId decoding and live REST API client.
  - 9 Production Framework & Styling Presets: HTML+SCSS, React+SCSS, React+Tailwind, Next.js+Tailwind, Vue+SCSS, Svelte+CSS, HTML+UIkit, HTML+Bootstrap, WordPress+SCSS with ACF JSON schema.
  - Design Intermediate Representation (DIR) formal schema (`server/services/design-to-code/ir-schema.js`).
  - Semantic Quality Engine (`server/services/design-to-code/quality-engine.js`): landmark requirements, heading hierarchy, `<button>` accessibility checks, and one-click automatic fixes.
  - Playwright Chromium Visual Verifier (`server/services/design-to-code/visual-verifier.js`): sandboxed iframe preview, DOM bounding client rect comparisons, layout accuracy scoring, and layout shift tracking.
  - Surgical AI Refinement Engine: localized patch applicator for component-specific modifications without full bundle re-synthesis.
  - Pure Node.js PKZIP Exporter: in-memory streaming ZIP packager with directory traversal defense.
  - 7 New SQLite Tables: `design_projects`, `design_sources`, `design_analyses`, `design_generations`, `design_files`, `design_revisions`, `design_visual_comparisons`.
  - Comprehensive Test Suite (`scripts/tests/design-to-code-tests.js`): 24 / 24 automated tests passed (100%).
  - Dedicated Documentation: `docs/DESIGN_TO_CODE.md`.

---

## [Phase 4] - 2026-09-18
### Added
- **SEMrush-Style SEO Intelligence Platform**:
  - Restructured SEO navigation into 8 core categories:
    1. **SEO Dashboard**: Unified domain intelligence aggregating crawler health, Ahrefs DR, GSC organic clicks/impressions, and PageSpeed.
    2. **Site Audit**: First-party recursive BFS crawler with Playwright headless DOM execution, 32 deterministic issue checks, and AI crawler matrix.
    3. **Competitive Research**: Side-by-side domain comparisons assessing Domain Rating, mobile/desktop performance, and health gap.
    4. **Organic & Keywords**: Real query rankings, impressions, clicks, CTR, and average position from Google Search Console and Bing Webmaster.
    5. **PageSpeed & CrUX**: Google PageSpeed Insights integration with strict separation of Lighthouse synthetic lab scores and Chrome User Experience Report (CrUX) real-user field data.
    6. **Link Intelligence**: Authentic Ahrefs Domain Rating via Free Public API with strict attribution notice: *"Domain Rating by Ahrefs"*.
    7. **Log File Analyzer**: Real Apache/Nginx access log parser detecting Googlebot, Bingbot, AI search crawlers (GPTBot, ClaudeBot, PerplexityBot), status codes, and crawl budget waste (4xx/5xx errors hit by bots).
    8. **Export Center**: Client deliverables in Vector PDF, Technical Issues CSV, and structured JSON.
- **Provider Infrastructure & Decoupling**:
  - Provider registry (`server/services/seo/seoDataSources.js`) defining capabilities, cost models, and attribution.
  - Metric normalizer (`server/services/seo/seo-normalizer.js`) enforcing `{ value, source, sourceLabel, fetchedAt, status, available, methodology, limitations }`.
  - Two-tier cache (`server/services/seo/seo-cache.js`) with in-memory TTL and SQLite persistent table `seo_provider_cache`.
  - Google Search Console OAuth 2.0 adapter with automatic token refresh.
  - Bing Webmaster Tools REST client.
  - Ahrefs Free Public API client for Domain Rating.
  - Google PageSpeed Insights v5 client.
  - Scaffolded future enterprise provider interfaces for Semrush, DataForSEO, and Moz.
- **Settings UI Enhancement**:
  - Dedicated **SEO Intelligence & Data Providers** card in workspace Settings.
  - Interactive connection, test, and sync buttons for GSC, Bing, Ahrefs, and PageSpeed.
- **Automated Test Suite**:
  - `scripts/test-seo-intelligence.js`: 35 automated integration tests covering providers, registry, overview, competitor comparisons, log analyzer, and persistence.
- **Comprehensive Documentation**:
  - `docs/ARCHITECTURE.md`
  - `docs/SEO_DATA_SOURCES.md`
  - `docs/API_INTEGRATIONS.md`
  - `docs/FEATURE_MATRIX.md`
  - `docs/CHANGELOG.md`

### Enhanced
- Strict enforcement of **Zero Fake Data**: missing metrics explicitly report unavailable status or unconfigured state instead of synthetic zeros or mock charts.
- Server access log analysis stored in SQLite table `seo_log_analyses`.
- Multi-user isolation maintained across all provider credentials and reports.
