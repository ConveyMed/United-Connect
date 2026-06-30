-- ============================================
-- ORGANIZATION ACCESS CODE
-- Pre-login gate (src/pages/OrganizationGate.js). Anyone opening the app must enter
-- this code before they can reach login/signup. Admins change it via ManageOrgCode.
-- Run AFTER users.sql (admin write policies reference public.users).
-- Default seed: 00000  (a soft gate / speed bump, not real security — the code is
-- readable with the anon key by design so the gate can validate before auth).
-- ============================================

CREATE TABLE IF NOT EXISTS organization_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE organization_code ENABLE ROW LEVEL SECURITY;

-- Gate is pre-login: anon + authenticated must be able to read the code.
DROP POLICY IF EXISTS "org_code_select" ON organization_code;
CREATE POLICY "org_code_select" ON organization_code
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can set/change the code.
DROP POLICY IF EXISTS "org_code_admin_insert" ON organization_code;
CREATE POLICY "org_code_admin_insert" ON organization_code
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "org_code_admin_update" ON organization_code;
CREATE POLICY "org_code_admin_update" ON organization_code
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Seed the default code once (does nothing if a row already exists).
INSERT INTO organization_code (code)
SELECT '00000'
WHERE NOT EXISTS (SELECT 1 FROM organization_code);
