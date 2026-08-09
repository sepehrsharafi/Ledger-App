/** Canonical schema. Kept as one statement block so the DB is created idempotently on boot. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  brand_primary TEXT NOT NULL,
  brand_accent TEXT NOT NULL,
  created_at TEXT NOT NULL,
  top_kpi_label TEXT NOT NULL,
  top_kpi_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  avatar_color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  PRIMARY KEY (project_id, member_id)
);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  current_value REAL NOT NULL,
  previous_value REAL NOT NULL,
  sparkline TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_series (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  month_start TEXT NOT NULL,
  traffic INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend REAL NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS channel_breakdowns (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend REAL NOT NULL DEFAULT 0,
  cost_per_lead REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS timeline_annotations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  annotation_date TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL,
  author TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  label TEXT NOT NULL,
  target_value REAL NOT NULL,
  current_value REAL NOT NULL,
  unit TEXT NOT NULL,
  period TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_value REAL,
  captured_from TEXT NOT NULL,
  assigned_team_member TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_contacted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  budget REAL NOT NULL DEFAULT 0,
  spent REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  owner TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  column_name TEXT NOT NULL,
  assignee TEXT NOT NULL,
  due_date TEXT NOT NULL,
  priority TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  event_date TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  request_type TEXT NOT NULL,
  thumbnail_color TEXT NOT NULL,
  status TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  pros TEXT NOT NULL,
  cons TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS approval_comments (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  included_sections TEXT NOT NULL,
  frequency TEXT NOT NULL,
  internal_review_first INTEGER NOT NULL DEFAULT 1,
  last_sent_at TEXT,
  engagement_stats TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_recipients (
  report_config_id TEXT NOT NULL,
  email TEXT NOT NULL,
  PRIMARY KEY (report_config_id, email)
);

CREATE TABLE IF NOT EXISTS agency_settings (
  id TEXT PRIMARY KEY,
  agency_name TEXT NOT NULL,
  logo_placeholder TEXT NOT NULL,
  notifications TEXT NOT NULL,
  integrations TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_project ON leads (project_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities (lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns (project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_project ON calendar_events (project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_project ON approvals (project_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_approval ON approval_comments (approval_id);
CREATE INDEX IF NOT EXISTS idx_time_series_project ON time_series (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member ON project_members (member_id);
`;
