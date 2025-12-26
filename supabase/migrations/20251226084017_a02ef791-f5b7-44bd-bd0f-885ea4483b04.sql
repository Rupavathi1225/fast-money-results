-- Add optional country tracking to update history
ALTER TABLE public.web_result_update_history
ADD COLUMN IF NOT EXISTS old_country_permissions text[] NULL,
ADD COLUMN IF NOT EXISTS new_country_permissions text[] NULL;