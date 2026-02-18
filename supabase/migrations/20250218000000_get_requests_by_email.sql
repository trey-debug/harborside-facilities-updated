-- ─────────────────────────────────────────────────────────────────────────────
-- get_work_requests_by_email
--
-- Returns all work requests submitted with a given email address.
-- SECURITY DEFINER:  runs with owner (postgres) privileges so it bypasses
--   any Row Level Security policies that would block anonymous SELECT.
-- lower() on both sides:  makes the lookup case-insensitive so users don't
--   have to remember the exact capitalisation they used when submitting.
-- GRANT to anon + authenticated:  allows the public status-check page to call
--   this without needing the user to be logged in.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_work_requests_by_email(_email text)
RETURNS SETOF public.work_requests
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.work_requests
  WHERE lower(requestor_email) = lower(_email)
  ORDER BY created_at DESC;
$$;

-- Allow any role (including the public anon key) to execute this function
GRANT EXECUTE ON FUNCTION public.get_work_requests_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_work_requests_by_email(text) TO authenticated;
