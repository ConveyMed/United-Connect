-- Product Documentation Table for AI Chat
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS product_docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  source_url TEXT,
  page_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_docs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read access" ON product_docs
  FOR SELECT TO authenticated USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Allow admin full access" ON product_docs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Index for fast product lookup
CREATE INDEX idx_product_docs_name ON product_docs(product_name);

-- Seed data (update content field with actual documentation)
INSERT INTO product_docs (product_name, content, source_url, page_count) VALUES
  ('Remedy Shoulder', 'PLACEHOLDER - Add actual documentation content here', NULL, 1),
  ('BioWash', 'PLACEHOLDER - Add actual documentation content here', NULL, 1),
  ('OsteoFab Technology', 'PLACEHOLDER - Add actual documentation content here', NULL, 1),
  ('Griplasty', 'PLACEHOLDER - Add actual documentation content here', NULL, 1),
  ('U2 Knee MDT', 'PLACEHOLDER - Add actual documentation content here', NULL, 1)
ON CONFLICT (product_name) DO NOTHING;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_product_docs_updated_at
  BEFORE UPDATE ON product_docs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
