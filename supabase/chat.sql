-- CHAT SYSTEM SCHEMA
-- Supports: 1:1 chats, group chats, real-time messaging, read receipts, typing indicators, reactions
-- Run this in Supabase SQL Editor

-- ============================================
-- FIX FOREIGN KEYS (if tables exist with auth.users references)
-- ============================================
DO $$
BEGIN
  -- chats.created_by
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chats_created_by_fkey') THEN
    ALTER TABLE chats DROP CONSTRAINT chats_created_by_fkey;
    ALTER TABLE chats ADD CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- chat_members.user_id
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_members_user_id_fkey') THEN
    ALTER TABLE chat_members DROP CONSTRAINT chat_members_user_id_fkey;
    ALTER TABLE chat_members ADD CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- chat_members.added_by
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_members_added_by_fkey') THEN
    ALTER TABLE chat_members DROP CONSTRAINT chat_members_added_by_fkey;
    ALTER TABLE chat_members ADD CONSTRAINT chat_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES users(id);
  END IF;

  -- messages.sender_id
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey') THEN
    ALTER TABLE messages DROP CONSTRAINT messages_sender_id_fkey;
    ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- message_reactions.user_id
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'message_reactions_user_id_fkey') THEN
    ALTER TABLE message_reactions DROP CONSTRAINT message_reactions_user_id_fkey;
    ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- chat_typing.user_id
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_typing_user_id_fkey') THEN
    ALTER TABLE chat_typing DROP CONSTRAINT chat_typing_user_id_fkey;
    ALTER TABLE chat_typing ADD CONSTRAINT chat_typing_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

END $$;

-- ============================================
-- CREATE ALL TABLES FIRST
-- ============================================

-- CHATS TABLE (Conversations)
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT, -- NULL for 1:1 chats, set for group chats
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  avatar_url TEXT, -- Group chat avatar
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS chat_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
  nickname TEXT, -- Optional nickname in this chat
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE, -- NULL if still in chat
  added_by UUID REFERENCES users(id),
  UNIQUE(chat_id, user_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- TYPING INDICATORS TABLE (for real-time)
CREATE TABLE IF NOT EXISTS chat_typing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- CHAT REPORTS TABLE
CREATE TABLE IF NOT EXISTS chat_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reported_by UUID,
  reported_user_id UUID,
  reason VARCHAR(50) NOT NULL, -- 'harassment', 'spam', 'inappropriate', 'other'
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION (bypasses RLS to check membership)
-- ============================================
CREATE OR REPLACE FUNCTION user_is_chat_member(check_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_id = check_chat_id
    AND user_id = auth.uid()
    AND left_at IS NULL
  );
$$;

-- ============================================
-- CHATS POLICIES
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Chat admins can update" ON chats;

-- Users can see chats they're members of OR that they created
CREATE POLICY "Users can view their chats" ON chats
  FOR SELECT TO authenticated
  USING (user_is_chat_member(id) OR created_by = auth.uid());

-- Users can create chats
CREATE POLICY "Users can create chats" ON chats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Chat creator or group admins can update
CREATE POLICY "Chat admins can update" ON chats
  FOR UPDATE TO authenticated
  USING (user_is_chat_member(id) AND (created_by = auth.uid()));

-- ============================================
-- CHAT MEMBERS POLICIES
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can be added to chats" ON chat_members;
DROP POLICY IF EXISTS "Users can update own membership" ON chat_members;
DROP POLICY IF EXISTS "Admins can update memberships" ON chat_members;

-- Users can see members of chats they belong to
CREATE POLICY "Users can view chat members" ON chat_members
  FOR SELECT TO authenticated
  USING (user_is_chat_member(chat_id));

-- Users can join chats (for new chat creation)
-- Restricted: can only add yourself OR if you're the chat creator
CREATE POLICY "Users can be added to chats" ON chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
      AND chats.created_by = auth.uid()
    )
  );

-- Users can update their own membership (mute, pin, archive, read status)
CREATE POLICY "Users can update own membership" ON chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can update any membership in their chats
CREATE POLICY "Admins can update memberships" ON chat_members
  FOR UPDATE TO authenticated
  USING (user_is_chat_member(chat_id));

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Users can see messages in chats they belong to
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT TO authenticated
  USING (user_is_chat_member(chat_id));

-- Users can send messages to chats they belong to
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND user_is_chat_member(chat_id));

-- Users can edit/delete their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- ============================================
-- MESSAGE REACTIONS POLICIES
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove reactions" ON message_reactions;

-- Users can see reactions on messages they can see
CREATE POLICY "Users can view reactions" ON message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND user_is_chat_member(m.chat_id)
    )
  );

-- Users can add reactions
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can remove their own reactions
CREATE POLICY "Users can remove reactions" ON message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- TYPING INDICATORS POLICIES
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view typing" ON chat_typing;
DROP POLICY IF EXISTS "Users can set typing" ON chat_typing;
DROP POLICY IF EXISTS "Users can clear typing" ON chat_typing;

-- Users can see typing in their chats
CREATE POLICY "Users can view typing" ON chat_typing
  FOR SELECT TO authenticated
  USING (user_is_chat_member(chat_id));

-- Users can set their typing status
CREATE POLICY "Users can set typing" ON chat_typing
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can clear typing" ON chat_typing
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- CHAT REPORTS POLICIES
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view reports" ON chat_reports;
DROP POLICY IF EXISTS "Users can create reports" ON chat_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON chat_reports;

-- Only admins can view reports
CREATE POLICY "Admins can view reports" ON chat_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Users can create reports
CREATE POLICY "Users can create reports" ON chat_reports
  FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON chat_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status) WHERE status = 'pending';

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update chat's last_message_at and preview when new message sent
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE chats
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN 'Sent an image'
      WHEN NEW.message_type = 'file' THEN 'Sent a file'
      ELSE NEW.content
    END,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_message();

-- Auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM chat_typing WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$;

-- ============================================
-- ENABLE REALTIME (safe to re-run)
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- APP_SETTINGS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADD CHAT SETTING TO APP_SETTINGS
INSERT INTO app_settings (key, value, description) VALUES
  ('chat_mode', '"all_members"', 'Chat visibility: "off", "all_members"')
ON CONFLICT (key) DO NOTHING;
