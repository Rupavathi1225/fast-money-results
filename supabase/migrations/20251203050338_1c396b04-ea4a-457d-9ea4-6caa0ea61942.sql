-- Add new columns to prelander_settings table
ALTER TABLE public.prelander_settings 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS main_image_url text,
ADD COLUMN IF NOT EXISTS email_placeholder text DEFAULT 'Enter your email';