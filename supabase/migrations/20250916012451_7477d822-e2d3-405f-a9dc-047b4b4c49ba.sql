-- Add checklist column to work_requests table for storing approval checklist items
ALTER TABLE public.work_requests 
ADD COLUMN approval_checklist JSONB;