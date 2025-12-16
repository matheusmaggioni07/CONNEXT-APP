-- Create table to persist builder chat history
CREATE TABLE IF NOT EXISTS builder_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES builder_projects(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_builder_chat_history_project_id ON builder_chat_history(project_id);
CREATE INDEX idx_builder_chat_history_user_id ON builder_chat_history(user_id);
CREATE INDEX idx_builder_chat_history_created_at ON builder_chat_history(created_at DESC);

-- Enable RLS
ALTER TABLE builder_chat_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own chat history
CREATE POLICY "Users can view their own builder chat history"
  ON builder_chat_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for users to insert their own messages
CREATE POLICY "Users can insert their own builder chat messages"
  ON builder_chat_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy for users to update their own messages
CREATE POLICY "Users can update their own builder chat messages"
  ON builder_chat_history
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policy for users to delete their own messages
CREATE POLICY "Users can delete their own builder chat messages"
  ON builder_chat_history
  FOR DELETE
  USING (user_id = auth.uid());
