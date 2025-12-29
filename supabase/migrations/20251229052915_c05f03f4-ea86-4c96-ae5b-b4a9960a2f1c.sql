-- Add landing2_tracking table for tracking /landing2 (masked as /q=xxx) views and clicks
CREATE TABLE IF NOT EXISTS public.landing2_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  device_type TEXT,
  user_agent TEXT,
  country TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'fallback_click')),
  fallback_url_id UUID REFERENCES public.fallback_urls(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing2_tracking ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for tracking)
CREATE POLICY "Allow public insert for tracking"
ON public.landing2_tracking
FOR INSERT
WITH CHECK (true);

-- Allow public select (for analytics)
CREATE POLICY "Allow public select for analytics"
ON public.landing2_tracking
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_landing2_tracking_session ON public.landing2_tracking(session_id);
CREATE INDEX idx_landing2_tracking_event_type ON public.landing2_tracking(event_type);
CREATE INDEX idx_landing2_tracking_fallback_url ON public.landing2_tracking(fallback_url_id);