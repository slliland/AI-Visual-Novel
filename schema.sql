-- Visual Novel Database Schema for Vercel Postgres

-- Table to store conversation sessions
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  initial_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session VARCHAR(255), -- For anonymous users, we'll use a session ID
  INDEX idx_conversations_user_session (user_session),
  INDEX idx_conversations_created_at (created_at)
);

-- Table to store story segments within conversations
CREATE TABLE IF NOT EXISTS story_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  speaker VARCHAR(50) NOT NULL,
  emotion VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  segment_order INTEGER NOT NULL, -- Order of segments in the conversation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_segments_conversation_id (conversation_id),
  INDEX idx_segments_order (conversation_id, segment_order)
);

-- Table to store choices presented to users
CREATE TABLE IF NOT EXISTS choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  choice_id VARCHAR(100) NOT NULL, -- Original choice ID from the story system
  choice_text TEXT NOT NULL,
  choice_order INTEGER NOT NULL, -- Order of choices when presented
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_choices_conversation_id (conversation_id)
);

-- Table to store user's selected choices
CREATE TABLE IF NOT EXISTS selected_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  choice_id UUID NOT NULL REFERENCES choices(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_selected_choices_conversation_id (conversation_id)
);

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_segments_created_at ON story_segments(created_at);
CREATE INDEX IF NOT EXISTS idx_choices_created_at ON choices(created_at);
CREATE INDEX IF NOT EXISTS idx_selected_choices_selected_at ON selected_choices(selected_at);
