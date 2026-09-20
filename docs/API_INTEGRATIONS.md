# API Integrations & Authentication Reference

This guide details the integration protocols, authentication flows, and request/response specifications for the **WebDev AI Studio SEO Intelligence Platform**.

---

## 1. Authentication Protocols

### 1.1 Google Search Console OAuth 2.0 Flow
To connect a user's Google Search Console account:
1. **Initiate Authorization**:
   - `GET /api/seo/providers/gsc/auth-url`
   - Returns `{ success: true, authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }`
   - Configures read-only scope: `https://www.googleapis.com/auth/webmasters.readonly`.
   - Embeds signed state parameter with user session identity.
2. **Handle Callback**:
   - `GET /api/seo/providers/gsc/oauth-callback?code=...&state=...`
   - Server exchanges authorization code for `access_token` and `refresh_token`.
   - Encrypts and stores credentials in SQLite table `seo_provider_connections`.
   - Automatically syncs verified properties list into `seo_provider_properties`.
   - Redirects browser back to Settings.
3. **Automatic Token Refresh**:
   - When an `access_token` is within 5 minutes of expiration, the Google Search Console provider adapter automatically requests a fresh token using the stored `refresh_token`.

### 1.2 Bing Webmaster Tools API Key
1. **Save & Test Key**:
   - `POST /api/seo/bing/config`
   - Body: `{ "apiKey": "YOUR_BING_API_KEY" }`
   - Server queries `https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=...` to validate credentials.
   - Stores key in `seo_provider_connections`.
2. **Disconnect**:
   - `POST /api/seo/bing/disconnect`
   - Deletes Bing connection row for the active user.

### 1.3 Ahrefs Public API Key
1. **Save & Test Key**:
   - `POST /api/seo/ahrefs/config`
   - Body: `{ "apiKey": "YOUR_AHREFS_KEY" }`
   - Server performs a test query against `https://api.ahrefs.com/v3/public/domain-rating?target=example.com`.
   - On success, stores key in `seo_provider_connections`.
2. **Environment Variable Fallback**:
   - If `process.env.AHREFS_API_KEY` is present, it is used as a global system default if no per-user key is configured.

### 1.4 Google PageSpeed Insights API Key
- `POST /api/seo/pagespeed/config`
- Body: `{ "apiKey": "YOUR_PAGESPEED_API_KEY" }`
- Note: PageSpeed Insights works without an API key using Google's shared public quota. A custom key provides higher queries-per-minute limits.

---

## 2. API Endpoints Reference

### 2.1 Provider Registry & Status
- **`GET /api/seo/providers/registry`**
  - Returns array of all registered data sources, capabilities, cost models, and attribution notices.
- **`GET /api/seo/providers/status`**
  - Returns live connectivity status for each provider for the current user session.

### 2.2 Domain Overview
- **`GET /api/seo/overview?domain=example.com`**
  - Aggregates domain health, Ahrefs DR, GSC organic clicks, GSC impressions, and mobile PageSpeed performance into a unified JSON response.
  - Automatically respects the Zero Fake Data standard.

### 2.3 Competitor Comparison
- **`POST /api/seo/competitors/compare`** or **`GET /api/seo/competitors/compare?domain=a.com&competitor=b.com`**
  - Body / Query: `{ "targetDomain": "a.com", "competitorDomain": "b.com" }`
  - Response:
    ```json
    {
      "success": true,
      "comparison": {
        "targetDomain": "a.com",
        "competitorDomain": "b.com",
        "target": {
          "domainRating": { "value": 78, "sourceLabel": "Ahrefs" },
          "pagespeedMobile": { "value": 85 },
          "healthScore": { "value": 92 }
        },
        "competitor": {
          "domainRating": { "value": 72, "sourceLabel": "Ahrefs" },
          "pagespeedMobile": { "value": 79 },
          "healthScore": { "value": 88 }
        },
        "queryGap": { "commonQueries": 0, "targetOnly": 0, "competitorOnly": 0 }
      }
    }
    ```

### 2.4 Google Search Console Analytics
- **`GET /api/seo/gsc/analytics?range=28d&dimension=query`**
  - Query parameters:
    - `range`: `7d`, `28d`, `3m`, `6m`, `12m`
    - `dimension`: `query`, `page`, `country`, `device`
  - Returns clicks, impressions, average CTR, average position, and array of records.

### 2.5 Server Log File Analyzer
- **`POST /api/seo/logs/analyze`**
  - Body: `{ "filename": "access.log", "logContent": "66.249.66.1 - - [18/Sep/2026:12:00:00 +0000] \"GET / HTTP/1.1\" 200 4500 ..." }`
  - Response:
    ```json
    {
      "success": true,
      "logId": "log_1789738357571_zgyd",
      "analysis": {
        "filename": "access.log",
        "totalLines": 500,
        "parsedEntries": 498,
        "metrics": {
          "totalBotHits": 312,
          "nonBotHits": 186,
          "uniqueUrlsCrawled": 85,
          "wastedCrawlEventsCount": 14
        },
        "botDistribution": {
          "Googlebot Desktop": 120,
          "Googlebot Smartphone": 95,
          "Bingbot": 60,
          "GPTBot (OpenAI)": 25,
          "ClaudeBot (Anthropic)": 12
        },
        "statusCodeDistribution": { "200": 460, "301": 24, "404": 12, "500": 2 },
        "topCrawledUrls": [...],
        "wastedCrawlSamples": [...]
      }
    }
    ```
