# SEO Data Sources Reference & Methodology

This document details the data sources, attribution rules, capabilities, and limitations of the **WebDev AI Studio SEO Intelligence Platform**.

---

## 1. Data Source Registry Overview

| Provider | Category | Status | Cost | Auth Type | Attribution Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WebDev Crawler** | Technical & On-Page SEO | `AVAILABLE` | Free | None (First-party) | No |
| **Google Search Console** | Organic Search Performance | `CONNECTED_DATA` | Free | OAuth 2.0 (`webmasters.readonly`) | Yes |
| **Bing Webmaster Tools** | Organic Search Performance | `CONNECTED_DATA` | Free | API Key | Yes |
| **Ahrefs Public API** | Authority & Domain Rating | `AVAILABLE` | Free | API Key | **Mandatory: "Domain Rating by Ahrefs"** |
| **Google PageSpeed Insights** | Speed & Core Web Vitals | `AVAILABLE` | Free | Optional API Key | Yes |
| **Google Trends** | Keyword Interest Trend | `ALPHA` | Free | None | Yes |
| **Semrush API** | Enterprise Keyword & Backlinks | `COMING_SOON` | Paid | Enterprise API Key | Yes |
| **DataForSEO** | High-Volume SERP Scraping | `COMING_SOON` | Paid | Enterprise API Key | Yes |
| **Moz API** | Domain Authority & Links | `COMING_SOON` | Paid | Enterprise API Key | Yes |

---

## 2. In-Depth Provider Specifications

### 2.1 WebDev AI Crawler (`own-crawler`)
- **Type**: First-party recursive breadth-first search (BFS) crawler with headless Chromium DOM execution.
- **Capabilities**:
  - Full internal website crawl (configurable up to 1,500 pages)
  - Recursive link extraction with URL normalization and fragment stripping
  - Real-time streaming crawl monitoring via server-sent polling
  - robots.txt compliance and disallow validation
  - AI Crawler Directive Matrix: Evaluates permissions for GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, ByteSpider, and CCBot
  - XML Sitemap discovery and URL inventory verification
  - 32 deterministic technical SEO issues categorized by Error, Warning, and Notice
  - Deterministic 100-point Health Score penalty engine
- **Limitations**:
  - Measures on-page, HTML, and browser execution signals only. Cannot report external rankings, third-party search queries, or off-site backlink profiles.

---

### 2.2 Google Search Console (`google-search-console`)
- **Type**: First-party search engine analytics directly from Google.
- **OAuth Scope**: `https://www.googleapis.com/auth/webmasters.readonly`
- **Capabilities**:
  - Organic clicks, search impressions, click-through rate (CTR), and average ranking positions
  - Query-level analytics filtered by date ranges (`7d`, `28d`, `3m`, `6m`, `12m`)
  - Page-level traffic breakdowns
  - Country and device distribution (Desktop, Mobile, Tablet)
  - Verified property selection (`sites.list`)
- **Attribution & Transparency**:
  - Results are strictly identified as `Source: Google Search Console`.
  - Data is only available for domains verified by the authenticated Google account.
  - If unconnected, displays: *"Google Search Console Not Connected"*.

---

### 2.3 Bing Webmaster Tools (`bing-webmaster`)
- **Type**: First-party search engine analytics for Microsoft Bing and Yahoo.
- **Auth**: API Key generated in Bing Webmaster Tools settings.
- **Capabilities**:
  - Keyword search queries and impressions on Bing
  - Click performance and average position
  - Crawled page statistics and indexation coverage
- **Limitations**:
  - Only returns data for sites verified in the associated Bing Webmaster Tools account.

---

### 2.4 Ahrefs Free Public API (`ahrefs`)
- **Type**: Third-party domain authority metric provider.
- **Endpoint**: `GET https://api.ahrefs.com/v3/public/domain-rating`
- **Capabilities**:
  - Authentic Ahrefs Domain Rating (DR) on a logarithmic 0-100 scale.
- **Strict Attribution Policy**:
  - As per Ahrefs terms of service, all displays of Domain Rating must state:
    > **"Domain Rating by Ahrefs"**
  - WebDev AI Studio never relabels Ahrefs DR as a proprietary metric.
- **Limitations**:
  - The Free Public API delivers Domain Rating only. Backlink graphs, anchor text distribution, and referring domain explorers require future enterprise provider tiers.

---

### 2.5 Google PageSpeed Insights (`pagespeed`)
- **Type**: Web performance and Core Web Vitals audit engine.
- **Endpoint**: Google PageSpeed Insights API v5 (`pagespeedonline.googleapis.com`).
- **Capabilities**:
  - **Lighthouse Lab Measurements**: Synthetic audits for Performance, Accessibility, Best Practices, and SEO.
  - **CrUX Real-User Field Data**: Chrome User Experience Report (CrUX) metrics:
    - Largest Contentful Paint (LCP)
    - Cumulative Layout Shift (CLS)
    - Interaction to Next Paint (INP) / First Input Delay (FID)
    - First Contentful Paint (FCP)
  - Specific diagnostic suggestions with estimated millisecond and kilobyte savings.
- **Strict Field Data Separation**:
  - Lab metrics and real-user field metrics are cleanly segregated.
  - If a URL has insufficient Chrome traffic, the system outputs: *"Field Data Unavailable: Chrome User Experience Report (CrUX) does not have sufficient real-user samples for this URL"* while continuing to display the Lighthouse lab audit.

---

### 2.6 Server Access Log Analyzer (`log-analyzer`)
- **Type**: First-party server log file parsing and bot detection engine.
- **Format Support**: Apache/Nginx Common Log Format and Combined Log Format.
- **Capabilities**:
  - Classifies search bots: Googlebot Desktop, Googlebot Smartphone, Bingbot
  - Classifies AI bots: GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, ByteSpider, CCBot
  - Identifies human visitor traffic vs bot traffic
  - Computes crawl budget waste: 4xx client errors and 5xx server errors hit by search crawlers
  - Lists top crawled internal URLs and bot visit counts
- **Database Retention**: Parsed log metadata and analysis summaries are stored in SQLite `seo_log_analyses` for historical trend comparisons.

---

### 2.7 Future Enterprise Tiers (Semrush / DataForSEO / Moz)
- **Status**: `COMING_SOON`
- **Design Intent**:
  - Abstract provider classes are scaffolded in `server/services/seo/providers/future/`.
  - When enterprise API subscriptions are added in the future, these adapters will activate without changing the system architecture or frontend contracts.
