-- Create function to set client password
CREATE OR REPLACE FUNCTION public.set_client_password(
  client_email text,
  new_password text,
  use_hash boolean DEFAULT false
)
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