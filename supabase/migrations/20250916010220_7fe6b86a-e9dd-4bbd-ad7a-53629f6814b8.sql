-- Ensure the webhook function is properly set up to trigger AFTER database insertion
-- This ensures data is saved first, then webhook sends confirmation email

-- Update the webhook function to include work_order_id for confirmation emails
CREATE OR REPLACE FUNCTION public.notify_work_request_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This function runs AFTER the data is inserted into the database
  -- It sends the data to the webhook for confirmation email purposes
  PERFORM
    net.http_post(
      url := 'https://treymccormick.app.n8n.cloud/webhook-test/2dc6395f-6591-4086-b539-43ff26a14e71',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
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
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        'table_name', TG_TABLE_NAME
      )
    );
  -- Return NEW to ensure the insertion completes successfully
  RETURN NEW;
END;
$function$;

-- Ensure the trigger is set up correctly to run AFTER INSERT
-- This guarantees data is saved to database first, then webhook is called
DROP TRIGGER IF EXISTS work_requests_webhook_trigger ON public.work_requests;
CREATE TRIGGER work_requests_webhook_trigger
  AFTER INSERT ON public.work_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_work_request_webhook();