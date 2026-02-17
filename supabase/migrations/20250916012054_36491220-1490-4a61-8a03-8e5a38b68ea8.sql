-- Add date_changed_reason column to work_requests table
ALTER TABLE public.work_requests 
ADD COLUMN date_changed_reason TEXT;

-- Update the webhook function to handle both INSERT and UPDATE operations
-- and include the new date change reason and operation type
CREATE OR REPLACE FUNCTION public.notify_work_request_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This function runs AFTER the data is inserted/updated in the database
  -- It sends the data to the webhook for confirmation/notification email purposes
  PERFORM
    net.http_post(
      url := 'https://treymccormick.app.n8n.cloud/webhook-test/c344cc12-bf01-4ead-ab79-ae002d4fd947',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'operation', TG_OP,
        'id', NEW.id,
        'work_order_id', NEW.work_order_id,
        'title', NEW.title,
        'description', NEW.description,
        'department', NEW.department,
        'requestor_name', NEW.requestor_name,
        'requestor_email', NEW.requestor_email,
        'requestor_phone', NEW.requestor_phone,
        'priority', NEW.priority,
        'requested_date', NEW.requested_date,
        'location', NEW.location,
        'category', NEW.category,
        'estimated_hours', NEW.estimated_hours,
        'status', NEW.status,
        'date_changed_reason', NEW.date_changed_reason,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        'old_requested_date', CASE WHEN TG_OP = 'UPDATE' THEN OLD.requested_date ELSE NULL END,
        'table_name', TG_TABLE_NAME
      )
    );
  -- Return NEW to ensure the operation completes successfully
  RETURN NEW;
END;
$function$;

-- Update the trigger to fire on both INSERT and UPDATE operations
DROP TRIGGER IF EXISTS work_requests_webhook_trigger ON public.work_requests;
CREATE TRIGGER work_requests_webhook_trigger
  AFTER INSERT OR UPDATE ON public.work_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_work_request_webhook();