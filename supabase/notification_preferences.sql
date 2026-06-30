-- User Notification Preferences Table
-- Run this migration in Supabase SQL Editor

-- Create the user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY ,

  -- Posts & Feed
  push_new_posts BOOLEAN DEFAULT true,
  push_post_likes BOOLEAN DEFAULT true,
  push_post_comments BOOLEAN DEFAULT true,
  push_comment_replies BOOLEAN DEFAULT true,
  push_bookmarked_comments BOOLEAN DEFAULT true,

  -- Chat
  push_direct_messages BOOLEAN DEFAULT true,
  push_group_messages BOOLEAN DEFAULT true,
  push_chat_added BOOLEAN DEFAULT true,
  push_chat_removed BOOLEAN DEFAULT true,

  -- Updates & Events
  push_new_updates BOOLEAN DEFAULT true,
  push_new_events BOOLEAN DEFAULT true,
  push_event_reminders BOOLEAN DEFAULT true,

  -- OneSignal Player ID for push notifications
  onesignal_player_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read own preferences"
  ON user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for edge functions)
CREATE POLICY "Service role can read all preferences"
  ON user_notification_preferences
  FOR SELECT
  TO service_role
  USING (true);

-- Function to auto-create preferences on user signup
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create preferences when user is created
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- Also create preferences for existing users
INSERT INTO user_notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Add sent tracking columns to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

-- Index for quick player_id lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_player_id
  ON user_notification_preferences(onesignal_player_id)
  WHERE onesignal_player_id IS NOT NULL;
