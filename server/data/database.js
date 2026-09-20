const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'studio.db');

// Ensure directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const db = new Database(DB_PATH);

// Optimize performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    -- Users Table
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

    -- Sessions Table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Projects Table
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

    -- Test History Table
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

    -- Reports Table
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

    -- Screenshots Table
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

    -- Visual Baselines Table
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

    -- SEO Audits Table
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

    -- SEO Crawled Pages Table
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

    -- SEO Issues Table
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

    -- SEO Provider Connections (Google Search Console, Bing, Ahrefs, PageSpeed)
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

    -- SEO Provider Properties (GSC verified sites, Bing sites)
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

    -- SEO Provider Sync Logs
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

    -- Search Console Historical Metrics Snapshot
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

    -- Bing Webmaster Historical Metrics Snapshot
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

    -- SEO Provider Cache Table
    CREATE TABLE IF NOT EXISTS seo_provider_cache (
      cache_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      data_json TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- SEO Competitors Table
    CREATE TABLE IF NOT EXISTS seo_competitors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      target_domain TEXT NOT NULL,
      competitor_domain TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- SEO Access Log File Analyses Table
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

    -- Performance Indexes
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
    CREATE INDEX IF NOT EXISTS idx_seo_pages_url ON seo_pages(audit_id, url);
    CREATE INDEX IF NOT EXISTS idx_seo_issues_audit ON seo_issues(audit_id);
    CREATE INDEX IF NOT EXISTS idx_seo_conn_user ON seo_provider_connections(user_id, provider);
    CREATE INDEX IF NOT EXISTS idx_seo_props_user ON seo_provider_properties(user_id, provider);
    CREATE INDEX IF NOT EXISTS idx_seo_props_selected ON seo_provider_properties(user_id, is_selected);
    CREATE INDEX IF NOT EXISTS idx_seo_gsc_user_date ON seo_search_console_metrics(user_id, property_id, metric_date);
    CREATE INDEX IF NOT EXISTS idx_seo_bing_user_date ON seo_bing_metrics(user_id, property_id, metric_date);
    CREATE INDEX IF NOT EXISTS idx_seo_cache_expires ON seo_provider_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_seo_comp_user ON seo_competitors(user_id);
      CREATE INDEX IF NOT EXISTS idx_seo_logs_user ON seo_log_analyses(user_id);

    -- =======================================================
    -- DESIGN -> CODE STUDIO TABLES
    -- =======================================================

    -- Design Projects
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

    -- Design Sources (Uploaded Screenshot or Figma URL reference)
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

    -- Design Intermediate Representation Analyses
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

    -- Design Code Generations
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

    -- Generated Multi-File Output (HTML, Components, Styles, Configs)
    CREATE TABLE IF NOT EXISTS design_files (
      id TEXT PRIMARY KEY,
      generation_id TEXT NOT NULL REFERENCES design_generations(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_content TEXT NOT NULL,
      file_type TEXT NOT NULL, -- 'markup', 'style', 'script', 'component', 'config'
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- AI Refinement Revisions
    CREATE TABLE IF NOT EXISTS design_revisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      generation_id TEXT NOT NULL REFERENCES design_generations(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      patch_json TEXT NOT NULL,
      summary TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Visual Comparisons (Playwright render vs Original Screenshot/Figma)
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

    -- Design Studio Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_design_proj_user ON design_projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_design_sources_user ON design_sources(user_id);
    CREATE INDEX IF NOT EXISTS idx_design_sources_proj ON design_sources(design_project_id);
    CREATE INDEX IF NOT EXISTS idx_design_analyses_src ON design_analyses(source_id);
    CREATE INDEX IF NOT EXISTS idx_design_analyses_user ON design_analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_design_gen_user ON design_generations(user_id);
    CREATE INDEX IF NOT EXISTS idx_design_gen_analysis ON design_generations(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_design_files_gen ON design_files(generation_id);
    CREATE INDEX IF NOT EXISTS idx_design_rev_gen ON design_revisions(generation_id);
    -- =======================================================
    -- SCHEMA GENERATOR WORKSPACE TABLES
    -- =======================================================
    CREATE TABLE IF NOT EXISTS saved_schemas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      schema_type TEXT NOT NULL,
      source_url TEXT,
      facts_json TEXT NOT NULL DEFAULT '{}',
      jsonld_output TEXT NOT NULL,
      validation_summary TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_saved_schemas_user ON saved_schemas(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_schemas_created ON saved_schemas(created_at);

    -- =======================================================
    -- ACF ARCHITECT WORKSPACE TABLES
    -- =======================================================
    CREATE TABLE IF NOT EXISTS saved_acf_architectures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      architecture_key TEXT NOT NULL,
      architecture_json TEXT NOT NULL,
      acf_json_output TEXT,
      php_registration_output TEXT,
      php_template_output TEXT,
      validation_summary TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_saved_acf_user ON saved_acf_architectures(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_acf_created ON saved_acf_architectures(created_at);

    -- =======================================================
    -- ARCHITECTURE GRAPH & CONTEXT GRAPH TABLES
    -- =======================================================
    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      subsystem TEXT NOT NULL,
      file_path TEXT,
      loc_start INTEGER,
      loc_end INTEGER,
      loc_count INTEGER DEFAULT 0,
      hash TEXT,
      degree_in INTEGER DEFAULT 0,
      degree_out INTEGER DEFAULT 0,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      source_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provenance TEXT NOT NULL DEFAULT 'EXTRACTED',
      confidence REAL DEFAULT 1.0,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graph_indexes (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      file_path TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_mtime REAL NOT NULL,
      node_count INTEGER DEFAULT 0,
      edge_count INTEGER DEFAULT 0,
      last_indexed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graph_ai_queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      query_text TEXT NOT NULL,
      target_nodes_json TEXT DEFAULT '[]',
      retrieval_strategy TEXT NOT NULL,
      token_budget INTEGER DEFAULT 8000,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      baseline_input_tokens INTEGER,
      token_reduction_percent REAL,
      response_text TEXT,
      latency_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_graph_nodes_proj ON graph_nodes(project_id);
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_subsystem ON graph_nodes(subsystem);
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_file ON graph_nodes(file_path);

    CREATE INDEX IF NOT EXISTS idx_graph_edges_proj ON graph_edges(project_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON graph_edges(type);

    CREATE INDEX IF NOT EXISTS idx_graph_indexes_proj_file ON graph_indexes(project_id, file_path);
    CREATE INDEX IF NOT EXISTS idx_graph_ai_queries_user ON graph_ai_queries(user_id);
    CREATE INDEX IF NOT EXISTS idx_graph_ai_queries_created ON graph_ai_queries(created_at);
  `);

  // Seed default demo user if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password123', salt);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, avatar_url, auth_provider)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'user_demo',
      'demo@webdev.ai',
      hash,
      'WebDev Developer',
      'https://api.dicebear.com/7.x/bottts/svg?seed=webdev',
      'local'
    );
    console.log('[database] Initialized studio.db with demo user (demo@webdev.ai / password123)');
  }
}

initSchema();

module.exports = {
  db,
  getDb: () => db
};
