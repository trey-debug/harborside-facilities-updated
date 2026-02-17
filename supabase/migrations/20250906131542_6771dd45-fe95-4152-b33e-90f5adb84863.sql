-- Update the update_work_request_status function to handle date changes
CREATE OR REPLACE FUNCTION public.update_work_request_status(
  _request_id uuid, 
  _status work_status, 
  _user_name text DEFAULT NULL::text, 
  _reason text DEFAULT NULL::text, 
  _hours numeric DEFAULT NULL::numeric, 
  _notes text DEFAULT NULL::text,
  _new_requested_date date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the request with new status and relevant fields
  UPDATE public.work_requests 
  SET 
    status = _status,
    updated_at = now(),
    requested_date = COALESCE(_new_requested_date, requested_date),
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
$function$