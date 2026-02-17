-- Update the webhook function to include the new approval checklist field
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
        'approval_checklist', NEW.approval_checklist,
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