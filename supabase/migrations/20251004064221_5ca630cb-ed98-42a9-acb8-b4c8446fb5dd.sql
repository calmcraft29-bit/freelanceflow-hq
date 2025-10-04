-- Allow freelancers to upload files for their projects
CREATE POLICY "Freelancers can upload project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow freelancers to view/download files for their projects
CREATE POLICY "Freelancers can view project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow freelancers to delete files for their projects
CREATE POLICY "Freelancers can delete project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow clients to view/download files for their assigned projects
CREATE POLICY "Clients can view project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1
    FROM project_files pf
    JOIN projects p ON p.id = pf.project_id
    JOIN client_sessions cs ON cs.client_id = p.client_id
    WHERE pf.file_path = name
      AND cs.session_token = current_setting('app.current_client_session', true)
      AND cs.expires_at > now()
  )
);

-- Update RLS policy on project_files table to allow clients to view files
CREATE POLICY "Clients can view files for their projects"
ON project_files
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id
    FROM projects p
    JOIN client_sessions cs ON cs.client_id = p.client_id
    WHERE cs.session_token = current_setting('app.current_client_session', true)
      AND cs.expires_at > now()
  )
);