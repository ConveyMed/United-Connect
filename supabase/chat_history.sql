-- AI Chat Conversations Table
-- Run this in Supabase SQL Editor

-- Drop old table if exists and recreate
DROP TABLE IF EXISTS ai_chat_history;

CREATE TABLE ai_chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID ,
  product_name TEXT NOT NULL,
  title TEXT NOT NULL,  -- First question becomes the title
  messages JSONB NOT NULL DEFAULT '[]',  -- Full conversation as JSON array
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history
CREATE POLICY "Users can view own history" ON ai_chat_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert own history" ON ai_chat_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own history
CREATE POLICY "Users can update own history" ON ai_chat_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own history" ON ai_chat_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX idx_chat_history_user ON ai_chat_history(user_id, created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_history_updated_at
  BEFORE UPDATE ON ai_chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_history_updated_at();
