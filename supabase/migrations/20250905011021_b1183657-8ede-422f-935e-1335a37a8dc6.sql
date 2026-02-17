-- Create admin user function (to be run manually in Supabase SQL editor)
-- This needs to be executed in Supabase dashboard as it requires admin privileges

-- Note: The actual user creation will need to be done in Supabase Auth dashboard
-- or via the Auth API, but we can set up the profile structure

-- Update profiles table to include admin role
UPDATE public.profiles 
SET name = 'Administrator', department = 'Admin' 
WHERE email = 'admin@church.org';

-- If no admin profile exists, we'll create one when the user signs up
-- The auth user will need to be created manually in Supabase dashboard