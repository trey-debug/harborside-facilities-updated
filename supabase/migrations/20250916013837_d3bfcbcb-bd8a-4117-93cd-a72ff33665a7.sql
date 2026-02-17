-- Add timer tracking fields to work_requests table
ALTER TABLE public.work_requests 
ADD COLUMN is_timer_active BOOLEAN DEFAULT FALSE,
ADD COLUMN timer_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_elapsed_seconds INTEGER DEFAULT 0,
ADD COLUMN timer_paused_at TIMESTAMP WITH TIME ZONE;

-- Create index for finding active timers quickly
CREATE INDEX idx_work_requests_timer_active ON public.work_requests(is_timer_active) WHERE is_timer_active = TRUE;