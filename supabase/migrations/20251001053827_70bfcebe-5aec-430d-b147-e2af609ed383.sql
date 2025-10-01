-- Add storage buckets for file management
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false);

-- Create storage policies for project files
CREATE POLICY "Users can upload their own project files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own project files"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own project files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own project files"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add invoice reminder tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;

-- Add file attachments table for projects
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_files
CREATE POLICY "Users can upload files for their projects"
ON project_files FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can view files for their projects"
ON project_files FOR SELECT
USING (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete files for their projects"
ON project_files FOR DELETE
USING (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()
));

-- Add manual time entry fields to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS manual_time_entries jsonb DEFAULT '[]'::jsonb;

-- Create function to calculate overdue invoices with days overdue
CREATE OR REPLACE FUNCTION get_overdue_invoices(user_uuid uuid)
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  client_name text,
  project_name text,
  days_overdue integer,
  total_amount numeric,
  due_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    i.id,
    i.invoice_number,
    c.name as client_name,
    p.name as project_name,
    (CURRENT_DATE - i.due_date)::integer as days_overdue,
    i.total_amount,
    i.due_date
  FROM invoices i
  JOIN projects p ON i.project_id = p.id
  JOIN clients c ON i.client_id = c.id
  WHERE i.user_id = user_uuid
    AND i.status = 'unpaid'
    AND i.due_date IS NOT NULL
    AND i.due_date < CURRENT_DATE
  ORDER BY (CURRENT_DATE - i.due_date) DESC;
$$;