-- Fix the authentication function to use a different approach for session tokens
CREATE OR REPLACE FUNCTION public.authenticate_client(client_email text, client_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record public.clients;
  session_token text;
BEGIN
  -- Find client by email
  SELECT * INTO client_record 
  FROM public.clients 
  WHERE email = client_email AND is_active = true;
  
  IF client_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- For testing, allow simple password or use crypt if hash exists
  IF client_record.password_hash IS NULL OR client_record.password_hash = '' THEN
    -- No password set, deny access
    RETURN json_build_object('success', false, 'error', 'No password set for this client');
  ELSIF client_record.password_hash = client_password THEN
    -- Simple password match for testing
    NULL;
  ELSIF client_record.password_hash = crypt(client_password, client_record.password_hash) THEN
    -- Proper hash verification
    NULL;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Generate session token using a different method
  session_token := md5(random()::text || clock_timestamp()::text);
  
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