-- Add a numeric page_id column to blogs for URL routing
ALTER TABLE public.blogs ADD COLUMN page_id bigint;

-- Create a unique index on page_id
CREATE UNIQUE INDEX idx_blogs_page_id ON public.blogs(page_id) WHERE page_id IS NOT NULL;

-- Update existing blogs with random page IDs (6-digit random numbers)
UPDATE public.blogs SET page_id = floor(random() * 900000 + 100000)::bigint;

-- Create a function to generate unique page_id for new blogs
CREATE OR REPLACE FUNCTION public.generate_blog_page_id()
RETURNS TRIGGER AS $$
DECLARE
  new_page_id bigint;
BEGIN
  -- Generate a random 6-digit number
  LOOP
    new_page_id := floor(random() * 900000 + 100000)::bigint;
    -- Check if it already exists
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.blogs WHERE page_id = new_page_id);
  END LOOP;
  NEW.page_id := new_page_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate page_id on insert
CREATE TRIGGER set_blog_page_id
BEFORE INSERT ON public.blogs
FOR EACH ROW
WHEN (NEW.page_id IS NULL)
EXECUTE FUNCTION public.generate_blog_page_id();