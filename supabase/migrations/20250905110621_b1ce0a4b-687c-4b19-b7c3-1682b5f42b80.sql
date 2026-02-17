-- Recreate the personal_tasks table that was missing
CREATE TABLE IF NOT EXISTS public.personal_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority priority_level DEFAULT 'medium',
  status text DEFAULT 'todo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for personal tasks (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own personal tasks" ON public.personal_tasks;
CREATE POLICY "Users can view their own personal tasks" 
ON public.personal_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own personal tasks" ON public.personal_tasks;
CREATE POLICY "Users can create their own personal tasks" 
ON public.personal_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own personal tasks" ON public.personal_tasks;
CREATE POLICY "Users can update their own personal tasks" 
ON public.personal_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own personal tasks" ON public.personal_tasks;
CREATE POLICY "Users can delete their own personal tasks" 
ON public.personal_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add RLS policies for work_requests table
DROP POLICY IF EXISTS "Users can view work requests" ON public.work_requests;
CREATE POLICY "Users can view work requests" 
ON public.work_requests 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can create work requests" ON public.work_requests;
CREATE POLICY "Users can create work requests" 
ON public.work_requests 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update work requests" ON public.work_requests;
CREATE POLICY "Users can update work requests" 
ON public.work_requests 
FOR UPDATE 
USING (true);