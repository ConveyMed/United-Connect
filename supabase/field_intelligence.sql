-- ============================================================================
-- FIELD INTEL — CONSOLIDATED DAY-1 SCHEMA BUNDLE
-- ============================================================================
-- This is the single, consolidated, end-state schema for the "Field Intel"
-- feature. It merges the original base schema plus every Field Intel migration
-- (through Phase 16 / Jun 2026) into ONE idempotent bundle, deduplicated so that
-- only the FINAL version of each table, column, function, trigger, and policy is
-- emitted (superseded definitions are dropped, not re-applied).
--
-- IDEMPOTENT + EMPTY-DB SAFE:
--   Safe to run on a brand-new (empty) Supabase project AND safe to re-run on an
--   existing one. Uses CREATE TABLE/INDEX IF NOT EXISTS, CREATE OR REPLACE
--   FUNCTION, ADD COLUMN IF NOT EXISTS, and DROP ... IF EXISTS before each
--   trigger / policy (re)create.
--
-- PREREQUISITES — run these template bundles FIRST (this file ALTERs / FKs to them
-- and does NOT redefine them):
--   * users.sql                       -> public.users  (id, is_admin, is_owner)
--   * app_settings.sql                -> public.app_settings (key/value/description)
--   * notification_preferences.sql    -> public.user_notification_preferences
--   * Supabase auth schema (auth.users) — standard on every project.
--
-- OPTIONAL (for the daily-summary push only):
--   * pg_cron + pg_net extensions must be enabled.
--   * GUCs app.settings.supabase_url and app.settings.service_role_key must be
--     set for the cron job to build its request. If absent / extensions missing,
--     the cron block raises a NOTICE and the rest of the bundle still applies.
--
-- FRONTEND STAYS DARK: provisioning this schema does NOT light up the UI. The
-- Field Intel surface is gated by ENABLE_FIELD_INTEL in src/config/features.js
-- (default false). A developer flips that flag when a client buys the feature.
-- ============================================================================


-- ===== EXTENSIONS =====
-- gen_random_uuid() is in core Postgres 13+, but ensure pgcrypto for safety.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pg_cron + pg_net are only needed for the daily-summary cron job at the bottom
-- of this file; they are (re)created inside that guarded DO block so a project
-- without them still applies the rest of this bundle cleanly.


-- ===== TABLES =====

-- 1. Regions
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 2. Surgeons / accounts (core data from CSV imports)
CREATE TABLE IF NOT EXISTS surgeons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Blue fields (from procedure database)
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  npi TEXT,
  site_of_care TEXT,
  hospital TEXT,
  specialty TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,                       -- text to preserve leading zeros
  phone TEXT,
  email TEXT,
  fax TEXT,
  -- Procedure data
  cpt_code TEXT,
  cpt_description TEXT,
  annual_volume INTEGER,
  -- Yellow fields (market intelligence)
  device_price NUMERIC(10,2),
  market_opportunity NUMERIC(12,2),   -- auto-calc: annual_volume * device_price
  competitor_products TEXT,
  contract_status TEXT,
  buying_stage TEXT,
  forecast_close_date DATE,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_surgeons_npi ON surgeons(npi);
CREATE INDEX IF NOT EXISTS idx_surgeons_last_name ON surgeons(last_name);
CREATE INDEX IF NOT EXISTS idx_surgeons_state ON surgeons(state);
ALTER TABLE surgeons ENABLE ROW LEVEL SECURITY;

-- 3. Surgeon-to-region mapping
CREATE TABLE IF NOT EXISTS surgeon_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, region_id)
);
ALTER TABLE surgeon_regions ENABLE ROW LEVEL SECURITY;

