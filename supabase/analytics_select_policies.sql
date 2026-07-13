-- Analytics dashboard SELECT policies
-- The in-app analytics dashboard (/manage-analytics) reads these tables client-side
-- with the anon key + the logged-in user's session. Without SELECT policies, RLS
-- returns zero rows for everyone and the whole dashboard shows empty.
-- Mirrors the policies that exist in demo's database. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'Admins and owners can view all sessions') THEN
    CREATE POLICY "Admins and owners can view all sessions"
      ON user_sessions FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'screen_views' AND policyname = 'Admins and owners can view all screen views') THEN
    CREATE POLICY "Admins and owners can view all screen views"
      ON screen_views FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_events' AND policyname = 'Admins and owners can view all asset events') THEN
    CREATE POLICY "Admins and owners can view all asset events"
      ON asset_events FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_queries' AND policyname = 'Admins and owners can view all AI queries') THEN
    CREATE POLICY "Admins and owners can view all AI queries"
      ON ai_queries FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_views' AND policyname = 'Admins and owners can view all profile views') THEN
    CREATE POLICY "Admins and owners can view all profile views"
      ON profile_views FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'directory_searches' AND policyname = 'Admins and owners can view all directory searches') THEN
    CREATE POLICY "Admins and owners can view all directory searches"
      ON directory_searches FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_clicks' AND policyname = 'Admins and owners can view all notification clicks') THEN
    CREATE POLICY "Admins and owners can view all notification clicks"
      ON notification_clicks FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.is_admin OR users.is_owner)));
  END IF;
END $$;
