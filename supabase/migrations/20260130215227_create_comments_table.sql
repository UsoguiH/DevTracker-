/*
  # Create comments table for tasks

  1. New Tables
    - `comments`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `user_id` (uuid, references auth.users)
      - `text` (text) - comment content
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `comments` table
    - Users can view/create comments on tasks in their projects
*/

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tasks"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE comments.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on their tasks"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE comments.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );