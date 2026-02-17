-- Create enum for work request status
CREATE TYPE work_status AS ENUM ('pending', 'approved', 'rejected', 'in_progress', 'completed');

-- Add status and workflow tracking columns to pending_work_requests
ALTER TABLE public.pending_work_requests 
ADD COLUMN status work_status DEFAULT 'pending',
ADD COLUMN approved_by text,
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN rejected_by text,
ADD COLUMN rejected_at timestamp with time zone,
ADD COLUMN rejected_reason text,
ADD COLUMN started_by text,
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN completed_by text,
ADD COLUMN completed_at timestamp with time zone,
ADD COLUMN actual_hours numeric,
ADD COLUMN completion_notes text;

-- Create or replace function to update work request status
CREATE OR REPLACE FUNCTION public.update_work_request_status(
  _request_id uuid,
  _status work_status,
  _user_name text DEFAULT NULL,
  _reason text DEFAULT NULL,
  _hours numeric DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update the request with new status and relevant fields
  UPDATE public.pending_work_requests 
  SET 
    status = _status,
    updated_at = now(),
    approved_by = CASE WHEN _status = 'approved' THEN _user_name ELSE approved_by END,
    approved_at = CASE WHEN _status = 'approved' THEN now() ELSE approved_at END,
    rejected_by = CASE WHEN _status = 'rejected' THEN _user_name ELSE rejected_by END,
    rejected_at = CASE WHEN _status = 'rejected' THEN now() ELSE rejected_at END,
    rejected_reason = CASE WHEN _status = 'rejected' THEN _reason ELSE rejected_reason END,
    started_by = CASE WHEN _status = 'in_progress' THEN _user_name ELSE started_by END,
    started_at = CASE WHEN _status = 'in_progress' THEN now() ELSE started_at END,
    completed_by = CASE WHEN _status = 'completed' THEN _user_name ELSE completed_by END,
    completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
    actual_hours = CASE WHEN _status = 'completed' THEN _hours ELSE actual_hours END,
    completion_notes = CASE WHEN _status = 'completed' THEN _notes ELSE completion_notes END
  WHERE id = _request_id;
  
  RETURN _request_id;
END;
$$;