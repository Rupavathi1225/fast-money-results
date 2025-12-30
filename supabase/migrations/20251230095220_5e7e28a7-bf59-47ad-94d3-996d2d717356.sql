-- Update redirect_enabled to default true (ON)
ALTER TABLE public.landing_settings ALTER COLUMN redirect_enabled SET DEFAULT true;

-- Update existing records to have redirect_enabled = true
UPDATE public.landing_settings SET redirect_enabled = true WHERE redirect_enabled = false;