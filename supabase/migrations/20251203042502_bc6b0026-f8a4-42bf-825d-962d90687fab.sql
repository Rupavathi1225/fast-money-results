-- Add related_search_id to link_tracking for tracking related search clicks
ALTER TABLE public.link_tracking ADD COLUMN IF NOT EXISTS related_search_id uuid REFERENCES public.related_searches(id) ON DELETE SET NULL;

-- Create prelander_settings table
CREATE TABLE public.prelander_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  web_result_id uuid REFERENCES public.web_results(id) ON DELETE CASCADE UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  headline_text text NOT NULL DEFAULT 'Welcome to Our Platform',
  headline_font_size integer NOT NULL DEFAULT 48,
  headline_color text NOT NULL DEFAULT '#ffffff',
  headline_alignment text NOT NULL DEFAULT 'center',
  description_text text NOT NULL DEFAULT 'Join thousands of users already benefiting from our service.',
  description_font_size integer NOT NULL DEFAULT 18,
  description_color text NOT NULL DEFAULT '#cccccc',
  button_text text NOT NULL DEFAULT 'Get Started Now',
  button_color text NOT NULL DEFAULT '#00b4d8',
  background_color text NOT NULL DEFAULT '#0a0f1c',
  background_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email_submissions table
CREATE TABLE public.email_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prelander_id uuid REFERENCES public.prelander_settings(id) ON DELETE CASCADE,
  web_result_id uuid REFERENCES public.web_results(id) ON DELETE CASCADE,
  email text NOT NULL,
  session_id text,
  ip_address text,
  country text,
  device_type text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prelander_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for prelander_settings
CREATE POLICY "Anyone can view prelander settings" ON public.prelander_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can manage prelander settings" ON public.prelander_settings FOR ALL USING (true);

-- RLS policies for email_submissions
CREATE POLICY "Anyone can insert email submissions" ON public.email_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view email submissions" ON public.email_submissions FOR SELECT USING (true);