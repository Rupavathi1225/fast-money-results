-- Create fallback_urls table with country permissions and timestamps
CREATE TABLE public.fallback_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  allowed_countries TEXT[] NOT NULL DEFAULT ARRAY['worldwide'::text],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.fallback_urls ENABLE ROW LEVEL SECURITY;

-- Create policies for fallback_urls
CREATE POLICY "Anyone can view fallback urls" 
ON public.fallback_urls 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage fallback urls" 
ON public.fallback_urls 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fallback_urls_updated_at
BEFORE UPDATE ON public.fallback_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();