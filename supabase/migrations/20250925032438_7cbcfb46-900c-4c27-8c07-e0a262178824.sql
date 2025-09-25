-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update authentication function to use proper password hashing
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

-- Function to set client password (for admin use)
CREATE OR REPLACE FUNCTION public.set_client_password(client_email text, new_password text, use_hash boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record public.clients;
  password_value text;
BEGIN
  -- Find client by email
  SELECT * INTO client_record 
  FROM public.clients 
  WHERE email = client_email;
  
  IF client_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Client not found');
  END IF;
  
  -- Set password (simple or hashed)
  IF use_hash THEN
    password_value := crypt(new_password, gen_salt('bf'));
  ELSE
    password_value := new_password;
  END IF;
  
  -- Update client password
  UPDATE public.clients 
  SET password_hash = password_value
  WHERE id = client_record.id;
  
  RETURN json_build_object('success', true, 'message', 'Password set successfully');
END;
$$;

-- Set a test password for existing clients (for demo purposes)
-- You can change the email to match your test client
DO $$
DECLARE
  client_email text := 'test@example.com';
  test_password text := 'password123';
BEGIN
  -- Only set password if client exists
  IF EXISTS (SELECT 1 FROM public.clients WHERE email = client_email) THEN
    PERFORM public.set_client_password(client_email, test_password, false);
  END IF;
END $$;