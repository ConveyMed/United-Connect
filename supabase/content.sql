-- ============================================
-- CONTENT SCHEMA - Library & Training
-- ============================================
-- Tables:
--   - content_categories: Categories for organizing content
--   - content_items: Individual content pieces (files, links, etc.)
--
-- Both Library and Training use the same structure
-- Differentiated by 'type' field: 'library' or 'training'
-- ============================================

-- Categories table
CREATE TABLE IF NOT EXISTS content_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('library', 'training')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content items table
CREATE TABLE IF NOT EXISTS content_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES content_categories(id) ON DELETE CASCADE, -- Nullable for multi-category support
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  external_link TEXT,
  external_link_label VARCHAR(255),
  quiz_link TEXT,
  quiz_link_label VARCHAR(255),
  is_downloadable BOOLEAN DEFAULT true,
  use_company_logo BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User downloads tracking
CREATE TABLE IF NOT EXISTS content_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_categories_type ON content_categories(type);
CREATE INDEX IF NOT EXISTS idx_content_categories_sort ON content_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category_id);
CREATE INDEX IF NOT EXISTS idx_content_items_sort ON content_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_content_downloads_user ON content_downloads(user_id);

-- Enable RLS
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active categories" ON content_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON content_categories;
DROP POLICY IF EXISTS "Anyone can view active content" ON content_items;
DROP POLICY IF EXISTS "Admins can manage content" ON content_items;
DROP POLICY IF EXISTS "Users can view their downloads" ON content_downloads;
DROP POLICY IF EXISTS "Users can track downloads" ON content_downloads;
DROP POLICY IF EXISTS "Users can remove downloads" ON content_downloads;

-- Categories policies
CREATE POLICY "Anyone can view active categories" ON content_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can insert categories" ON content_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

CREATE POLICY "Admins can update categories" ON content_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

CREATE POLICY "Admins can delete categories" ON content_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Content items policies
CREATE POLICY "Anyone can view active content" ON content_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can insert content" ON content_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

CREATE POLICY "Admins can update content" ON content_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

CREATE POLICY "Admins can delete content" ON content_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Downloads policies
CREATE POLICY "Users can view their downloads" ON content_downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can track downloads" ON content_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove downloads" ON content_downloads
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_category_timestamp ON content_categories;
CREATE TRIGGER trigger_update_category_timestamp
BEFORE UPDATE ON content_categories
FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

DROP TRIGGER IF EXISTS trigger_update_content_timestamp ON content_items;
CREATE TRIGGER trigger_update_content_timestamp
BEFORE UPDATE ON content_items
FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

-- ============================================
-- MULTI-CATEGORY SUPPORT (Junction Table)
-- ============================================
-- Allows content items to belong to multiple categories

CREATE TABLE IF NOT EXISTS content_item_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES content_categories(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, category_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_item_categories_content ON content_item_categories(content_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_category ON content_item_categories(category_id);

-- Enable RLS
ALTER TABLE content_item_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view item categories" ON content_item_categories;
DROP POLICY IF EXISTS "Admins can insert item categories" ON content_item_categories;
DROP POLICY IF EXISTS "Admins can update item categories" ON content_item_categories;
DROP POLICY IF EXISTS "Admins can delete item categories" ON content_item_categories;

-- RLS policies for junction table
CREATE POLICY "Anyone can view item categories" ON content_item_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert item categories" ON content_item_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

CREATE POLICY "Admins can update item categories" ON content_item_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

CREATE POLICY "Admins can delete item categories" ON content_item_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );
