-- ============================================
-- ACTIVITY NOTIFICATIONS SCHEMA
-- ============================================
-- Tables:
--   - activity_notifications: Individual notification events
--   - user_notification_state: Track last read time per user
--   - user_post_reads: Track comment reads for "New" divider
--
-- Types:
--   - new_post: Someone created a new post
--   - new_comment: Someone commented on a post
--   - new_reply: Someone replied to your comment (future)
-- ============================================

-- Activity notifications table (one record per event)
CREATE TABLE IF NOT EXISTS activity_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('new_post', 'new_comment', 'new_reply')),
  actor_id UUID  NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content_preview TEXT, -- snippet of post/comment for display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification state (track when user last checked notifications)
CREATE TABLE IF NOT EXISTS user_notification_state (
  user_id UUID  PRIMARY KEY,
  last_checked_at TIMESTAMP WITH TIME ZONE, -- NULL = never checked, use account creation
  last_banner_shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual notification read tracking
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id UUID ,
  notification_id UUID REFERENCES activity_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

-- Track when user last viewed a post's comments (for "New" divider)
CREATE TABLE IF NOT EXISTS user_post_reads (
  user_id UUID ,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  last_seen_comment_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_notifications_created_at ON activity_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_notifications_post_id ON activity_notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_activity_notifications_actor_id ON activity_notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_user_post_reads_user_id ON user_post_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);

-- Enable RLS
ALTER TABLE activity_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_post_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view notifications" ON activity_notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON activity_notifications;
DROP POLICY IF EXISTS "Users can view own notification state" ON user_notification_state;
DROP POLICY IF EXISTS "Users can update own notification state" ON user_notification_state;
DROP POLICY IF EXISTS "Users can insert own notification state" ON user_notification_state;
DROP POLICY IF EXISTS "Users can view own post reads" ON user_post_reads;
DROP POLICY IF EXISTS "Users can upsert own post reads" ON user_post_reads;
DROP POLICY IF EXISTS "Users can view own notification reads" ON notification_reads;
DROP POLICY IF EXISTS "Users can insert own notification reads" ON notification_reads;

-- Activity notifications policies (everyone can see all notifications)
CREATE POLICY "Anyone can view notifications" ON activity_notifications
  FOR SELECT USING (true);

CREATE POLICY "Users can create notifications" ON activity_notifications
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- User notification state policies
CREATE POLICY "Users can view own notification state" ON user_notification_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification state" ON user_notification_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification state" ON user_notification_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User post reads policies
CREATE POLICY "Users can view own post reads" ON user_post_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post reads" ON user_post_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post reads" ON user_post_reads
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification reads policies
CREATE POLICY "Users can view own notification reads" ON notification_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification reads" ON notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to auto-create notification when a post is created
CREATE OR REPLACE FUNCTION create_post_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_notifications (type, actor_id, post_id, content_preview)
  VALUES (
    'new_post',
    NEW.user_id,
    NEW.id,
    LEFT(NEW.content, 100)
  );
  RETURN NEW;
END;
$$;

-- Function to auto-create notification when a comment is created
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_notifications (type, actor_id, post_id, comment_id, content_preview)
  VALUES (
    'new_comment',
    NEW.user_id,
    NEW.post_id,
    NEW.id,
    LEFT(NEW.content, 100)
  );
  RETURN NEW;
END;
$$;

-- Triggers to auto-create notifications
DROP TRIGGER IF EXISTS trigger_create_post_notification ON posts;
CREATE TRIGGER trigger_create_post_notification
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION create_post_notification();

DROP TRIGGER IF EXISTS trigger_create_comment_notification ON post_comments;
CREATE TRIGGER trigger_create_comment_notification
AFTER INSERT ON post_comments
FOR EACH ROW EXECUTE FUNCTION create_comment_notification();

-- Enable realtime so the notification bell updates live while the app is open
-- (the client also re-pulls on app foreground as a reliability layer). Wrapped
-- so re-running this setup file is idempotent.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE activity_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already published
END
$$;
