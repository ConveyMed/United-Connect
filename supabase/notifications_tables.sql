-- Notifications/Updates Feature Database Schema
-- Run this in Supabase SQL Editor

-- 1. Create notifications table (stores updates and events)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('update', 'event')),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link_url TEXT,
  link_label VARCHAR(100),
  enable_rsvp BOOLEAN DEFAULT FALSE,
  rsvp_question VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_notifications table (tracks user interactions)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  rsvp_response VARCHAR(20) CHECK (rsvp_response IN ('yes', 'no', NULL)),
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_archived ON user_notifications(is_archived);

-- 4. Create updated_at trigger function (if not exists)
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

-- 5. Create trigger for notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
-- Anyone authenticated can read active notifications
CREATE POLICY "Users can read active notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can read all notifications (for admin panel)
CREATE POLICY "Admins can read all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Admins can update notifications
CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- User notifications policies
-- Users can read their own notification records
CREATE POLICY "Users can read own user_notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own notification records
CREATE POLICY "Users can insert own user_notifications"
  ON user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own notification records
CREATE POLICY "Users can update own user_notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all user_notifications (for analytics)
CREATE POLICY "Admins can read all user_notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.is_admin = true OR users.is_owner = true)
    )
  );

-- 7. Helper function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS TABLE (updates_count BIGINT, events_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE n.type = 'update') as updates_count,
    COUNT(*) FILTER (WHERE n.type = 'event') as events_count
  FROM notifications n
  LEFT JOIN user_notifications un ON un.notification_id = n.id AND un.user_id = p_user_id
  WHERE n.is_active = true
    AND (un.is_read IS NULL OR un.is_read = false)
    AND (un.is_archived IS NULL OR un.is_archived = false);
END;
$$;

-- 8. Grant execute permission on function
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
