-- Create history table for web result updates
CREATE TABLE public.web_result_update_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  web_result_id UUID NOT NULL REFERENCES public.web_results(id) ON DELETE CASCADE,
  old_title TEXT NOT NULL,
  old_url TEXT NOT NULL,
  new_title TEXT NOT NULL,
  new_url TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_result_update_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert history (admin-only enforced at app level)
CREATE POLICY "Anyone can insert update history"
ON public.web_result_update_history
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view history
CREATE POLICY "Anyone can view update history"
ON public.web_result_update_history
FOR SELECT
USING (true);