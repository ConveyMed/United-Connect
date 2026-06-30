-- Post Notification Settings Table
-- Allows per-post mute and watch for push notifications
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS post_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID  NOT NULL,
  is_muted BOOLEAN DEFAULT false,      -- Stop push notifications for this post
  is_watching BOOLEAN DEFAULT false,   -- Override global pref OFF to get notifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE post_notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own post notification settings"
  ON post_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own settings
CREATE POLICY "Users can insert own post notification settings"
  ON post_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post notification settings"
  ON post_notification_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post notification settings"
  ON post_notification_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Authenticated users can read all settings (needed for notification service)
CREATE POLICY "Authenticated can read all settings for notifications"
  ON post_notification_settings FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_notification_settings_post_id
  ON post_notification_settings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_notification_settings_user_id
  ON post_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_post_notification_settings_muted
  ON post_notification_settings(post_id, user_id) WHERE is_muted = true;
CREATE INDEX IF NOT EXISTS idx_post_notification_settings_watching
  ON post_notification_settings(post_id, user_id) WHERE is_watching = true;
