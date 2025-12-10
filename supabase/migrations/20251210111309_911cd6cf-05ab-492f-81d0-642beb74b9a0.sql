-- Add blog_id column to related_searches to link searches to specific blogs
ALTER TABLE public.related_searches 
ADD COLUMN blog_id uuid REFERENCES public.blogs(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_related_searches_blog_id ON public.related_searches(blog_id);