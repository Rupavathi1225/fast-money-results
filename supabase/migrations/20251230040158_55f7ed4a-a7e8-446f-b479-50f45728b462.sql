-- Add redirect_enabled column to landing_settings table
ALTER TABLE public.landing_settings 
ADD COLUMN IF NOT EXISTS redirect_enabled boolean NOT NULL DEFAULT false;