-- 4. Hierarchy assignments (reporting structure + region coverage)
CREATE TABLE IF NOT EXISTS hierarchy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_tier TEXT NOT NULL CHECK (role_tier IN ('rep', 'manager', 'vp')),
  parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  custom_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hierarchy_user ON hierarchy_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON hierarchy_assignments(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_region ON hierarchy_assignments(region_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_role ON hierarchy_assignments(role_tier);
ALTER TABLE hierarchy_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Account delegations (which accounts assigned to which user)
--    NOTE: the canonical column is user_id. An early migration experimented with
--    a "delegated_to" column; the final schema (fix_delegated_to_column.sql /
--    fix_hierarchy_removal_trigger.sql) standardized back to user_id.
CREATE TABLE IF NOT EXISTS account_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_delegations_surgeon ON account_delegations(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_delegations_user ON account_delegations(user_id);
ALTER TABLE account_delegations ENABLE ROW LEVEL SECURITY;

-- 6. Call logs (linked to accounts, not users — data persists when people leave)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT,
  buying_stage_update TEXT,
  contract_status_update TEXT,
  forecast_close_date_update DATE,
  competitor_update TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_logs_surgeon ON call_logs(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date);
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- 7. Leads (also stores change requests — see ADDED COLUMNS section)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  city TEXT,
  state TEXT,
  specialty TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  surgeon_id UUID REFERENCES surgeons(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 8. Physician profiles (cached AI summaries)
CREATE TABLE IF NOT EXISTS physician_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  medical_school TEXT,
  residency TEXT,
  fellowship TEXT,
  research_interests TEXT,
  publications TEXT,
  healthgrades_score TEXT,
  news_pr TEXT,
  source TEXT DEFAULT 'gemini',
  generated_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_physician_profiles_surgeon ON physician_profiles(surgeon_id);
ALTER TABLE physician_profiles ENABLE ROW LEVEL SECURITY;

-- 9. Custom fields (admin-defined per app)
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'dropdown', 'date', 'currency')),
  dropdown_options JSONB,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- 10. Custom field values (per surgeon per field)
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, field_id)
);
CREATE INDEX IF NOT EXISTS idx_cfv_surgeon ON custom_field_values(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_cfv_field ON custom_field_values(field_id);
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- 11. Surgeon CPT data (Phase 16 — multiple CPT codes per surgeon)
CREATE TABLE IF NOT EXISTS surgeon_cpt_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgeon_id UUID NOT NULL REFERENCES surgeons(id) ON DELETE CASCADE,
  cpt_code TEXT NOT NULL,
  cpt_description TEXT,
  annual_volume INTEGER,
  site_of_care TEXT,
  last_refreshed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surgeon_id, cpt_code)
);
CREATE INDEX IF NOT EXISTS idx_surgeon_cpt_surgeon ON surgeon_cpt_data(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgeon_cpt_code ON surgeon_cpt_data(cpt_code);
ALTER TABLE surgeon_cpt_data ENABLE ROW LEVEL SECURITY;

-- 12. CPT prices (Phase 16 — one average price per CPT code)
CREATE TABLE IF NOT EXISTS cpt_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpt_code TEXT NOT NULL UNIQUE,
  cpt_description TEXT,
  average_price NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cpt_prices ENABLE ROW LEVEL SECURITY;

-- 13. Call-log read-state tracking (per-user "I have read this call_log")
CREATE TABLE IF NOT EXISTS public.field_intel_notification_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_log_id UUID NOT NULL REFERENCES public.call_logs(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, call_log_id)
);
CREATE INDEX IF NOT EXISTS field_intel_notification_reads_user_idx
  ON public.field_intel_notification_reads (user_id);
ALTER TABLE public.field_intel_notification_reads ENABLE ROW LEVEL SECURITY;

-- 14. Edge-function error logs (diagnostics for the intel edge functions)
CREATE TABLE IF NOT EXISTS function_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  stage text,
  error_message text,
  error_stack text,
  request_origin text,
  user_agent text,
  client_platform text,
  request_body jsonb,
  upstream_status int,
  upstream_body text,
  extra jsonb
);
CREATE INDEX IF NOT EXISTS function_error_logs_created_at_idx ON function_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS function_error_logs_function_name_idx ON function_error_logs (function_name, created_at DESC);
ALTER TABLE function_error_logs ENABLE ROW LEVEL SECURITY;


-- ===== ADDED COLUMNS =====
-- Columns introduced by later migrations, folded into the end state. All use
-- ADD COLUMN IF NOT EXISTS so they no-op on the fresh tables created above.

