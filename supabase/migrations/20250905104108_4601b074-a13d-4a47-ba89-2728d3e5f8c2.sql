-- Drop and recreate the approve_work_request function with explicit typing
DROP FUNCTION IF EXISTS public.approve_work_request(uuid, text);

CREATE OR REPLACE FUNCTION public.approve_work_request(_request_id uuid, _approved_by_user text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  request_data RECORD;
BEGIN
  -- Get the request data
  SELECT * INTO request_data FROM public.pending_work_requests WHERE id = _request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work request not found with id: %', _request_id;
  END IF;
  
  -- Insert into approved_work
  INSERT INTO public.approved_work (
    title, description, requestor_name, requestor_email, requestor_phone,
    department, priority, requested_date, location, category, estimated_hours,
    approved_by, original_created_at
  ) VALUES (
    request_data.title, request_data.description, request_data.requestor_name,
    request_data.requestor_email, request_data.requestor_phone, request_data.department,
    request_data.priority, request_data.requested_date, request_data.location,
    request_data.category, request_data.estimated_hours, _approved_by_user,
    request_data.created_at
  ) RETURNING id INTO new_id;
  
  -- Delete from pending_work_requests
  DELETE FROM public.pending_work_requests WHERE id = _request_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.approve_work_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_work_request(uuid, text) TO anon;