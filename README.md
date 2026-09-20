# WebDev AI Studio

> **An enterprise-grade, local-first developer cockpit combining multi-device responsive testing, deep automated QA inspection, visual regression diffing, API debugging, and SEMrush-caliber SEO intelligence into a single self-contained application.**

Built entirely with raw Node.js, embedded SQLite (`better-sqlite3`), Playwright Chromium/Firefox/WebKit, and modern web standards with **zero external telemetry and zero fake data**.

---

## 📑 Table of Contents

- [Overview & Philosophy](#-overview--philosophy)
- [The Zero Fake Data Standard](#-the-zero-fake-data-standard)
- [Key Modules & In-Depth Capabilities](#-key-modules--in-depth-capabilities)
  - [1. SEMrush-Caliber SEO Intelligence Platform](#1-semrush-caliber-seo-intelligence-platform)
    - [Unified Executive Dashboard](#unified-executive-dashboard)
    - [Playwright BFS Recursive Crawler Engine](#playwright-bfs-recursive-crawler-engine)
    - [32 Deterministic Technical SEO Issue Rules](#32-deterministic-technical-seo-issue-rules)
    - [AI Search Bot Blocker Matrix](#ai-search-bot-blocker-matrix)
    - [XML Sitemap & Orphan Page Discovery](#xml-sitemap--orphan-page-discovery)
    - [Competitive Research & Domain Gap Analysis](#competitive-research--domain-gap-analysis)
    - [Google Search Console Integration (OAuth 2.0)](#google-search-console-integration-oauth-20)
    - [Bing Webmaster Tools Integration](#bing-webmaster-tools-integration)
    - [Google PageSpeed Insights & Real-User CrUX](#google-pagespeed-insights--real-user-crux)
    - [Link Intelligence & Ahrefs Domain Rating](#link-intelligence--ahrefs-domain-rating)
    - [Server Access Log Analyzer & Crawl Budget Waste](#server-access-log-analyzer--crawl-budget-waste)
    - [Executive Export Center (PDF, CSV, JSON)](#executive-export-center-pdf-csv-json)
  - [2. Multi-Device Responsive Tester & Browser Matrix](#2-multi-device-responsive-tester--browser-matrix)
    - [Hardware-Accurate Device Registry & Frames](#hardware-accurate-device-registry--frames)
    - [Automated Breakpoint Runner](#automated-breakpoint-runner)
    - [Horizontal Overflow Analyzer](#horizontal-overflow-analyzer)
    - [Cross-Browser Matrix (Chromium, Firefox, WebKit, Edge)](#cross-browser-matrix-chromium-firefox-webkit-edge)
    - [Network Throttling Profiles](#network-throttling-profiles)
    - [Screenshot & Visual Capture Repository](#screenshot--visual-capture-repository)
  - [3. Deep Automated QA & Accessibility Suite](#3-deep-automated-qa--accessibility-suite)
    - [The 14 Specialized Inspection Engines](#the-14-specialized-inspection-engines)
    - [Phase 2 Interactive QA Runner](#phase-2-interactive-qa-runner)
    - [axe-core Accessibility Compliance](#axe-core-accessibility-compliance)
    - [Console & Network Failure Interceptor](#console--network-failure-interceptor)
  - [4. Design → Code Studio (Screenshots & Figma to Production Code)](#4-design--code-studio)
    - [Multi-Source Ingestion (Screenshots & Figma)](#multi-source-ingestion-screenshots--figma)
    - [9 Enterprise Framework & Styling Presets](#9-enterprise-framework--styling-presets)
    - [Design Intermediate Representation (DIR)](#design-intermediate-representation-dir)
    - [Semantic & Accessibility Quality Engine](#semantic--accessibility-quality-engine)
    - [Playwright Chromium Visual Verifier](#playwright-chromium-visual-verifier)
    - [Surgical AI Refinement Engine](#surgical-ai-refinement-engine)
    - [Pure Node.js PKZIP Exporter](#pure-nodejs-pkzip-exporter)
  - [5. Visual Regression Testing & Baseline Studio](#5-visual-regression-testing--baseline-studio)
  - [6. API Tester & REST Client](#6-api-tester--rest-client)
  - [7. Projects, Workspaces, History & Dashboard](#7-projects-workspaces-history--dashboard)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Complete SQLite Database Schema (All 25 Tables)](#-complete-sqlite-database-schema-all-25-tables)
  - [Core Studio Tables](#core-studio-tables)
  - [SEO Intelligence Tables](#seo-intelligence-tables)
  - [Design → Code Studio Tables](#design--code-studio-tables)
  - [Indexes & Performance Optimizations](#indexes--performance-optimizations)
- [Complete REST API Reference](#-complete-rest-api-reference)
  - [1. Authentication API (`/api/auth/*`)](#1-authentication-api-apiauth)
  - [2. Projects & Workspaces API (`/api/projects/*`)](#2-projects--workspaces-api-apiprojects)
  - [3. Test History API (`/api/history/*`)](#3-test-history-api-apihistory)
  - [4. Saved Reports API (`/api/reports/*`)](#4-saved-reports-api-apireports)
  - [5. Screenshots API (`/api/screenshots/*`)](#5-screenshots-api-apiscreenshots)
  - [6. Visual Baselines API (`/api/baselines/*`)](#6-visual-baselines-api-apibaselines)
  - [7. Executive Dashboard API (`/api/dashboard/*`)](#7-executive-dashboard-api-apidashboard)
  - [8. Website QA Scanner API (`/api/qa/*`)](#8-website-qa-scanner-api-apiqa)
  - [9. Responsive Tester API (`/api/responsive/*`)](#9-responsive-tester-api-apiresponsive)
  - [10. API Tester Proxy (`/api/tester/*`)](#10-api-tester-proxy-apitester)
  - [11. SEO Crawler Audits API (`/api/seo/audits/*`)](#11-seo-crawler-audits-api-apiseoaudits)
  - [12. SEO Intelligence & External Providers API (`/api/seo/*`)](#12-seo-intelligence--external-providers-api-apiseo)
  - [13. Design → Code Studio API (`/api/design/*`)](#13-design--code-studio-api-apidesign)
- [External Data Provider Setup & Verification](#-external-data-provider-setup--verification)
  - [Google PageSpeed Insights & CrUX](#google-pagespeed-insights--crux-setup)
  - [Google Search Console (OAuth 2.0)](#google-search-console-oauth-20-setup)
  - [Bing Webmaster Tools](#bing-webmaster-tools-setup)
  - [Ahrefs Free Public API](#ahrefs-free-public-api-setup)
- [Installation & Getting Started](#-installation--getting-started)
- [Configuration & Environment Variables (`.env`)](#-configuration--environment-variables-env)
- [Verification & Automated Test Harness](#-verification--automated-test-harness)
  - [The 5 Independent Test Suites](#the-5-independent-test-suites)
  - [Running the Test Suites](#running-the-test-suites)
- [Accurate Project Directory Tree](#-accurate-project-directory-tree)
- [Security, Privacy & Data Governance](#-security-privacy--data-governance)
- [Troubleshooting & Frequently Asked Questions](#-troubleshooting--frequently-asked-questions)

---

## 💡 Overview & Philosophy

**WebDev AI Studio** is built to solve a pervasive modern software problem: developers and agencies currently juggle five to ten disconnected, costly, and privacy-invasive SaaS subscriptions (SEMrush, Ahrefs, BrowserStack, LambdaTest, Postman, Screaming Frog, Pingdom) just to build, test, and audit websites.

WebDev AI Studio consolidates these essential capabilities into a single, high-performance local developer workbench governed by four principles:

1. **Zero Framework Bloat**: The backend is powered by a pure Node.js native HTTP server (`http.createServer`) without Express, Fastify, or nesting middleware chains. Routes dispatch in sub-millisecond time with minimal RAM consumption.
2. **Local-First SQLite Engine**: All audit datasets, crawled DOM nodes, visual diff baselines, captured screenshots, and session cookies are persisted locally in `server/data/studio.db` using `better-sqlite3` in Write-Ahead Logging (`WAL`) mode.
3. **Authentic Browser Execution**: Headless Playwright Chromium, Firefox, WebKit, and Edge engines execute JavaScript, render SPAs (Next.js, React, Vue, Angular), capture pixel-accurate screenshots, evaluate axe-core accessibility, and stream vector PDF audits.
4. **Absolute Data Honesty**: Zero fake metrics, zero placeholder sparklines, and zero synthetic fallbacks.

---

## 🛡️ The Zero Fake Data Standard

A strict architectural invariant enforced across both backend normalization layers and frontend UI views:

- **No Synthetic Numbers**: When an external service (Google Search Console, Bing, PageSpeed Insights, or Ahrefs) is disconnected, unauthenticated, rate-limited (HTTP 429), or has insufficient traffic (CrUX field data), the system states `"Not Connected"`, `"PageSpeed API quota exceeded"`, or `"Field data unavailable"`. It **never** manufactures random scores or placeholder trendlines.
- **Unified Metric Schema**: Every data point returned by the backend satisfies the uniform contract:
  ```json
  {
    "value": 85,
    "source": "pagespeed",
    "sourceLabel": "Google PageSpeed Insights",
    "fetchedAt": "2026-09-18T15:29:11.467Z",
    "status": "fresh",
    "available": true,
    "methodology": "Lighthouse v12 mobile lab performance score",
    "limitations": null,
    "unit": "/100"
  }
  ```
- **Attribution Governance**: Third-party intellectual property and trademarks are strictly attributed (e.g., the mandatory *"Domain Rating by Ahrefs"* badge).
- **Separation of Concerns**: Synthetic lab simulations (Lighthouse) are never merged with or substituted for real-user field data (CrUX Core Web Vitals).

---

## 🌟 Key Modules & In-Depth Capabilities

### 1. SEMrush-Caliber SEO Intelligence Platform

The SEO Intelligence platform delivers 8 enterprise tabs modeled after SEMrush and Ahrefs:

```
[ SEO Intelligence Suite ]
  ├── 1. Overview & Health Dashboard
  ├── 2. Site Audit & BFS Crawler (32 Deterministic Rules)
  ├── 3. Competitive Research & Domain Gap Analysis
  ├── 4. Search Keywords (Google Search Console + Bing Webmaster)
  ├── 5. PageSpeed & CrUX Real-User Core Web Vitals
  ├── 6. Link Intelligence & Ahrefs Domain Rating
  ├── 7. Server Access Log Analyzer (Apache / Nginx)
  └── 8. Executive Export Center (Vector PDF, CSV, JSON)
```

#### Unified Executive Dashboard
- **Aggregate Health Score (0-100)**: Deterministically calculated from real crawl issue penalties.
- **Ahrefs Domain Rating (DR)**: Live logarithmic authority score directly from the official Ahrefs Free Public API.
- **Organic Search Visibility**: First-party clicks, impressions, CTR, and average position from Google Search Console and Bing.
- **Core Web Vitals Preview**: Real-user mobile performance state.
- **Google Indexation State**: Verification of indexable vs. blocked URLs.

#### Playwright BFS Recursive Crawler Engine
- Located at `server/services/seo/crawler.js` and `server/services/seo/providers/own-crawler/index.js`.
- **Breadth-First Search (BFS)** traversal discovering internal hyperlinks across pages up to configurable depths and limits (up to 1,500 pages per domain).
- **Headless Chromium Execution**: Renders client-side JavaScript, hydration scripts, and SPAs to capture post-render DOM structures.
- **URL Normalization**: Strips URL fragments (`#hash`), sorts query parameters, normalizes trailing slashes, and resolves relative URLs against base URIs.
- **Redirect Chain Logging**: Traces multi-hop redirects (e.g. `http://` -> `https://` -> `https://www.` -> `/canonical/`) and flags dissipated link equity.
- **Link Graph Accounting**: Tallies inlink count and outlink count per URL to compute internal PageRank distribution and surface orphan content.

#### 32 Deterministic Technical SEO Issue Rules
Located at `server/services/seo/issue-engine.js`. Every issue rule operates on authentic crawl signals, evaluating exact thresholds:

| Issue Code | Category | Severity | Condition / Trigger | Remediation Guidance |
| :--- | :--- | :--- | :--- | :--- |
| `ROBOTS_DISALLOW_ALL` | Crawlability | **ERROR** | `robots.txt` specifies `Disallow: /` under `User-agent: *` | Remove or refine wildcard disallows preventing site search indexation. |
| `AI_BOTS_DISALLOWED` | AI / GEO | **NOTICE** | `robots.txt` disallows GPTBot, ClaudeBot, PerplexityBot, etc. | Allow AI user-agents if visibility in AI answer engines is desired. |
| `ORPHAN_PAGE` | Crawlability | **WARNING** | Page is in sitemap but has 0 internal inlinks from crawled pages | Add contextual internal links from parent or sibling pages. |
| `CONNECTION_FAILED` | Technical SEO | **ERROR** | HTTP status 0, DNS failure, connection timeout, or SSL failure | Check server availability, DNS records, and firewall/WAF blocks. |
| `HTTP_STATUS_4XX` | Technical SEO | **ERROR** | HTTP status code between 400 and 499 (e.g. 404, 403, 410) | Fix or remove internal broken links, or configure 301 redirects. |
| `HTTP_STATUS_5XX` | Technical SEO | **ERROR** | HTTP status code between 500 and 599 (e.g. 500, 502, 503) | Review server error logs and backend exception handlers. |
| `REDIRECT_CHAIN` | Crawlability | **WARNING** | URL undergoes 2 or more redirect hops to reach destination | Update internal links to point directly to final destination. |
| `REDIRECT_302_TEMPORARY`| Crawlability | **NOTICE** | HTTP status is 302 or 307 temporary redirect | Use HTTP 301 permanent redirect to cleanly transfer link equity. |
| `TITLE_MISSING` | On-Page SEO | **ERROR** | `<title>` tag is missing or completely empty | Add unique, descriptive `<title>` tag (30-60 characters). |
| `TITLE_TOO_SHORT` | On-Page SEO | **NOTICE** | `<title>` length is under 30 characters | Expand title to 30-60 characters with descriptive keywords. |
| `TITLE_TOO_LONG` | On-Page SEO | **NOTICE** | `<title>` length exceeds 65 characters | Shorten title to under 60 characters to prevent SERP truncation. |
| `TITLE_DUPLICATE` | On-Page SEO | **WARNING** | Exact same `<title>` tag shared across 2 or more URLs | Provide unique title tags for every indexable URL. |
| `META_DESC_MISSING` | On-Page SEO | **WARNING** | `<meta name="description">` is absent | Add meta description (70-155 characters) for informative SERP snippets. |
| `META_DESC_TOO_SHORT` | On-Page SEO | **NOTICE** | Meta description is under 70 characters | Expand description to 120-155 characters. |
| `META_DESC_TOO_LONG` | On-Page SEO | **NOTICE** | Meta description exceeds 160 characters | Keep primary search snippet message within 155 characters. |
| `META_DESC_DUPLICATE` | On-Page SEO | **NOTICE** | Exact same meta description shared across multiple pages | Write custom meta descriptions tailored to each specific page. |
| `H1_MISSING` | On-Page SEO | **ERROR** | No `<h1>` heading element found in rendered DOM | Add a single, semantic `<h1>` representing the page topic. |
| `H1_MULTIPLE` | On-Page SEO | **NOTICE** | Page contains two or more `<h1>` heading elements | Use a single `<h1>` and subdivide content using `<h2>` and `<h3>`. |
| `H1_DUPLICATE` | On-Page SEO | **WARNING** | Same `<h1>` heading shared across distinct crawled URLs | Differentiate headings across unique page topics. |
| `CANONICAL_MISSING` | Indexability | **NOTICE** | No `<link rel="canonical">` declared | Add self-referencing canonical to avoid duplicate content ambiguity. |
| `CANONICAL_MULTIPLE` | Indexability | **ERROR** | Page contains two or more `<link rel="canonical">` tags | Ensure exactly one canonical tag exists per document. |
| `CANONICAL_MISMATCH` | Indexability | **WARNING** | Canonical points to a different URL than the crawled URL | Verify if page is intentionally canonicalized to another address. |
| `LOW_WORD_COUNT` | On-Page SEO | **WARNING** | Body contains fewer than 150 visible words | Enrich page with descriptive body copy, headings, and explanations. |
| `IMAGE_MISSING_ALT` | Images | **WARNING** | One or more `<img>` tags lack an `alt` attribute entirely | Add descriptive `alt` text to images (or `alt=""` for decorative). |
| `SCHEMA_JSON_LD_INVALID`| Structured Data | **ERROR** | JSON-LD script contains malformed JSON syntax | Repair JSON-LD markup syntax errors. |
| `SCHEMA_MISSING` | Structured Data | **NOTICE** | No JSON-LD or microdata structured data found | Implement Schema.org JSON-LD to unlock search rich snippets. |
| `INSECURE_HTTP` | Technical SEO | **ERROR** | Page served over plaintext HTTP instead of HTTPS | Install SSL/TLS certificate and enforce 301 HTTPS redirects. |
| `SECURITY_MISSING_HSTS` | Technical SEO | **NOTICE** | `Strict-Transport-Security` header missing on HTTPS | Add `Strict-Transport-Security` header to enforce HTTPS. |
| `MIXED_CONTENT` | Technical SEO | **ERROR** | HTTPS page loads images, scripts, or styles over HTTP | Update insecure resource URLs to HTTPS. |
| `VIEWPORT_MISSING` | Mobile | **ERROR** | No `<meta name="viewport">` tag declared | Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. |
| `HTML_LANG_MISSING` | International | **WARNING** | Root `<html>` element lacks a `lang` attribute | Add language declaration (e.g. `<html lang="en">`). |
| `OG_TAGS_MISSING` | Social | **NOTICE** | Lacks Open Graph metadata (`og:title`, `og:image`) | Add Open Graph tags for rich previews on social networks. |
| `DEEP_CRAWL_PAGE` | Crawlability | **NOTICE** | Page is 4 or more clicks away from the homepage root | Improve site architecture to keep key pages within 3 clicks of root. |
| `JS_RENDERING_REQUIRED`| Technical SEO | **WARNING** | Title, canonical, or content only appear after JS runs | Ensure SSR or static pre-rendering for bots that don't run JS. |
| `MOBILE_HORIZONTAL_OVERFLOW`| Mobile | **ERROR** | Rendered page content exceeds viewport width | Fix CSS widths, paddings, or media causing horizontal scroll. |

#### Deterministic Health Score Formula
The overall Health Score (0-100) is calculated without arbitrary weights:
- If the root homepage fails to connect or returns a 4xx/5xx error and no other pages can be crawled: **Score = 0**.
- Otherwise, penalties are accumulated per issue based on severity and the ratio of affected pages:
  - **Critical Error**: Penalty = `min(25, 12 + (affectedRatio * 15))`
  - **Warning**: Penalty = `min(10, 4 + (affectedRatio * 8))`
  - **Notice**: Penalty = `min(4, 1 + (affectedRatio * 3))`
- `HealthScore = clamp(0, 100, round(100 - sum(penalties)))`.
- Category sub-scores (`crawlability`, `onpage`, `technical`, `links`, `images`, `structured_data`, `mobile`, `ai_search`) are independently computed on a 0-100 scale.

#### AI Search Bot Blocker Matrix
- Located at `server/services/seo/robots-analyzer.js`.
- Downloads live `robots.txt` from target domain and tests path rules against 9 major AI web crawlers:
  1. **GPTBot** (OpenAI model training)
  2. **OAI-SearchBot** (ChatGPT Search prototype)
  3. **ClaudeBot** (Anthropic Claude crawler)
  4. **Claude-SearchBot** (Anthropic search integration)
  5. **PerplexityBot** (Perplexity AI indexer)
  6. **Google-Extended** (Google Gemini model training)
  7. **Cohere-AI** (Cohere language models)
  8. **Anthropic-AI** (Anthropic system crawlers)
  9. **ByteSpider** (ByteDance TikTok AI crawler)
- Distinguishes between wildcard fallback restrictions (`User-agent: *`) and explicit agent-specific permissions.

#### XML Sitemap & Orphan Page Discovery
- Located at `server/services/seo/sitemap-parser.js`.
- Automatically inspects `/sitemap.xml`, `/sitemap_index.xml`, and `robots.txt` sitemap directives.
- Parses nested sitemap indexes and extracts `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>`.
- Cross-references sitemap inventory with internal crawler link graphs to flag orphan pages (URLs present in sitemaps that have zero internal links pointing to them).

#### Competitive Research & Domain Gap Analysis
- Located at `server/services/seo/competitor-analyzer.js`.
- Performs side-by-side gap analysis between your target domain and competitor domains.
- Compares:
  - Domain Rating (Ahrefs logarithmic authority)
  - Mobile & Desktop PageSpeed scores
  - Site Crawl Health & Technical Issues
  - Query overlap (when connected to verified Google/Bing properties)
- Outputs automatic, objective verdicts (*"You Win"*, *"Competitor Win"*, *"Tie"*) for each metric.

#### Google Search Console Integration (OAuth 2.0)
- Located at `server/services/seo/providers/google-search-console/index.js`.
- Implements standard OAuth 2.0 Authorization Code Flow with offline access for automatic token refresh.
- Scope: `https://www.googleapis.com/auth/webmasters.readonly`.
- Synchronizes verified property list (`sites.list`) and lets the user pick their primary property via a dropdown selector (`#gscPropertySelect`).
- Live search query filter (`#gscQueryFilterInput`) for instant text matching.
- Multi-dimensional analytics: queries, pages, countries, and devices across 7d, 28d, 3m, 6m, 12m, and 16m windows.
- Automatically handles token expiration (refreshes 5 minutes prior to expiry).

#### Bing Webmaster Tools Integration
- Located at `server/services/seo/providers/bing-webmaster/index.js`.
- Queries official Bing Webmaster JSON APIs:
  - `GetRankAndTrafficStats`: Impressions, clicks, and average CTR.
  - `GetQueryStats`: Individual query rankings and impressions across Bing and Yahoo.
- Validates user API keys against `GetUserSites` before persisting.

#### Google PageSpeed Insights & Real-User CrUX
- Located at `server/services/seo/providers/pagespeed/index.js`.
- Connects to Google PageSpeed Insights v5 API (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`).
- Dual strategy support: **Mobile** (`strategy=mobile`) and **Desktop** (`strategy=desktop`).
- **All 4 Lighthouse Categories**: Extracts *Performance*, *Accessibility*, *Best Practices*, and *SEO* scores (0-100).
- **Core Web Vitals Field Data (CrUX)**: Extracts real-user 28-day percentiles (LCP, CLS, INP, FCP) from `loadingExperience.metrics`.
- **Strict Data Isolation**: If Google indicates insufficient field traffic, displays `"Field data unavailable"` while cleanly rendering Lighthouse lab data.
- **Provider Diagnostics Card**: Automatically intercepts HTTP 429 quota exhaustion and HTTP 403 invalid key errors. Renders a safe diagnostic card in the UI showing the provider status, explanation, and an interactive **`[Retry]`** button.

#### Link Intelligence & Ahrefs Domain Rating
- Located at `server/services/seo/providers/ahrefs/index.js`.
- Interfaces with the official Ahrefs Free Public API.
- Retrieves authentic Domain Rating (DR) on a logarithmic 0-100 scale.
- Enforces the mandatory *"Domain Rating by Ahrefs"* attribution label across all UI cards and reports.

#### Server Access Log Analyzer & Crawl Budget Waste
- Located at `server/services/seo/log-analyzer.js`.
- Drag-and-drop parser for Apache and Nginx server access logs (Common and Combined formats).
- Regex-based classification of verified bot user agents:
  - Googlebot (Desktop & Mobile Smartphone)
  - Bingbot
  - GPTBot, ClaudeBot, PerplexityBot, ByteSpider
  - Applebot, Baiduspider, YandexBot
- **Wasted Crawl Budget Diagnostics**: Identifies server resources wasted when search bots hit 4xx broken URLs, 5xx server errors, or non-canonical redirects.
- Computes bot visit frequency, bandwidth consumption, and response time distributions.

#### Executive Export Center (PDF, CSV, JSON)
- Located at `server/services/seo/exporter.js` and `server/services/seo/pdf-generator.js`.
- **Vector PDF Report**: High-resolution, multi-page vector PDF generated via Playwright Chromium. Includes executive summary, health scores, category gauges, critical issues, and full data attribution.
- **Issues CSV**: Spreadsheets of crawled URLs, status codes, titles, H1 tags, word counts, and issue flags.
- **Audit JSON**: Machine-readable JSON output suitable for CI/CD pipelines and automated quality gates.

---

### 2. Multi-Device Responsive Tester & Browser Matrix

Test any web application across authentic mobile, tablet, laptop, and desktop viewports:

#### Hardware-Accurate Device Registry & Frames
Located at `server/services/responsive/device-registry.js` and `client/js/components/devices/`:
- **Smartphones**: iPhone 15 Pro, iPhone 14, Google Pixel 7, Samsung Galaxy S23.
- **Tablets**: iPad Pro 11", iPad Air, Microsoft Surface Pro.
- **Laptops & Desktops**: MacBook Pro 14", MacBook Pro 16", Desktop 1080p, Desktop 1440p, 4K UHD.
- Realistic hardware frames with status bars, speaker notches, and home indicators.
- One-click orientation swap (portrait/landscape) with dimension flipping.
- Device Pixel Ratio (DPR) scaling (1x, 2x, 3x) and touch event emulation.

#### Automated Breakpoint Runner
- Located at `server/services/responsive/breakpoint-runner.js`.
- Sequentially checks web layouts against standard responsive breakpoints:
  - Mobile Small (375px)
  - Mobile Large (480px)
  - Tablet Portrait (768px)
  - Tablet Landscape / Small Laptop (1024px)
  - Desktop Standard (1440px)
  - Ultra-wide (1920px)
- Detects media query trigger states and layout shifts.

#### Horizontal Overflow Analyzer
- Located at `server/services/responsive/overflow-analyzer.js`.
- Inspects the DOM to pinpoint elements that exceed the viewport width (`scrollWidth > clientWidth`).
- Returns the exact CSS selector, bounding client rect, and overflow magnitude in pixels.

#### Cross-Browser Matrix (Chromium, Firefox, WebKit, Edge)
- Located at `server/services/responsive/matrix-runner.js`.
- Executes tests concurrently across multiple rendering engines:
  - **Chromium** (Blink engine - Chrome, Edge, Brave, Opera)
  - **Firefox** (Gecko engine)
  - **WebKit** (Safari engine)
  - **Edge** (Chromium Edge engine if installed locally)
- Captures console errors, network failures, and rendering discrepancies per browser engine.

#### Network Throttling Profiles
- Emulates authentic network connections using Chrome DevTools Protocol (CDP):
  - **Fast 3G**: 1.6 Mbps down, 750 kbps up, 40ms RTT latency.
  - **Slow 3G**: 500 kbps down, 500 kbps up, 400ms RTT latency.
  - **Offline**: Disconnected state to verify service worker and PWA offline fallbacks.
  - **Full Broadband**: Unconstrained local network speed.

#### Screenshot & Visual Capture Repository
- High-resolution viewport and full-page stitched screenshots.
- Stored directly in the SQLite database as base64 data URIs.
- Organized by project, test type, device, and timestamp.

---

### 3. Deep Automated QA & Accessibility Suite

Located at `server/services/qa/` and `client/js/tools/website-qa.js`.

#### The 14 Specialized Inspection Engines
1. **Accessibility (`services/qa/accessibility.js`)**: Runs axe-core against the live DOM, verifying WCAG 2.1 AA/AAA compliance, color contrast ratios, ARIA roles, form labels, and focus order.
2. **Safe Interaction Engine (`services/qa/phase2-runner.js`)**: Tests interactive elements (dropdowns, accordions, tabs, modals). Automatically skips destructive actions containing keywords: `delete`, `remove`, `cancel`, `buy`, `order`, `checkout`, `logout`.
3. **Form Testing (`services/qa/phase2-runner.js`)**: Inspects input validation, required attributes, label associations, and HTML5 constraints without submitting fake leads.
4. **Broken UI Detection (`services/qa/phase2-runner.js`)**: Finds clipped text elements, overflowing containers, and broken images (`naturalWidth === 0`).
5. **Redirect & Protocol Engine (`services/qa/technical.js`)**: Validates HTTPS upgrades, records multi-hop redirect chains, and checks TLS status.
6. **CSS Engine (`services/qa/css.js`)**: Scans for unused stylesheet rules, missing vendor prefixes, and layout recalculation triggers.
7. **Fonts Engine (`services/qa/fonts.js`)**: Checks for missing webfont assets, FOIT/FOUT risks, and `@font-face` performance.
8. **HTML Validation (`services/qa/html.js`)**: Audits DOM structure, doctype declarations, unclosed tags, and deprecated HTML elements.
9. **Image Optimization (`services/qa/images.js`)**: Flags oversized images, modern format adoption (WebP/AVIF), and layout shift hazards (missing `width`/`height`).
10. **JavaScript Diagnostics (`services/qa/javascript.js`)**: Intercepts unhandled exceptions, console warnings, long tasks, and deprecated API calls.
11. **Broken Link Inspector (`services/qa/links.js`)**: Validates internal and external hyperlinks, logging HTTP status codes and dead anchors.
12. **Resource Optimizer (`services/qa/resources.js`)**: Analyzes payload sizes, compression (Gzip/Brotli), cache headers (`Cache-Control`, `ETag`), and render-blocking resources.
13. **Robots & Directives (`services/qa/robots.js`)**: Validates `robots.txt` syntax, XML sitemap presence, and `meta robots` tags (`noindex`, `nofollow`).
14. **Security Header Audit (`services/qa/security.js`)**: Checks for Content Security Policy (`CSP`), `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, and mixed content.

#### Phase 2 Interactive QA Runner
- Located at `server/services/qa/phase2-runner.js`.
- Launches a headless browser session to perform end-to-end interactive validation.
- Configurable per-device execution, orientation swapping, and visual diffing.

#### axe-core Accessibility Compliance
- Official Deque `axe-core` library injected into Playwright sessions.
- Generates structured violation reports categorized by impact (*critical*, *serious*, *moderate*, *minor*).

#### Console & Network Failure Interceptor
- Captures `console.error`, unhandled promise rejections, and failed network requests (HTTP 4xx/5xx).

---

### 4. Design → Code Studio (Screenshots & Figma to Production Code)

> **"Turn screenshots and Figma designs into responsive, production-ready code for your stack."**

The **Design → Code** module (`server/routes/design-to-code-api.js`, `server/services/design-to-code/`, `client/js/tools/design-to-code.js`) provides an enterprise-grade design-to-code developer cockpit. It accepts visual inputs—drag-and-dropped screenshots, clipboard pastes, or official Figma design URLs—and generates maintainable, production-ready code across 6 frontend frameworks and 5 styling systems with **zero vendor lock-in**.

#### Multi-Source Ingestion (Screenshots & Figma)
- **Screenshot Ingestion**: Supports PNG, JPG, JPEG, and WEBP formats via file drag-and-drop, OS clipboard paste (`Cmd+V` / `Ctrl+V`), or file upload dialog.
- **Pure Node.js Binary Dimension Extraction**: Extracts image width, height, aspect ratio, and mime types directly from binary buffer headers (PNG IHDR, JPEG SOF0/SOF2, WEBP VP8/VP8L/VP8X) without native image library dependencies.
- **Figma URL Parser & Client**: Parses Figma canvas URLs, file keys (`figma.com/file/:key` or `figma.com/design/:key`), and URL-encoded node IDs (`?node-id=1-2` or `?node-id=1:2`).
- **Zero Fake Figma Data**: When `FIGMA_ACCESS_TOKEN` is configured, queries the official Figma REST API for true document geometry, vectors, and design tokens. When unconfigured, provides honest setup instructions without inventing mock layers or simulated tokens.

#### 9 Enterprise Framework & Styling Presets
Developers can select from 9 ready-to-run presets or mix and match custom framework and styling combinations:
- `html-scss`: Semantic HTML5 with SCSS variables, responsive mixins (`@include respond-to`), and vanilla JS interaction handler.
- `react-scss`: React 18 modular components (`Navbar.tsx`, `Hero.tsx`, `Button.tsx`) with SCSS modules and TypeScript props interfaces.
- `react-tailwind`: React 18 functional components with Tailwind CSS utility classes and custom `tailwind.config.js` theme extensions.
- `nextjs-tailwind`: Modern Next.js App Router structure (`app/layout.tsx`, `app/page.tsx`, `components/Hero.tsx`, `tailwind.config.js`).
- `vue-scss`: Vue 3 Single-File Components (`App.vue`, `Hero.vue`) using `<script setup lang="ts">` and scoped `<style scoped lang="scss">`.
- `svelte-css`: Svelte components (`App.svelte`, `Hero.svelte`) with scoped CSS and accessible landmark IDs.
- `html-uikit`: HTML5 markup utilizing UIkit layout and component classes (`uk-navbar-container`, `uk-button-primary`, `uk-grid`).
- `html-bootstrap`: HTML5 markup utilizing Bootstrap 5 responsive grid system (`container`, `row`, `col-md-*`, `btn-primary`).
- `wordpress-scss`: WordPress PHP template (`template-hero.php`) with BEM styling, `get_field()`, dynamic feature loops (`have_rows('hero_features')`), and an exportable Advanced Custom Fields (`group_webdev_hero_section.json`) schema.

#### Design Intermediate Representation (DIR)
- Validates against a formal, framework-agnostic schema (`server/services/design-to-code/ir-schema.js`).
- Encapsulates canvas dimensions, color palettes, typography scales, spacing metrics, elevation shadows, layout flow (`flex` / `grid`), and semantic sections (`hero`, `navbar`, `features`, `testimonials`, `footer`, `cta`).
- Completely decouples visual ingestion from language-specific code generation.

#### Semantic & Accessibility Quality Engine
- **Automated Code Auditing**: Inspects synthesized code for semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), heading hierarchy (`<h1>`-`<h6>`), and button tags instead of clickable `<div>` elements.
- **Accessibility Verification**: Validates `alt` attributes on images, `aria-label` attributes on icon triggers, and `#main-content` targets for skip-links.
- **Responsiveness Check**: Flags rigid pixel widths and brittle absolute coordinates (`position: absolute; left: ...`).
- **One-Click Remediation (`[Fix Automatically]`)**: Surgically patches missing `alt` attributes and converts absolute positioning into flexbox layouts.

#### Playwright Chromium Visual Verifier
- Renders generated code inside an isolated, sandboxed browser iframe.
- Queries DOM bounding client rectangles for all major component containers.
- Computes layout alignment, coordinate drift, and layout shift percentages against original DIR design boundaries.
- Produces authentic layout verification reports without simulated or hardcoded 100% scores.

#### Surgical AI Refinement Engine
- Applies localized diff patches based on developer prompts (e.g., *"Make primary CTA dark emerald with rounded-full border"*).
- Updates only affected files and component boundaries without triggering destructive, full-bundle regeneration.

#### Pure Node.js PKZIP Exporter
- Packages multi-file generation bundles into standard `.zip` archives.
- Implemented purely in native Node.js (`Buffer`, CRC32 calculation, stream piping) without external zip tools.
- Strict directory traversal sanitization prevents ZIP-slip attacks.

---

### 5. Visual Regression Testing & Baseline Studio

- Located at `server/routes/baselines-api.js` and `client/js/tools/automated-qa.js`.
- **Pixel-by-Pixel Diffing**: Compares captured screenshots against approved golden baselines.
- **Threshold Tolerances**: Configurable pixel tolerance to prevent false positives from subpixel font rendering.
- **Diff Image Generator**: Highlights visual deviations with an overlay mask.
- **Baseline Approval Workflow**: Approve new baselines or reject visual defects with one click.

---

### 6. API Tester & REST Client

- Located at `server/routes/api-tester.js` and `server/services/api-tester/request-executor.js`.
- **HTTP Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
- **Environment Variables**: Dynamic variable interpolation using `{{variable}}` syntax across Global, Dev, Staging, and Prod environments.
- **Payload Builder**: Form-data, URL-encoded, raw JSON, and GraphQL support.
- **Authentication Helpers**: Bearer tokens, Basic Auth, and custom API key headers.
- **Microsecond Timing Breakdown**: Measures DNS lookup, TCP connect, TLS handshake, Time to First Byte (TTFB), and content download time.
- **CORS Bypass**: Proxied through the local Node.js server to avoid browser CORS restrictions.

---

### 7. Projects, Workspaces, History & Dashboard

- Located at `server/routes/projects-api.js`, `history-api.js`, `reports-api.js`, and `dashboard-api.js`.
- **Client Projects**: Group audits, baselines, and test history by client website.
- **Persistent Scan History**: Track progress, health scores, and issue resolution over time.
- **Reports Archive**: Full JSON audit payloads stored in SQLite and retrievable on demand.
- **Executive Dashboard**: High-level telemetry, test pass/fail ratios, recent project activity, and quick-start actions.

---

## 🏗️ System Architecture & Data Flow

```
                                +---------------------------+
                                |    Browser UI Client      |
                                |  Native Vanilla JS + CSS  |
                                +-------------+-------------+
                                              | HTTP / JSON / Cookies
                                              v
+-----------------------------------------------------------------------------------------+
|                                 Node.js HTTP Server                                     |
|                                    (server.js)                                          |
+---------------------------------------------+-------------------------------------------+
| Middleware: Session Auth, CORS, Body Parser | Routes: Auth, Projects, History, QA, SEO  |
+---------------------------------------------+-------------------------------------------+
                                              |
      +-------------------+-------------------+-------------------+-------------------+
      |                   |                   |                   |                   |
      v                   v                   v                   v                   v
+------------+     +-------------+     +-------------+     +-------------+     +-------------+
| Playwright |     |  SeoCache   |     |  Log File   |     |  Provider   |     |  SQLite DB  |
|  Chromium  |     |  Layer      |     |  Analyzer   |     |  Manager    |     |  (studio.db)|
| (Crawling, |     | (Memory +   |     | (Combined / |     | (GSC, Bing, |     | (better-    |
|   PDFs)    |     |   SQLite)   |     |   Common)   |     |  PSI, Ah)   |     |   sqlite3)  |
+------------+     +-------------+     +-------------+     +-------------+     +-------------+
```

---

## 💾 Complete SQLite Database Schema (All 25 Tables)

Database file: `server/data/studio.db` (initialized automatically on server startup via `server/data/database.js`).

### Core Studio Tables

#### 1. `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  auth_provider TEXT DEFAULT 'local',
  google_id TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 2. `sessions`
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 3. `projects`
```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 4. `test_history`
```sql
CREATE TABLE IF NOT EXISTS test_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  test_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  summary TEXT DEFAULT '{}',
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 5. `reports`
```sql
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  history_id TEXT REFERENCES test_history(id) ON DELETE SET NULL,
  test_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 6. `screenshots`
```sql
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  device_name TEXT,
  viewport TEXT,
  browser TEXT,
  screenshot_type TEXT DEFAULT 'viewport',
  data_uri TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 7. `visual_baselines`
```sql
CREATE TABLE IF NOT EXISTS visual_baselines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  device_name TEXT NOT NULL,
  viewport_width INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  dpr REAL DEFAULT 1,
  browser TEXT DEFAULT 'chromium',
  orientation TEXT DEFAULT 'portrait',
  baseline_data_uri TEXT NOT NULL,
  label TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### SEO Intelligence Tables

#### 8. `seo_audits`
```sql
CREATE TABLE IF NOT EXISTS seo_audits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running',
  progress INTEGER DEFAULT 0,
  current_url TEXT,
  pages_crawled INTEGER DEFAULT 0,
  pages_discovered INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  notices_count INTEGER DEFAULT 0,
  summary_json TEXT DEFAULT '{}',
  error_message TEXT,
  duration_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
```

#### 9. `seo_pages`
```sql
CREATE TABLE IF NOT EXISTS seo_pages (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES seo_audits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  final_url TEXT NOT NULL,
  status_code INTEGER,
  content_type TEXT,
  content_length INTEGER,
  response_time_ms INTEGER,
  crawl_depth INTEGER DEFAULT 0,
  indexable INTEGER DEFAULT 1,
  indexability_status TEXT,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  canonical TEXT,
  word_count INTEGER DEFAULT 0,
  incoming_links_count INTEGER DEFAULT 0,
  outgoing_links_count INTEGER DEFAULT 0,
  issues_count INTEGER DEFAULT 0,
  page_data_json TEXT NOT NULL DEFAULT '{}'
);
```

#### 10. `seo_issues`
```sql
CREATE TABLE IF NOT EXISTS seo_issues (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES seo_audits(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  affected_count INTEGER DEFAULT 0,
  affected_urls_json TEXT NOT NULL DEFAULT '[]'
);
```

#### 11. `seo_provider_connections`
```sql
CREATE TABLE IF NOT EXISTS seo_provider_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  auth_type TEXT DEFAULT 'oauth2',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  api_key TEXT,
  account_id TEXT,
  account_email TEXT,
  status TEXT DEFAULT 'connected',
  error_message TEXT,
  metadata_json TEXT DEFAULT '{}',
  connected_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 12. `seo_provider_properties`
```sql
CREATE TABLE IF NOT EXISTS seo_provider_properties (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES seo_provider_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  property_id TEXT NOT NULL,
  property_name TEXT NOT NULL,
  property_type TEXT DEFAULT 'domain',
  permission_level TEXT,
  is_selected INTEGER DEFAULT 0,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 13. `seo_provider_syncs`
```sql
CREATE TABLE IF NOT EXISTS seo_provider_syncs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  property_id TEXT,
  sync_type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
```

#### 14. `seo_search_console_metrics`
```sql
CREATE TABLE IF NOT EXISTS seo_search_console_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  query TEXT DEFAULT '',
  page TEXT DEFAULT '',
  country TEXT DEFAULT '',
  device TEXT DEFAULT '',
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 15. `seo_bing_metrics`
```sql
CREATE TABLE IF NOT EXISTS seo_bing_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  query TEXT DEFAULT '',
  page TEXT DEFAULT '',
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  position REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 16. `seo_provider_cache`
```sql
CREATE TABLE IF NOT EXISTS seo_provider_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  data_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 17. `seo_competitors`
```sql
CREATE TABLE IF NOT EXISTS seo_competitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  target_domain TEXT NOT NULL,
  competitor_domain TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 18. `seo_log_analyses`
```sql
CREATE TABLE IF NOT EXISTS seo_log_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  lines_parsed INTEGER DEFAULT 0,
  target_domain TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Design → Code Studio Tables

#### 19. `design_projects`
```sql
CREATE TABLE IF NOT EXISTS design_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'html',
  styling TEXT NOT NULL DEFAULT 'scss',
  language TEXT NOT NULL DEFAULT 'javascript',
  rules_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 20. `design_sources`
```sql
CREATE TABLE IF NOT EXISTS design_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  design_project_id TEXT REFERENCES design_projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'screenshot' or 'figma'
  image_data_uri TEXT,
  image_name TEXT,
  image_width INTEGER,
  image_height INTEGER,
  figma_url TEXT,
  figma_file_key TEXT,
  figma_node_id TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 21. `design_analyses`
```sql
CREATE TABLE IF NOT EXISTS design_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES design_sources(id) ON DELETE CASCADE,
  ir_json TEXT NOT NULL,
  tokens_json TEXT NOT NULL DEFAULT '{}',
  components_json TEXT NOT NULL DEFAULT '[]',
  sections_json TEXT NOT NULL DEFAULT '[]',
  responsive_rules_json TEXT NOT NULL DEFAULT '[]',
  interactions_json TEXT NOT NULL DEFAULT '[]',
  confidence_score REAL DEFAULT 1.0,
  provider TEXT DEFAULT 'design-vision-engine',
  model TEXT DEFAULT 'v1',
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 22. `design_generations`
```sql
CREATE TABLE IF NOT EXISTS design_generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id TEXT NOT NULL REFERENCES design_analyses(id) ON DELETE CASCADE,
  design_project_id TEXT REFERENCES design_projects(id) ON DELETE SET NULL,
  framework TEXT NOT NULL, -- 'html', 'react', 'nextjs', 'vue', 'svelte', 'wordpress'
  styling TEXT NOT NULL,   -- 'css', 'scss', 'tailwind', 'bootstrap', 'uikit'
  language TEXT NOT NULL,  -- 'javascript', 'typescript', 'php'
  quality_report_json TEXT DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  provider TEXT DEFAULT 'design-code-engine',
  model TEXT DEFAULT 'v1',
  generation_settings_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 23. `design_files`
```sql
CREATE TABLE IF NOT EXISTS design_files (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL REFERENCES design_generations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_content TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'markup', 'style', 'script', 'component', 'config'
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 24. `design_revisions`
```sql
CREATE TABLE IF NOT EXISTS design_revisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_id TEXT NOT NULL REFERENCES design_generations(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  patch_json TEXT NOT NULL,
  summary TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 25. `design_visual_comparisons`
```sql
CREATE TABLE IF NOT EXISTS design_visual_comparisons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_id TEXT NOT NULL REFERENCES design_generations(id) ON DELETE CASCADE,
  original_data_uri TEXT NOT NULL,
  generated_data_uri TEXT NOT NULL,
  diff_data_uri TEXT,
  differences_json TEXT NOT NULL DEFAULT '[]',
  mismatch_ratio REAL DEFAULT 0,
  viewport_width INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Indexes & Performance Optimizations
```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_history_user ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_project ON test_history(project_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON test_history(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_user ON screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_project ON screenshots(project_id);
CREATE INDEX IF NOT EXISTS idx_baselines_user ON visual_baselines(user_id);
CREATE INDEX IF NOT EXISTS idx_baselines_lookup ON visual_baselines(project_id, target_url, device_name);
CREATE INDEX IF NOT EXISTS idx_seo_audits_user ON seo_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_audits_project ON seo_audits(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_audit ON seo_pages(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_url ON seo_pages(url);
CREATE INDEX IF NOT EXISTS idx_seo_issues_audit ON seo_issues(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_issues_severity ON seo_issues(severity);
CREATE INDEX IF NOT EXISTS idx_seo_prov_conn_user ON seo_provider_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_seo_prov_props_user ON seo_provider_properties(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_seo_cache_lookup ON seo_provider_cache(provider, expires_at);
CREATE INDEX IF NOT EXISTS idx_seo_competitors_user ON seo_competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_logs_user ON seo_log_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_design_proj_user ON design_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_design_sources_user ON design_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_design_analyses_source ON design_analyses(source_id);
CREATE INDEX IF NOT EXISTS idx_design_gen_user ON design_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_design_files_gen ON design_files(generation_id);
CREATE INDEX IF NOT EXISTS idx_design_rev_gen ON design_revisions(generation_id);
CREATE INDEX IF NOT EXISTS idx_design_comp_gen ON design_visual_comparisons(generation_id);
```

---

## 🔌 Complete REST API Reference

All endpoints return `Content-Type: application/json` and enforce authentication via the `studio_session` HTTP-only cookie.

### 1. Authentication API (`/api/auth/*`)
- `POST /api/auth/register` — Register a new account (`email`, `password`, `name`). Hashes password with `bcryptjs`.
- `POST /api/auth/login` — Authenticate credentials. Creates session and sets `studio_session` cookie.
- `GET /api/auth/me` — Return current authenticated user profile (`id`, `name`, `email`, `avatar_url`).
- `POST /api/auth/logout` — Destroys session in SQLite and clears the session cookie.

### 2. Projects & Workspaces API (`/api/projects/*`)
- `GET /api/projects` — List user projects (supports `?archived=1`).
- `POST /api/projects` — Create project (`name`, `website_url`, `description`).
- `GET /api/projects/:id` — Get project details with linked test history, reports, and screenshot counts.
- `PUT /api/projects/:id` — Update project metadata.
- `DELETE /api/projects/:id` — Delete project (cascades linked records).
- `POST /api/projects/:id/archive` — Toggle project archive status.

### 3. Test History API (`/api/history/*`)
- `GET /api/history` — Query test history with filters: `?project_id=`, `?test_type=`, `?status=`, `?search=`, `?sort=newest|oldest`, `?limit=20`, `?offset=0`.
- `POST /api/history` — Record completed test (`project_id`, `test_type`, `target_url`, `status`, `summary`, `duration_ms`).
- `GET /api/history/:id` — Get specific history entry and linked report JSON.
- `DELETE /api/history/:id` — Delete history record.

### 4. Saved Reports API (`/api/reports/*`)
- `GET /api/reports` — List saved report metadata (`?project_id=`, `?test_type=`, `?limit=20`, `?offset=0`).
- `POST /api/reports` — Save full audit result (`project_id`, `history_id`, `test_type`, `target_url`, `result_json`).
- `GET /api/reports/:id` — Retrieve full report including parsed `result_json`.
- `DELETE /api/reports/:id` — Delete report.

### 5. Screenshots API (`/api/screenshots/*`)
- `GET /api/screenshots` — List captured screenshots (`?project_id=`, `?report_id=`).
- `POST /api/screenshots` — Store high-resolution capture (`project_id`, `report_id`, `filename`, `device_name`, `viewport`, `browser`, `screenshot_type`, `data_uri`).
- `GET /api/screenshots/:id` — Retrieve screenshot by ID.
- `DELETE /api/screenshots/:id` — Remove screenshot.

### 6. Visual Baselines API (`/api/baselines/*`)
- `GET /api/baselines` — List approved visual baselines (`?project_id=`, `?target_url=`).
- `POST /api/baselines` — Save golden visual baseline (`project_id`, `target_url`, `device_name`, `viewport_width`, `viewport_height`, `dpr`, `browser`, `orientation`, `baseline_data_uri`, `label`).
- `GET /api/baselines/:id` — Retrieve baseline data URI and dimensions.
- `DELETE /api/baselines/:id` — Remove baseline.
- `POST /api/baselines/compare` — Perform visual diff comparison against baseline.

### 7. Executive Dashboard API (`/api/dashboard/*`)
- `GET /api/dashboard` — Returns aggregate telemetry for current user: active projects count, total tests run, pass/fail counts, saved baselines, recent projects, and recent activity timeline.

### 8. Website QA Scanner API (`/api/qa/*`)
- `POST /api/qa/scan` — Run comprehensive Phase 1 website QA scan (14 inspection engines).
  - Body: `{ "url": "https://example.com" }`
- `POST /api/qa/phase2` — Execute interactive Phase 2 QA test suite (safe interactions, forms, broken UI, redirects, WCAG a11y, visual diff).
  - Body: `{ "url": "https://example.com", "device": { "name": "iPhone 15 Pro" }, "options": { "interactions": true, "accessibility": true } }`

### 9. Responsive Tester API (`/api/responsive/*`)
- `GET /api/responsive/diagnostics` — Check installed Playwright browser availability (Chromium, Firefox, WebKit, Edge).
- `GET /api/responsive/devices` — Return device profile dictionary.
- `GET /api/responsive/sessions` — List active interactive browser sessions.
- `POST /api/responsive/session/navigate` — Open URL inside a browser preview session.
- `POST /api/responsive/session/action` — Dispatch user interactions (`back`, `forward`, `reload`, `click`, `screenshot`, `close`).
- `POST /api/responsive/breakpoints` — Execute automated breakpoint tests across viewports.
- `POST /api/responsive/matrix/browsers` — Run target URL across Chromium, Firefox, and WebKit simultaneously.
- `POST /api/responsive/matrix/devices` — Run target URL across multiple device profiles.
- `POST /api/responsive/report` — Generate responsive audit summary report.
- `POST /api/responsive/inspect` — Inspect iframe security and media query definitions.

### 10. API Tester Proxy (`/api/tester/*`)
- `POST /api/tester/proxy` — Execute HTTP request server-side to bypass CORS.
  - Body: `{ "url": "https://api.example.com", "method": "POST", "headers": {}, "body": "{}", "auth": {} }`
  - Returns: `{ "status": 200, "statusText": "OK", "headers": {}, "body": "...", "timings": { "dns": 12, "tcp": 24, "tls": 30, "ttfb": 95, "total": 140 } }`

### 11. SEO Crawler Audits API (`/api/seo/audits/*`)
- `POST /api/seo/audits` — Launch site crawl.
  - Body: `{ "url": "https://example.com", "crawl_scope": "domain", "max_pages": 1500, "include_axe": true }`
- `GET /api/seo/audits` — List previous audits with health scores and summary statistics.
- `GET /api/seo/audits/:id` — Get live crawl progress, current page, and health score.
- `GET /api/seo/audits/:id/pages` — Paginated crawled pages list (`?limit=50&offset=0&search=`).
- `GET /api/seo/audits/:id/issues` — Detailed detected issues grouped by severity (`?severity=error|warning|notice`).
- `GET /api/seo/audits/:id/export/pdf` — Stream executive vector PDF.
- `GET /api/seo/audits/:id/export/csv` — Download issues and pages spreadsheet CSV.
- `GET /api/seo/audits/:id/export/json` — Download full audit JSON dataset.
- `DELETE /api/seo/audits/:id` — Delete crawl audit and all associated page records.

### 12. SEO Intelligence & External Providers API (`/api/seo/*`)
- `GET /api/seo/providers/registry` — List all data source adapters, capabilities, and attribution rules.
- `GET /api/seo/providers/status` — Return connectivity status for GSC, Bing, PageSpeed, and Ahrefs.
- `POST /api/seo/providers/verify-key` — Test API key validity against live provider endpoint without saving.
- `POST /api/seo/providers/connect` — Save verified provider credentials in SQLite.
- `POST /api/seo/providers/disconnect` — Invalidate and remove provider connection.
- `GET /api/seo/providers/gsc/auth-url` — Generate Google Search Console OAuth 2.0 authorization URL.
- `GET /api/seo/providers/gsc/oauth-callback` — Google OAuth 2.0 redirect handler and token exchange.
- `GET /api/seo/gsc/properties` — List verified Google Search Console site properties (`?sync=1` to force refresh).
- `POST /api/seo/gsc/select-property` — Set primary active property (`propertyId`).
- `GET /api/seo/gsc/analytics` — Fetch authentic Google Search Analytics data (`?property_id=&range=28d&dimensions=query,page`).
- `POST /api/seo/bing/config` — Save and validate Bing Webmaster Tools API key.
- `POST /api/seo/bing/disconnect` — Remove Bing Webmaster connection.
- `GET /api/seo/bing/stats` — Fetch rank and traffic statistics from Bing Webmaster API.
- `GET /api/seo/bing/queries` — Fetch top query rankings from Bing.
- `POST /api/seo/ahrefs/config` — Save and validate Ahrefs Free Public API key.
- `POST /api/seo/ahrefs/disconnect` — Remove Ahrefs connection.
- `GET /api/seo/ahrefs/dr` — Fetch official Ahrefs Domain Rating (`?domain=example.com`).
- `POST /api/seo/pagespeed/config` — Save and validate Google PageSpeed Insights API key.
- `POST /api/seo/pagespeed/test-connection` — Test PageSpeed API key with a live network request.
- `POST /api/seo/pagespeed/disconnect` — Remove custom PageSpeed API key.
- `GET /api/seo/pagespeed/analyze` — Run Lighthouse & CrUX analysis (`?url=...&strategy=mobile|desktop`).
- `GET /api/seo/overview` — Multi-source domain overview aggregator (`?domain=example.com`).
- `POST /api/seo/competitors/compare` — Side-by-side domain gap analysis.
- `POST /api/seo/logs/analyze` — Parse Apache/Nginx access log text and compute wasted crawl budget.

### 13. Design → Code Studio API (`/api/design/*`)
- `POST /api/design/upload` — Upload screenshot image (PNG, JPG, JPEG, WEBP). Analyzes binary dimensions, validates payload, and saves source record.
- `POST /api/design/figma/parse` — Parse Figma canvas URL, extracts `fileKey` and `nodeId`, and fetches live node tree if `FIGMA_ACCESS_TOKEN` is configured.
- `POST /api/design/analyze` — Run visual layout analyzer on source record, synthesizes Design Intermediate Representation (DIR), detects semantic sections and color/typography tokens.
- `POST /api/design/generate` — Transpile DIR into multi-file production code bundle for specified framework (`html`, `react`, `nextjs`, `vue`, `svelte`, `wordpress`) and styling system (`css`, `scss`, `tailwind`, `bootstrap`, `uikit`).
- `POST /api/design/refine` — Surgically patch generated files with localized prompt modifications without full bundle re-synthesis.
- `POST /api/design/verify` — Execute sandboxed Playwright Chromium DOM inspection, extract element bounding client rects, compute layout accuracy, and detect layout shift.
- `POST /api/design/fix-quality` — Automatically remediate accessibility and responsive layout violations (populates missing `alt` tags, converts absolute positioning to flexbox).
- `GET /api/design/export/zip` — Stream pure Node.js PKZIP archive (`?generationId=...`) with path traversal sanitization.
- `GET /api/design/history` — List recent design generations, presets, timestamps, and quality scores for authenticated user.
- `GET /api/design/generations/:id` — Retrieve full generation bundle, file tree, preview HTML, quality scorecard, and visual verification metrics.

---

## 🌐 External Data Provider Setup & Verification

### Google PageSpeed Insights & CrUX Setup
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **PageSpeed Insights API** (`pagespeedonline.googleapis.com`).
3. Create an API Key in **Credentials**.
4. Configure in WebDev AI Studio via either:
   - **Environment Variable**: Add `PAGESPEED_API_KEY=AIzaSy...` to your `.env` file.
   - **Settings UI**: Open **Settings** -> **SEO Data Providers** -> **Google PageSpeed Insights** -> Enter key and click **Save & Test Connection**.
5. **Quota & Rate Limits**: Unauthenticated calls share Google's zero-quota public pool and return HTTP 429. An API key grants 25,000 free requests per day.
6. **Diagnostics**: If rate-limited, the UI displays a diagnostics card with an interactive **`[Retry]`** button.

### Google Search Console (OAuth 2.0) Setup
1. In Google Cloud Console, enable **Google Search Console API** (`webmasters.readonly`).
2. Configure OAuth Consent Screen (External or Internal).
3. Create Credentials -> **OAuth Client ID** -> **Web Application**.
4. Add Authorized Redirect URI:
   `http://127.0.0.1:3000/api/seo/providers/gsc/oauth-callback`
5. Add credentials to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/seo/providers/gsc/oauth-callback
   ```
6. In **Settings** -> **SEO Data Providers**, click **Connect Google Search Console**. Complete the Google login flow.

### Bing Webmaster Tools Setup
1. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Go to **Settings** -> **API Access** -> **API Key** and generate a key.
3. In WebDev AI Studio Settings, enter your Bing API Key and click **Save & Test**. The server verifies the key against `GetUserSites`.

### Ahrefs Free Public API Setup
1. Generate an API Key from your [Ahrefs Account Settings](https://ahrefs.com/api).
2. Add `AHREFS_API_KEY=your_key` to `.env` or save it in the Settings UI.
3. Every response is verified and stamped with the mandatory attribution: *"Domain Rating by Ahrefs"*.

---

## 🚀 Installation & Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (fully tested on Node v26)
- **Operating System**: macOS, Linux, or Windows (WSL recommended)

### 1. Clone & Install
```bash
git clone <repository-url> "testing ai"
cd "testing ai"

# Install production dependencies
npm install

# Install Playwright Chromium browser engine
npx playwright install chromium
```

### 2. Start the Server
```bash
# Production mode
npm start

# Development mode (auto-reloads on file changes)
npm run dev
```

Open your browser at:
`http://127.0.0.1:3000/`

---

## ⚙️ Configuration & Environment Variables (`.env`)

Create a `.env` file in the project root:

```bash
# Server Port (default: 3000)
PORT=3000

# Google PageSpeed Insights API Key (Unlocks 25,000 queries/day)
PAGESPEED_API_KEY=AIzaSy...

# Google Search Console OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/seo/providers/gsc/oauth-callback

# Bing Webmaster Tools API Key
BING_WEBMASTER_API_KEY=your_bing_api_key

# Ahrefs Free Public API Key
AHREFS_API_KEY=your_ahrefs_api_key
```

*Note: Environment variables are automatically parsed on startup by `server.js` using a native `.env` parser.*

---

## 🧪 Verification & Automated Test Harness

WebDev AI Studio includes an automated test harness covering 71 tests across 6 independent suites:

```bash
# Run all SEO Intelligence test suites in sequence
node scripts/run-all-seo-tests.js

# Run the Design → Code test suite
node scripts/tests/design-to-code-tests.js
```

### The 6 Independent Test Suites

```
[ Master Test Runner: scripts/run-all-seo-tests.js ]
  ├── Suite A: Unit Tests (8 / 8 Passed)
  ├── Suite B: SQLite DB & Integration Tests (8 / 8 Passed)
  ├── Suite C: External API Verification Tests (2 Passed, 3 Skipped gracefully)
  ├── Suite D: Playwright Chromium E2E Tests (8 / 8 Passed)
  └── Suite E: PageSpeed & CrUX Deep Suite (12 / 12 Passed)

[ Design → Code Test Suite: scripts/tests/design-to-code-tests.js ]
  └── Suite F: Design-to-Code Studio Harness (24 / 24 Passed, 100%)
```

1. **Suite A: Pure Unit Tests** (`scripts/tests/unit-tests.js` - 8 tests)
   - Metric normalizer contract enforcement.
   - `robots.txt` AI-bot parser (GPTBot, ClaudeBot, PerplexityBot).
   - Apache/Nginx Combined Log regex parser & wasted crawl budget detector.
   - CSV header/field quotation & JSON export serializers.
2. **Suite B: SQLite DB & Integration Tests** (`scripts/tests/integration-tests.js` - 8 tests)
   - Schema validation for all 25 database tables.
   - Audit, page, and issue insertion & cascade verification.
   - Two-tier `SeoCache` (memory + SQLite) invalidation and expiration.
   - Provider credential encryption and storage.
   - Live HTTP API routes tested with authenticated sessions.
3. **Suite C: External API Verification** (`scripts/tests/external-api-tests.js` - 5 tests)
   - Real network calls to Google PageSpeed Insights v5 API (`runPagespeed`).
   - GSC OAuth URL generator with read-only scopes.
   - Bing Webmaster and Ahrefs DR schema validation.
   - Validates that unconfigured keys gracefully report `"Not Connected"` (Zero Fake Data).
4. **Suite D: Playwright Chromium E2E Tests** (`scripts/tests/e2e-browser-tests.js` - 8 tests)
   - Launches headless Chromium and logs into the studio.
   - Navigates through all 8 SEO Intelligence tabs.
   - Verifies `#gscPropertySelect` dropdown and `#gscQueryFilterInput`.
   - Checks separate CrUX field metrics container vs Lighthouse lab data.
   - DOM audit confirming zero fake or placeholder values.
5. **Suite E: PageSpeed & CrUX Comprehensive Suite** (`scripts/tests/pagespeed-tests.js` - 12 tests)
   - Mobile and Desktop strategy request routing.
   - All 4 Lighthouse categories (Performance, Accessibility, Best Practices, SEO).
   - HTTP 429 quota exhaustion and HTTP 403 invalid key handling.
   - Malformed JSON handling.
   - Null category handling (never invents fake numbers).
   - Client API key leakage prevention.
   - 12-hour caching and cache-hit verification.
   - CrUX field data presence vs. absence.
6. **Suite F: Design → Code Studio Harness** (`scripts/tests/design-to-code-tests.js` - 24 tests)
   - DIR intermediate representation schema validation & error trapping.
   - Pure Node.js binary dimension parsers for PNG, JPEG, and WEBP formats.
   - Semantic section detection & design token extraction.
   - Figma URL & node ID parsing with honest unauthenticated state.
   - 9 Enterprise code generation presets (HTML+SCSS, React+SCSS, React+Tailwind, Next.js+Tailwind, Vue+SCSS, Svelte+CSS, HTML+UIkit, HTML+Bootstrap, WordPress+SCSS with ACF fields).
   - Existing project component reuse & design token mapping.
   - Semantic quality inspections (landmarks, heading hierarchy, `<button>` tags).
   - Automated quality remediation (`fixCodeQuality`).
   - Playwright Chromium sandboxed visual verification and DOM bounding-box comparison.
   - Surgical AI refinement patch applicator.
   - Path-traversal-sanitized pure Node.js PKZIP file exporter.

---

## 📁 Accurate Project Directory Tree

```
.
├── server.js                               # Raw Node.js HTTP server entry point (.env auto-loader)
├── package.json                            # Dependencies: better-sqlite3, playwright, bcryptjs, uuid
├── index.html                              # Studio single-page application shell
├── styles/
│   └── design-to-code.css                  # Design → Code Studio split-pane UI and preview styles
├── client/                                 # Frontend client assets
│   ├── css/                                # Design system and responsive stylesheets
│   └── js/                                 # Vanilla JS controllers and components
│       ├── app.js                          # SPA router and tool switcher
│       ├── components/
│       │   ├── auth/                       # Authentication modal and session watcher
│       │   ├── devices/                    # Hardware device frame registry (iPhone, Pixel, MacBook)
│       │   ├── qa/                         # Automated QA modals and inspection panels
│       │   └── responsive/                 # Responsive tester controls, breakpoints, galleries
│       ├── services/                       # Client state managers (auth, projects, history, settings)
│       └── tools/
│           ├── dashboard.js                # Executive dashboard controller
│           ├── design-to-code.js           # Design → Code Studio UI controller
│           ├── seo-audit.js                # SEO crawler UI, issue browser, and export triggers
│           ├── seo-intelligence.js         # SEO Intelligence 8-tab manager & provider runner
│           ├── settings.js                 # Settings UI & SEO Data Providers configuration
│           ├── responsive-tester.js        # Multi-device responsive tester controller
│           ├── website-qa.js               # QA scanner and axe-core runner
│           ├── automated-qa.js             # Visual regression baseline controller
│           ├── api-tester.js               # REST client controller & environment manager
│           ├── projects.js                 # Workspaces and client projects manager
│           └── history.js                  # Scan history & saved reports browser
├── server/                                 # Backend modules and services
│   ├── data/
│   │   ├── database.js                     # SQLite initialization, schema (25 tables), WAL mode
│   │   └── studio.db                       # Active SQLite database file
│   ├── middleware/
│   │   └── auth.js                         # Cookie session parsing, token management, requireAuth
│   ├── routes/
│   │   ├── auth.js                         # Register, login, me, logout routes
│   │   ├── projects-api.js                 # Project CRUD endpoints
│   │   ├── history-api.js                  # Test history endpoints
│   │   ├── reports-api.js                  # Saved report endpoints
│   │   ├── screenshots-api.js              # Screenshot storage endpoints
│   │   ├── baselines-api.js                # Visual regression baseline endpoints
│   │   ├── dashboard-api.js                # Executive dashboard aggregate telemetry
│   │   ├── qa.js                           # QA test runner & axe-core scan route
│   │   ├── responsive.js                   # Responsive diagnostics & browser matrix routes
│   │   ├── api-tester.js                   # CORS-bypassing API test proxy
│   │   ├── seo-audit-api.js                # Crawler launch, progress, and export routes
│   │   ├── seo-intelligence-api.js         # GSC, Bing, PageSpeed, Ahrefs, Logs API routes
│   │   └── design-to-code-api.js           # Design → Code upload, analyze, generate, refine, verify
│   ├── services/
│   │   ├── design-to-code/                 # Design-to-Code Engines
│   │   │   ├── ir-schema.js                # Design Intermediate Representation schema
│   │   │   ├── analyzer.js                 # Binary image parser & semantic section builder
│   │   │   ├── figma-parser.js             # Figma URL parser & official REST API client
│   │   │   ├── generator/
│   │   │   │   ├── generator-engine.js     # Master generator orchestrator (all 9 presets)
│   │   │   │   ├── framework-mapper.js     # CSS, SCSS, Tailwind token generator
│   │   │   │   ├── existing-project-mapper.js # Existing component and BEM class mapper
│   │   │   │   ├── html-scss-generator.js  # HTML5 + SCSS bundle generator
│   │   │   │   ├── react-generator.js      # React 18 JSX/TSX modular component generator
│   │   │   │   ├── nextjs-generator.js     # Next.js App Router structure generator
│   │   │   │   ├── vue-generator.js        # Vue 3 SFC (<script setup>) generator
│   │   │   │   ├── svelte-generator.js     # Svelte component & styles generator
│   │   │   │   └── wordpress-generator.js  # WordPress template + ACF JSON schema generator
│   │   │   ├── quality-engine.js           # Semantic & a11y auditor & auto-remediator
│   │   │   ├── visual-verifier.js          # Playwright Chromium DOM sandboxed diff verifier
│   │   │   ├── refinement-engine.js        # Surgical AI refinement patch applicator
│   │   │   ├── ai-provider.js              # AI provider abstractions
│   │   │   └── zip-exporter.js             # Pure Node.js PKZIP file packager
│   │   ├── api-tester/
│   │   │   └── request-executor.js         # Native HTTP client with network timing breakdown
│   │   ├── qa/                             # 14 specialized inspection engines
│   │   │   ├── accessibility.js            # axe-core WCAG 2.1 AA/AAA scanner
│   │   │   ├── css.js                      # Stylesheet and layout shift analyzer
│   │   │   ├── fonts.js                    # WebFont performance and FOIT/FOUT checker
│   │   │   ├── html.js                     # DOM validation and syntax checker
│   │   │   ├── images.js                   # Image optimization and layout shift auditor
│   │   │   ├── javascript.js               # Console errors and long tasks detector
│   │   │   ├── links.js                    # Internal/external broken link checker
│   │   │   ├── phase2-runner.js            # Interactive QA runner (interactions, forms, broken UI)
│   │   │   ├── resources.js                # Payload and caching auditor
│   │   │   ├── robots.js                   # Robots.txt and meta robots directives auditor
│   │   │   ├── schema.js                   # Structured data JSON-LD validator
│   │   │   ├── security.js                 # Security headers (CSP, HSTS) and mixed content
│   │   │   ├── social.js                   # Open Graph and Twitter Cards validator
│   │   │   └── technical.js                # Redirects, status codes, protocol validator
│   │   ├── responsive/
│   │   │   ├── breakpoint-runner.js        # Automated multi-breakpoint layout evaluator
│   │   │   ├── browser-preview.js          # Interactive browser preview sessions
│   │   │   ├── browser-provider.js         # Playwright Chromium, Firefox, WebKit, Edge provider
│   │   │   ├── device-registry.js          # Device viewport and DPR profiles
│   │   │   ├── matrix-runner.js            # Cross-browser and multi-device matrix runner
│   │   │   ├── overflow-analyzer.js        # Horizontal overflow CSS selector detector
│   │   │   ├── report-builder.js           # Responsive audit report compiler
│   │   │   ├── session-manager.js          # Safe URL validator and session coordinator
│   │   │   └── viewport-engine.js          # Viewport meta parser and media query extractor
│   │   └── seo/
│   │       ├── browser-renderer.js         # Playwright Chromium DOM execution
│   │       ├── crawler.js                  # Recursive BFS site crawler (up to 1,500 pages)
│   │       ├── exporter.js                 # CSV and JSON report serialiser
│   │       ├── html-parser.js              # Meta, headings, links, and schema extractor
│   │       ├── issue-engine.js             # 32 deterministic technical SEO rules & health score
│   │       ├── log-analyzer.js             # Apache/Nginx access log parser & crawl budget analyzer
│   │       ├── pdf-generator.js            # Playwright vector PDF generator
│   │       ├── robots-analyzer.js          # Robots.txt parser and 9+ AI search bot matrix
│   │       ├── seo-cache.js                # Two-tier cache (memory + SQLite) with 12h TTL
│   │       ├── seo-normalizer.js           # Unified metric schema validator
│   │       ├── seo-provider-manager.js     # Multi-provider coordinator and graceful fallback
│   │       ├── seoDataSources.js           # Provider registry and attribution rules
│   │       ├── sitemap-parser.js           # XML sitemap index and orphan page detector
│   │       ├── url-utils.js                # Normalization, relative URL resolution, query cleaning
│   │       └── providers/
│   │           ├── ahrefs/                 # Ahrefs Free Public API adapter
│   │           ├── bing-webmaster/         # Bing Webmaster JSON API adapter
│   │           ├── future/                 # Scaffolded stubs for Semrush, DataForSEO, Moz
│   │           ├── google-search-console/  # GSC OAuth 2.0 and Search Analytics client
│   │           ├── own-crawler/            # First-party crawler adapter
│   │           └── pagespeed/              # Google PageSpeed Insights v5 & CrUX client
│   └── utils/
│       └── http-helpers.js                 # JSON response serializers and body readers
├── scripts/                                # Automated verification and test harnesses
│   ├── run-all-seo-tests.js                # Master test runner (Suites A, B, C, D, E)
│   ├── run-real-pagespeed-check.js         # Live PageSpeed test against bkpainters.co.nz
│   └── tests/
│       ├── unit-tests.js                   # Suite A: Pure unit tests (8 tests)
│       ├── integration-tests.js            # Suite B: SQLite DB & API tests (8 tests)
│       ├── external-api-tests.js           # Suite C: External API verification (5 tests)
│       ├── e2e-browser-tests.js            # Suite D: Playwright Chromium E2E (8 tests)
│       └── pagespeed-tests.js              # Suite E: PageSpeed & CrUX suite (12 tests)
└── docs/                                   # Architectural specifications
    ├── ARCHITECTURE.md                     # System architecture & component decoupling
    ├── API_INTEGRATIONS.md                 # External API request/response specifications
    ├── SEO_DATA_SOURCES.md                 # Data provenance & attribution guidelines
    ├── FEATURE_MATRIX.md                   # 8-category SEMrush capability matrix
    └── CHANGELOG.md                        # Version history and changelog
```

---

## 🔒 Security, Privacy & Data Governance

- **100% Local Disk Storage**: All databases, tokens, access logs, and screenshots remain strictly on your local machine. No telemetry or usage tracking is ever transmitted.
- **Secret Redaction**: API keys and OAuth client secrets are stored securely server-side and never sent to the browser. The `getConnectionStatus` endpoint strictly returns boolean status flags (`hasApiKey: true`).
- **Safe Error Handling**: Error messages from external APIs are sanitized to prevent secret or authorization URL leakage.
- **Isolated User Contexts**: All SQLite tables enforce `user_id` foreign keys and cascaded deletion for multi-user isolation.
- **Destructive Keyword Guard**: The automated QA suite automatically skips buttons and links containing destructive keywords (`delete`, `remove`, `buy`, `order`, `logout`).

---

## ❓ Troubleshooting & Frequently Asked Questions

### 1. Why does Google PageSpeed show "PageSpeed API quota exceeded"?
By default, requests without an API key share Google's public anonymous pool, which is heavily throttled or capped at 0. To fix this:
1. Enable the **PageSpeed Insights API** in [Google Cloud Console](https://console.cloud.google.com/).
2. Create an API Key and add `PAGESPEED_API_KEY=AIzaSy...` to your `.env` file or save it via **Settings** -> **SEO Data Providers**.
3. Click the live **`[Retry]`** button on the PageSpeed screen.

### 2. Why does CrUX show "Field data unavailable"?
The Chrome User Experience Report (CrUX) only contains metrics for URLs with sufficient real-world Chrome traffic over the trailing 28 days. If your site has lower volume or is a new staging URL, Google returns no field data. The platform displays `"Field data unavailable"` while continuing to display the full Lighthouse lab audit.

### 3. Google Search Console OAuth returns `redirect_uri_mismatch`
Ensure the Authorized Redirect URI in your Google Cloud OAuth Credentials matches your application port exactly:
`http://127.0.0.1:3000/api/seo/providers/gsc/oauth-callback`
*(Note: Google OAuth requires `127.0.0.1` or a registered domain; `localhost` can cause redirect mismatches in some browser configurations).*

### 4. Port 3000 is already in use (`EADDRINUSE`)
Specify a different port via the environment variable:
```bash
PORT=3005 npm start
```

### 5. Playwright fails with "Executable doesn't exist"
Install the Playwright browser binaries:
```bash
npx playwright install chromium
# Or install all browsers for the full matrix:
npx playwright install
```

---

## 📄 License

ISC License. Built for developers, QA engineers, and SEO specialists who demand authentic data, privacy, and speed.
