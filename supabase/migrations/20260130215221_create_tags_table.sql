/*
  # Create tags table for tasks

  1. New Tables
    - `tags`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `name` (text) - tag name
      - `color` (text) - Tailwind color class

  2. Security
    - Enable RLS on `tags` table
    - Users can only manage tags on their tasks
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags on their tasks"
  ON tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE tags.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tags on their tasks"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE tags.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags on their tasks"
  ON tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON tasks.project_id = projects.id
      WHERE tags.task_id = tasks.id
      AND projects.user_id = auth.uid()
    )
  );