-- leads: distinguish new leads from change requests + store proposed changes.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'new_lead'
  CHECK (type IN ('new_lead', 'change_request'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS requested_changes JSONB;
CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(type);

-- user_notification_preferences: per-user call-log push cadence.
-- NOTE: user_notification_preferences is a SHARED table created by
-- notification_preferences.sql (a prerequisite). We only ADD this column.
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS call_log_notification_preference TEXT
    NOT NULL
    DEFAULT 'off'
    CHECK (call_log_notification_preference IN ('off', 'daily_summary', 'per_log'));
CREATE INDEX IF NOT EXISTS user_notification_preferences_call_log_pref_idx
  ON public.user_notification_preferences (call_log_notification_preference)
  WHERE call_log_notification_preference <> 'off';
COMMENT ON COLUMN public.user_notification_preferences.call_log_notification_preference IS
  'Per-user setting for Field Intel call_log push notifications. off | daily_summary | per_log.';


-- ===== FUNCTIONS =====
-- All CREATE OR REPLACE. Only the FINAL version of each is emitted; superseded
-- variants (e.g. the delegated_to-based visible_surgeon_ids, the BEFORE-trigger
-- handle_hierarchy_removal) are intentionally omitted.

-- Market opportunity auto-calculation (trigger fn for surgeons).
CREATE OR REPLACE FUNCTION calc_market_opportunity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.annual_volume IS NOT NULL AND NEW.device_price IS NOT NULL THEN
    NEW.market_opportunity := NEW.annual_volume * NEW.device_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic updated_at touch (trigger fn shared by many tables).
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Field intel role for a user (hierarchy tier, else 'admin' if is_admin).
CREATE OR REPLACE FUNCTION get_field_intel_role(uid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role_tier FROM hierarchy_assignments WHERE user_id = uid LIMIT 1),
    CASE WHEN (SELECT is_admin FROM users WHERE id = uid) THEN 'admin' ELSE NULL END
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Is this user a field intel admin?
CREATE OR REPLACE FUNCTION is_field_intel_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM users WHERE id = uid), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- All surgeon IDs visible to a user, by role tier.
-- FINAL version (account_delegations.user_id based — fix_delegated_to_column.sql).
CREATE OR REPLACE FUNCTION visible_surgeon_ids(uid UUID)
RETURNS SETOF UUID AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Admin sees everything
  IF is_field_intel_admin(uid) THEN
    RETURN QUERY SELECT id FROM surgeons;
    RETURN;
  END IF;

  SELECT role_tier INTO user_role FROM hierarchy_assignments WHERE user_id = uid LIMIT 1;

  IF user_role = 'vp' THEN
    -- VP sees all accounts in their region(s)
    RETURN QUERY
      SELECT sr.surgeon_id FROM surgeon_regions sr
      JOIN hierarchy_assignments ha ON ha.region_id = sr.region_id
      WHERE ha.user_id = uid AND ha.role_tier = 'vp';
  ELSIF user_role = 'manager' THEN
    -- Manager sees accounts delegated to them + accounts delegated to their reps
    RETURN QUERY
      SELECT ad.surgeon_id FROM account_delegations ad
      WHERE ad.user_id = uid
      UNION
      SELECT ad.surgeon_id FROM account_delegations ad
      JOIN hierarchy_assignments ha ON ha.user_id = ad.user_id AND ha.role_tier = 'rep'
      WHERE ha.parent_user_id = uid;
  ELSIF user_role = 'rep' THEN
    -- Rep sees only accounts delegated to them
    RETURN QUERY
      SELECT ad.surgeon_id FROM account_delegations ad WHERE ad.user_id = uid;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Surgeons visible to the CURRENT user via their downstream hierarchy tree.
-- Used by the tightened call_logs / surgeons UPDATE policies.
CREATE OR REPLACE FUNCTION public.my_visible_surgeons()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH RECURSIVE my_tree AS (
    SELECT auth.uid() AS user_id
    UNION
    SELECT ha.user_id
    FROM public.hierarchy_assignments ha
    JOIN my_tree t ON ha.parent_user_id = t.user_id
  )
  SELECT DISTINCT ad.surgeon_id
  FROM public.account_delegations ad
  WHERE ad.user_id IN (SELECT user_id FROM my_tree);
$$;
GRANT EXECUTE ON FUNCTION public.my_visible_surgeons() TO authenticated;

-- Departure handling: clean up delegations / unlink reports when a user is fully
-- removed from the hierarchy. FINAL version (AFTER trigger, user_id based,
-- guarded by a "no remaining hierarchy rows" check — fix_hierarchy_removal_trigger.sql).
CREATE OR REPLACE FUNCTION handle_hierarchy_removal()
RETURNS TRIGGER AS $$
DECLARE
  remaining_rows INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_rows
  FROM hierarchy_assignments
  WHERE user_id = OLD.user_id AND id != OLD.id;

  IF remaining_rows = 0 THEN
    DELETE FROM account_delegations WHERE user_id = OLD.user_id;
  END IF;

  IF OLD.role_tier = 'manager' AND remaining_rows = 0 THEN
    UPDATE hierarchy_assignments SET parent_user_id = NULL
    WHERE parent_user_id = OLD.user_id AND role_tier = 'rep';
  END IF;

  IF OLD.role_tier = 'vp' AND remaining_rows = 0 THEN
    UPDATE hierarchy_assignments SET parent_user_id = NULL
    WHERE parent_user_id = OLD.user_id AND role_tier = 'manager';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- RPC: mark a single call_log as read for the calling user.
CREATE OR REPLACE FUNCTION public.mark_call_log_read(p_call_log_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.field_intel_notification_reads (user_id, call_log_id)
  VALUES (auth.uid(), p_call_log_id)
  ON CONFLICT (user_id, call_log_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_call_log_read(UUID) TO authenticated;

-- RPC: mark all currently-unread call_logs as read for the calling user.
CREATE OR REPLACE FUNCTION public.mark_all_call_logs_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH inserted AS (
    INSERT INTO public.field_intel_notification_reads (user_id, call_log_id)
    SELECT auth.uid(), cl.id
    FROM public.call_logs cl
    WHERE cl.user_id <> auth.uid()
      AND NOT EXISTS (
        SELECT 1
        FROM public.field_intel_notification_reads r
        WHERE r.user_id = auth.uid() AND r.call_log_id = cl.id
      )
    ON CONFLICT (user_id, call_log_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN COALESCE(v_count, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_call_logs_read() TO authenticated;


-- ===== RLS POLICIES =====
-- Only the FINAL effective policy set is emitted. Where Phase 16 opened a table
-- to universal read (USING true), the earlier scoped SELECT policy is omitted.

-- SURGEONS — universal read (Phase 16 "universal dossier"); admin writes;
-- delegated users may update their assigned surgeons.
DROP POLICY IF EXISTS "surgeons_select" ON surgeons;
CREATE POLICY "surgeons_select" ON surgeons FOR SELECT USING (true);

DROP POLICY IF EXISTS "surgeons_admin_insert" ON surgeons;
CREATE POLICY "surgeons_admin_insert" ON surgeons FOR INSERT
  WITH CHECK (is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "surgeons_admin_update" ON surgeons;
CREATE POLICY "surgeons_admin_update" ON surgeons FOR UPDATE
  USING (is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "surgeons_admin_delete" ON surgeons;
CREATE POLICY "surgeons_admin_delete" ON surgeons FOR DELETE
  USING (is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS surgeons_assigned_update ON public.surgeons;
CREATE POLICY surgeons_assigned_update ON public.surgeons FOR UPDATE
  USING (id IN (SELECT public.my_visible_surgeons()))
  WITH CHECK (id IN (SELECT public.my_visible_surgeons()));

-- REGIONS — everyone reads, admin modifies.
DROP POLICY IF EXISTS "regions_select" ON regions;
CREATE POLICY "regions_select" ON regions FOR SELECT USING (true);

DROP POLICY IF EXISTS "regions_admin_all" ON regions;
CREATE POLICY "regions_admin_all" ON regions FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- SURGEON_REGIONS — follow surgeon visibility, admin modifies.
DROP POLICY IF EXISTS "surgeon_regions_select" ON surgeon_regions;
CREATE POLICY "surgeon_regions_select" ON surgeon_regions FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "surgeon_regions_admin" ON surgeon_regions;
CREATE POLICY "surgeon_regions_admin" ON surgeon_regions FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- HIERARCHY_ASSIGNMENTS — own / parent / admin reads, admin manages.
DROP POLICY IF EXISTS "hierarchy_select" ON hierarchy_assignments;
CREATE POLICY "hierarchy_select" ON hierarchy_assignments FOR SELECT
  USING (user_id = auth.uid() OR parent_user_id = auth.uid() OR is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "hierarchy_admin" ON hierarchy_assignments;
CREATE POLICY "hierarchy_admin" ON hierarchy_assignments FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- ACCOUNT_DELEGATIONS — follow surgeon visibility; admin/delegator/manager+vp manage.
DROP POLICY IF EXISTS "delegations_select" ON account_delegations;
CREATE POLICY "delegations_select" ON account_delegations FOR SELECT
  USING (surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

DROP POLICY IF EXISTS "delegations_manage" ON account_delegations;
CREATE POLICY "delegations_manage" ON account_delegations FOR ALL
  USING (
    is_field_intel_admin(auth.uid())
    OR delegated_by = auth.uid()
    OR (SELECT role_tier FROM hierarchy_assignments WHERE user_id = auth.uid() LIMIT 1) IN ('vp', 'manager')
  );

-- CALL_LOGS — universal read (Phase 16); author inserts for visible surgeons.
DROP POLICY IF EXISTS "call_logs_select" ON call_logs;
DROP POLICY IF EXISTS call_logs_select ON public.call_logs;
CREATE POLICY "call_logs_select" ON call_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "call_logs_insert" ON call_logs;
CREATE POLICY "call_logs_insert" ON call_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND surgeon_id IN (SELECT visible_surgeon_ids(auth.uid())));

-- LEADS — submitter / admin reads, submitter inserts, admin updates.
DROP POLICY IF EXISTS "leads_select" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT
  USING (submitted_by = auth.uid() OR is_field_intel_admin(auth.uid()));

DROP POLICY IF EXISTS "leads_insert" ON leads;
CREATE POLICY "leads_insert" ON leads FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "leads_admin_update" ON leads;
CREATE POLICY "leads_admin_update" ON leads FOR UPDATE
  USING (is_field_intel_admin(auth.uid()));

-- PHYSICIAN_PROFILES — universal read; service role manages (edge function writes).
DROP POLICY IF EXISTS "profiles_select" ON physician_profiles;
DROP POLICY IF EXISTS "profiles_upsert" ON physician_profiles;
DROP POLICY IF EXISTS "Users can view physician profiles" ON physician_profiles;
DROP POLICY IF EXISTS "physician_profiles_select" ON physician_profiles;
CREATE POLICY "physician_profiles_select" ON physician_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage physician profiles" ON physician_profiles;
CREATE POLICY "Service role can manage physician profiles" ON physician_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- CUSTOM_FIELDS — everyone reads, admin modifies.
DROP POLICY IF EXISTS "custom_fields_select" ON custom_fields;
CREATE POLICY "custom_fields_select" ON custom_fields FOR SELECT USING (true);

DROP POLICY IF EXISTS "custom_fields_admin" ON custom_fields;
CREATE POLICY "custom_fields_admin" ON custom_fields FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- CUSTOM_FIELD_VALUES — universal read (Phase 16); admin manages.
DROP POLICY IF EXISTS "cfv_select" ON custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_select" ON custom_field_values;
CREATE POLICY "custom_field_values_select" ON custom_field_values FOR SELECT USING (true);

DROP POLICY IF EXISTS "cfv_admin" ON custom_field_values;
CREATE POLICY "cfv_admin" ON custom_field_values FOR ALL
  USING (is_field_intel_admin(auth.uid()));

-- SURGEON_CPT_DATA — everyone reads, admin/owner manages.
DROP POLICY IF EXISTS "surgeon_cpt_data_select" ON surgeon_cpt_data;
CREATE POLICY "surgeon_cpt_data_select" ON surgeon_cpt_data FOR SELECT USING (true);

DROP POLICY IF EXISTS "surgeon_cpt_data_admin" ON surgeon_cpt_data;
CREATE POLICY "surgeon_cpt_data_admin" ON surgeon_cpt_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- CPT_PRICES — everyone reads, admin/owner manages.
DROP POLICY IF EXISTS "cpt_prices_select" ON cpt_prices;
CREATE POLICY "cpt_prices_select" ON cpt_prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "cpt_prices_admin" ON cpt_prices;
CREATE POLICY "cpt_prices_admin" ON cpt_prices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- FIELD_INTEL_NOTIFICATION_READS — users see/insert only their own reads.
DROP POLICY IF EXISTS field_intel_reads_select ON public.field_intel_notification_reads;
CREATE POLICY field_intel_reads_select ON public.field_intel_notification_reads
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS field_intel_reads_insert ON public.field_intel_notification_reads;
CREATE POLICY field_intel_reads_insert ON public.field_intel_notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FUNCTION_ERROR_LOGS — service role full access, authenticated read-only.
DROP POLICY IF EXISTS "service role full access" ON function_error_logs;
CREATE POLICY "service role full access" ON function_error_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated can read" ON function_error_logs;
CREATE POLICY "authenticated can read" ON function_error_logs
  FOR SELECT TO authenticated USING (true);


-- ===== TRIGGERS =====
-- All DROP IF EXISTS then CREATE for idempotency.

-- Surgeons: market opportunity auto-calc.
DROP TRIGGER IF EXISTS trigger_calc_market_opportunity ON surgeons;
CREATE TRIGGER trigger_calc_market_opportunity
  BEFORE INSERT OR UPDATE OF annual_volume, device_price ON surgeons
  FOR EACH ROW EXECUTE FUNCTION calc_market_opportunity();

-- updated_at touch triggers.
DROP TRIGGER IF EXISTS trigger_surgeons_updated ON surgeons;
CREATE TRIGGER trigger_surgeons_updated
  BEFORE UPDATE ON surgeons FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_regions_updated ON regions;
CREATE TRIGGER trigger_regions_updated
  BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_hierarchy_updated ON hierarchy_assignments;
CREATE TRIGGER trigger_hierarchy_updated
  BEFORE UPDATE ON hierarchy_assignments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_leads_updated ON leads;
CREATE TRIGGER trigger_leads_updated
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_physician_profiles_updated ON physician_profiles;
CREATE TRIGGER trigger_physician_profiles_updated
  BEFORE UPDATE ON physician_profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS set_surgeon_cpt_data_updated_at ON surgeon_cpt_data;
CREATE TRIGGER set_surgeon_cpt_data_updated_at
  BEFORE UPDATE ON surgeon_cpt_data FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS set_cpt_prices_updated_at ON cpt_prices;
CREATE TRIGGER set_cpt_prices_updated_at
  BEFORE UPDATE ON cpt_prices FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Departure handling: FINAL = AFTER DELETE (fix_hierarchy_removal_trigger.sql).
DROP TRIGGER IF EXISTS trigger_hierarchy_removal ON hierarchy_assignments;
CREATE TRIGGER trigger_hierarchy_removal
  AFTER DELETE ON hierarchy_assignments
  FOR EACH ROW EXECUTE FUNCTION handle_hierarchy_removal();


-- ===== CRON: DAILY SUMMARY PUSH =====
-- Schedules the send-daily-summary-push edge function hourly at minute 0; the
-- function itself only fires for users whose local time is 8 AM.
--
-- REQUIRES pg_cron + pg_net enabled. The request URL + bearer key are read from
-- the GUCs app.settings.supabase_url and app.settings.service_role_key — set
-- these per-project (Supabase Dashboard > Project Settings, or ALTER DATABASE
-- ... SET) BEFORE this job can succeed. If extensions or GUCs are missing the
-- block raises a NOTICE and the rest of this bundle still applies cleanly.
--
-- NOTE: no project-specific URL or key is hardcoded here — both come from GUCs.
-- If your project does not use those GUCs, schedule the job manually with the
-- project's real Functions URL + service_role key.
DO $$
DECLARE
  v_project_url TEXT := current_setting('app.settings.supabase_url', true);
  v_service_key TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;

  -- Re-runnable: drop any existing job with the same name first.
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname = 'field_intel_daily_summary_push';

  PERFORM cron.schedule(
    'field_intel_daily_summary_push',
    '0 * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      v_project_url || '/functions/v1/send-daily-summary-push',
      v_service_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule field_intel_daily_summary_push (likely missing pg_cron/pg_net or app.settings GUCs). Configure manually via Supabase dashboard if needed. Error: %', SQLERRM;
END $$;


-- ===== SEED ROWS =====
-- app_settings is a SHARED prerequisite table; only INSERT the Field Intel toggle.
-- NOTE: this DB-side flag is legacy/independent of the frontend ENABLE_FIELD_INTEL
-- code flag in src/config/features.js, which is the real gate for the UI.
INSERT INTO app_settings (key, value, description)
VALUES ('show_field_intel', '"true"', 'Show or hide Customer/Field Intel module')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- END OF FIELD INTEL CONSOLIDATED BUNDLE
-- ============================================================================
