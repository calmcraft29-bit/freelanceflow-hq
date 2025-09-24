-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.authenticate_client(client_email text, client_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix second function search path security issue
CREATE OR REPLACE FUNCTION public.verify_client_session(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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