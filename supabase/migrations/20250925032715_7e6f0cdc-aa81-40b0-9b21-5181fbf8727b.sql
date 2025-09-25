-- Create a test client with a valid user_id from existing users
INSERT INTO public.clients (user_id, name, email, password_hash, is_active, notes)
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Test Client',
  'client@test.com',
  'testpass123',
  true,
  'Demo client for testing client portal login'
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients WHERE email = 'client@test.com'
);

-- Update existing test client if it exists
UPDATE public.clients 
SET password_hash = 'testpass123', is_active = true
WHERE email = 'client@test.com';