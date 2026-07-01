-- Analytics Tables
-- Tracks user activity for ConveyMed Analytics dashboard
-- Run AFTER 01_users.sql (depends on auth.users)

-- ============================================
-- USER SESSIONS
-- Tracks when users log in/out or return from background
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- SCREEN VIEWS
-- Tracks which screens users navigate to
-- ============================================
CREATE TABLE IF NOT EXISTS screen_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  screen_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_screen_views_user_id ON screen_views(user_id);
CREATE INDEX idx_screen_views_screen_name ON screen_views(screen_name);
CREATE INDEX idx_screen_views_created_at ON screen_views(created_at);

ALTER TABLE screen_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own screen views"
  ON screen_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- ASSET EVENTS
-- Tracks clicks/interactions inside expanded Library/Training items
-- event_type: 'view', 'file_click', 'link_click', 'quiz_click', 'download'
-- ============================================
CREATE TABLE IF NOT EXISTS asset_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL,
  asset_name VARCHAR(255),
  category VARCHAR(100),
  category_type VARCHAR(50), -- 'library' or 'training'
  event_type VARCHAR(50) NOT NULL, -- 'view', 'file_click', 'link_click', 'quiz_click'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_asset_events_user_id ON asset_events(user_id);
CREATE INDEX idx_asset_events_asset_id ON asset_events(asset_id);
CREATE INDEX idx_asset_events_event_type ON asset_events(event_type);
CREATE INDEX idx_asset_events_created_at ON asset_events(created_at);

ALTER TABLE asset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own asset events"
  ON asset_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- AI QUERIES
-- Tracks every AI query sent by users
-- ============================================
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  product_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_queries_user_id ON ai_queries(user_id);
CREATE INDEX idx_ai_queries_created_at ON ai_queries(created_at);

ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own AI queries"
  ON ai_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- PROFILE VIEWS
-- Tracks when users view other users' profiles in Directory
-- ============================================
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_user_id ON profile_views(viewed_user_id);
CREATE INDEX idx_profile_views_created_at ON profile_views(created_at);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own profile views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- DIRECTORY SEARCHES
-- Tracks search queries in the Directory
-- ============================================
CREATE TABLE IF NOT EXISTS directory_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query VARCHAR(255) NOT NULL,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_directory_searches_user_id ON directory_searches(user_id);
CREATE INDEX idx_directory_searches_created_at ON directory_searches(created_at);

ALTER TABLE directory_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own directory searches"
  ON directory_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- NOTIFICATION CLICKS
-- Tracks when users tap on notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notification_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL,
  notification_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notification_clicks_user_id ON notification_clicks(user_id);
CREATE INDEX idx_notification_clicks_created_at ON notification_clicks(created_at);

ALTER TABLE notification_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own notification clicks"
  ON notification_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_role bypasses RLS for reads; no SELECT policy needed.

-- ============================================
-- OWNER PROFILES
-- For ConveyMed Analytics site authentication
-- ============================================
CREATE TABLE IF NOT EXISTS owner_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  app_id VARCHAR(100), -- Reference to their Demo app instance
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_owner_profiles_email ON owner_profiles(email);
CREATE INDEX idx_owner_profiles_app_id ON owner_profiles(app_id);

ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;

-- Only service role can manage owner profiles
-- service_role bypasses RLS by default; RLS enabled to deny anon/authenticated access.

-- ============================================
-- HELPFUL VIEWS FOR ANALYTICS QUERIES
-- ============================================

-- Daily active users
CREATE OR REPLACE VIEW daily_active_users
WITH (security_invoker=true) AS
SELECT
  DATE(started_at) as date,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_sessions
FROM user_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Screen popularity
CREATE OR REPLACE VIEW screen_popularity
WITH (security_invoker=true) AS
SELECT
  screen_name,
  COUNT(*) as view_count,
  COUNT(DISTINCT user_id) as unique_users
FROM screen_views
GROUP BY screen_name
ORDER BY view_count DESC;

-- Asset engagement
CREATE OR REPLACE VIEW asset_engagement
WITH (security_invoker=true) AS
SELECT
  asset_name,
  category,
  category_type,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM asset_events
GROUP BY asset_name, category, category_type, event_type
ORDER BY event_count DESC;

-- AI usage
CREATE OR REPLACE VIEW ai_usage
WITH (security_invoker=true) AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as query_count,
  COUNT(DISTINCT user_id) as unique_users
FROM ai_queries
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- AI ANSWER QUALITY COLUMNS
-- Captures confidence + citation flag returned by the ai-chat edge function.
-- Idempotent: safe to re-run on existing DBs.
-- ============================================
ALTER TABLE ai_queries ADD COLUMN IF NOT EXISTS confidence VARCHAR(10);
ALTER TABLE ai_queries ADD COLUMN IF NOT EXISTS has_citation BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_ai_queries_confidence_none
  ON ai_queries(created_at DESC) WHERE confidence = 'none';

-- Unanswered questions feed (confidence='none' = AI couldn't find answer in docs)
CREATE OR REPLACE VIEW ai_unanswered_questions
WITH (security_invoker=true) AS
SELECT
  q.id,
  q.user_id,
  q.query_text,
  q.product_name,
  q.created_at,
  u.email,
  u.first_name,
  u.last_name
FROM ai_queries q
LEFT JOIN public.users u ON u.id = q.user_id
WHERE q.confidence = 'none'
ORDER BY q.created_at DESC;
