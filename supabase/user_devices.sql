-- User Devices Table for Multi-Device Push Notifications
-- Run this migration in Supabase SQL Editor

-- Create the user_devices table
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL ,
  onesignal_subscription_id TEXT NOT NULL,
  platform TEXT,  -- 'ios', 'android', 'web'
  device_name TEXT,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Composite unique: one row per device per user
  UNIQUE(user_id, onesignal_subscription_id)
);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Users can manage their own devices
CREATE POLICY "Users can manage own devices"
  ON user_devices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can read all devices (needed for sending notifications)
CREATE POLICY "Authenticated can read devices for notifications"
  ON user_devices FOR SELECT
  TO authenticated
  USING (true);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id
  ON user_devices(user_id);

-- Index for quick lookups by subscription ID
CREATE INDEX IF NOT EXISTS idx_user_devices_subscription_id
  ON user_devices(onesignal_subscription_id);

-- Optional: Clean up stale devices (devices not active in 90 days)
-- Run this periodically or create a cron job
-- DELETE FROM user_devices WHERE last_active_at < now() - interval '90 days';
