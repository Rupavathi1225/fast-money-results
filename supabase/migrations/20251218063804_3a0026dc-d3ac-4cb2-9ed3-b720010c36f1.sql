-- Add blog association to web_results so deletions and filtering are blog-specific
ALTER TABLE public.web_results
ADD COLUMN IF NOT EXISTS blog_id uuid;

CREATE INDEX IF NOT EXISTS idx_web_results_blog_id ON public.web_results(blog_id);

-- (Optional but helpful) keep updated_at accurate when updating rows
-- No trigger is added here to avoid changing existing behavior.
