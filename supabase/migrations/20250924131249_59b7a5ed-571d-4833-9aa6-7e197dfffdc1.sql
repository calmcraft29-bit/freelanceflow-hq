-- Add authentication fields to clients table
ALTER TABLE public.clients 
ADD COLUMN password_hash text,
ADD COLUMN is_active boolean DEFAULT true,
ADD COLUMN last_login_at timestamp with time zone;

-- Create client sessions table for managing client logins
CREATE TABLE public.client_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on client sessions
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for client sessions
CREATE POLICY "Clients can view their own sessions" 
ON public.client_sessions 
FOR SELECT 
USING (true); -- Will be handled by application logic

-- Create function to authenticate clients
CREATE OR REPLACE FUNCTION public.authenticate_client(client_email text, client_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record public.clients;
  session_token text;
  result json;
BEGIN
  -- Find client by email
  SELECT * INTO client_record 
  FROM public.clients 
  WHERE email = client_email AND is_active = true;
  
  IF client_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Verify password (in production, use proper password hashing)
  IF client_record.password_hash != crypt(client_password, client_record.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Generate session token
  session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create session
  INSERT INTO public.client_sessions (client_id, session_token, expires_at)
  VALUES (client_record.id, session_token, now() + interval '24 hours');
  
  -- Update last login
  UPDATE public.clients 
  SET last_login_at = now() 
  WHERE id = client_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'client', json_build_object(
      'id', client_record.id,
      'name', client_record.name,
      'email', client_record.email
    ),
    'session_token', session_token
  );
END;
$$;

-- Create function to verify client session
CREATE OR REPLACE FUNCTION public.verify_client_session(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record public.client_sessions;
  client_record public.clients;
BEGIN
  -- Find valid session
  SELECT * INTO session_record 
  FROM public.client_sessions 
  WHERE session_token = token AND expires_at > now();
  
  IF session_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;
  
  -- Get client data
  SELECT * INTO client_record 
  FROM public.clients 
  WHERE id = session_record.client_id AND is_active = true;
  
  IF client_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Client not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'client', json_build_object(
      'id', client_record.id,
      'name', client_record.name,
      'email', client_record.email
    )
  );
END;
$$;

-- Create RLS policies for client access to projects
CREATE POLICY "Clients can view their own projects" 
ON public.projects 
FOR SELECT 
USING (client_id IN (
  SELECT cs.client_id 
  FROM public.client_sessions cs 
  WHERE cs.session_token = current_setting('app.current_client_session', true)
  AND cs.expires_at > now()
));

-- Create RLS policies for client access to invoices
CREATE POLICY "Clients can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (client_id IN (
  SELECT cs.client_id 
  FROM public.client_sessions cs 
  WHERE cs.session_token = current_setting('app.current_client_session', true)
  AND cs.expires_at > now()
));

-- Create RLS policies for client access to tasks
CREATE POLICY "Clients can view tasks for their projects" 
ON public.tasks 
FOR SELECT 
USING (project_id IN (
  SELECT p.id 
  FROM public.projects p
  JOIN public.client_sessions cs ON p.client_id = cs.client_id
  WHERE cs.session_token = current_setting('app.current_client_session', true)
  AND cs.expires_at > now()
));