-- Create the user dave@harborsidechurch.org using the admin API
-- This will be handled through a one-time SQL insert
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'dave@harborsidechurch.org',
  crypt('P@ssw0rd', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Dave"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;