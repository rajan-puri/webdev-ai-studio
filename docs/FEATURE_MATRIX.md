# SEO Intelligence Feature Matrix

This matrix outlines all features across the 8 SEMrush-style categories in **WebDev AI Studio**, highlighting capability state badges and provider backends.

---

| Category | Sub-Feature | Provider Backend | Capability State | Real Data Assurance |
| :--- | :--- | :--- | :--- | :--- |
| **SEO Dashboard** | Technical Health Score | WebDev Crawler | `AVAILABLE` | Calculated deterministically from crawl signals (0-100) |
| **SEO Dashboard** | Domain Rating (DR) | Ahrefs Public API | `AVAILABLE` | Official logarithmic scale directly from Ahrefs |
| **SEO Dashboard** | 28d Organic Search Clicks | Google Search Console | `CONNECTED_DATA` | Verified first-party Google traffic |
| **SEO Dashboard** | 28d Search Impressions | Google Search Console | `CONNECTED_DATA` | Verified first-party Google visibility |
| **SEO Dashboard** | Mobile Performance Score | PageSpeed Insights | `AVAILABLE` | Lighthouse v12 lab measurement |
| **Competitive Research** | Domain vs Competitor Gap | Multi-Provider Aggregator | `AVAILABLE` | Side-by-side comparison of real metrics |
| **Competitive Research** | Keyword Overlap Gap | Search Console & Future | `CONNECTED_DATA` | Query intersection when verified |
| **Keyword Research** | Search Query Ranking Table | Google Search Console | `CONNECTED_DATA` | Real queries, clicks, CTR, and average position |
| **Keyword Research** | Bing Search Queries | Bing Webmaster Tools | `CONNECTED_DATA` | Verified query rankings on Bing & Yahoo |
| **Keyword Research** | Position Tracking | SQLite Snapshot Store | `CONNECTED_DATA` | Historical tracking of verified Google positions |
| **Keyword Research** | Global Search Volume Database | Semrush / DataForSEO | `COMING_SOON` | Scaffolded interface; no fake estimates shown |
| **Link Intelligence** | Domain Rating Card | Ahrefs Public API | `AVAILABLE` | Strictly labeled "Domain Rating by Ahrefs" |
| **Link Intelligence** | Full Backlink Index Explorer | Semrush / DataForSEO | `COMING_SOON` | Scaffolded interface; clearly marked unactivated |
| **On-Page & Technical** | Recursive BFS Site Crawl | WebDev Crawler | `AVAILABLE` | Up to 1,500 internal pages |
| **On-Page & Technical** | AI Crawler Directive Matrix | WebDev Crawler | `AVAILABLE` | Checks GPTBot, ClaudeBot, PerplexityBot in robots.txt |
| **On-Page & Technical** | 32 Deterministic SEO Issues | WebDev Issue Engine | `AVAILABLE` | Real HTML inspection (titles, canonicals, schema, etc.) |
| **On-Page & Technical** | Server Access Log Analyzer | First-Party Log Parser | `AVAILABLE` | Parses Common/Combined logs; calculates wasted crawl budget |
| **Performance** | Lighthouse Lab Diagnostics | PageSpeed Insights | `AVAILABLE` | Performance, Accessibility, Best Practices, SEO |
| **Performance** | CrUX Real-User Core Web Vitals | Chrome User Experience Report | `AVAILABLE` | Segregated from lab metrics; reports unavailable if low traffic |
| **Content Intelligence** | Headings & Meta Inventory | WebDev Crawler | `AVAILABLE` | H1-H6 hierarchy, missing meta descriptions, word counts |
| **Reports** | Executive PDF Report | Vector Renderer Engine | `AVAILABLE` | Client-ready report with complete data provenance |
| **Reports** | Technical Issues CSV | CSV Generator | `AVAILABLE` | Full spreadsheet of crawl findings |
| **Reports** | Complete Audit JSON | JSON Serializer | `AVAILABLE` | Machine-readable deliverable |

---

## State Badge Legend
- **`AVAILABLE` (Green)**: Works immediately out of the box using first-party engines or free public APIs.
- **`CONNECTED_DATA` (Blue)**: Requires user-authenticated connection (e.g. Google OAuth or Bing API key).
- **`LIMITED` / `ALPHA` (Yellow)**: Functional with known limitations (e.g. Free Ahrefs Public API returning DR only).
- **`COMING_SOON` (Purple)**: Enterprise provider placeholder; clearly marked without displaying synthetic data.
