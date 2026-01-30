/*
  # Create activity table for task history

  1. New Tables
    - `activity`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `user_id` (uuid, references auth.users)
      - `description` (text) - what changed
      - `type` (text) - 'status', 'comment', 'create', 'update'
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `activity` table
    - Users can view activity on tasks in their projects
*/

CREATE TABLE IF NOT EXISTS activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity on their tasks"
  ON activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE activity.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity on their tasks"
  ON activity FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE activity.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );