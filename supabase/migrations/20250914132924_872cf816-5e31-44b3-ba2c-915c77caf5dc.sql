-- Add work_order_id column to work_requests table
ALTER TABLE public.work_requests 
ADD COLUMN work_order_id TEXT;

-- Create a function to generate work order IDs
CREATE OR REPLACE FUNCTION public.generate_work_order_id()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the next sequence number by counting existing records + 1
  SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_id FROM 4) AS INTEGER)), 0) + 1
  INTO next_id
  FROM public.work_requests
  WHERE work_order_id IS NOT NULL;
  
  RETURN 'WO-' || next_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Update existing records with work order IDs using a sequence approach
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM public.work_requests ORDER BY created_at LOOP
    UPDATE public.work_requests 
    SET work_order_id = 'WO-' || counter::TEXT 
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Create trigger to auto-generate work order ID for new records
CREATE OR REPLACE FUNCTION public.set_work_order_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.work_order_id IS NULL THEN
    NEW.work_order_id := public.generate_work_order_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_work_order_id_trigger
  BEFORE INSERT ON public.work_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_work_order_id();