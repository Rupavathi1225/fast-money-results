-- Landing page settings
CREATE TABLE public.landing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'FastMoney',
  title TEXT NOT NULL DEFAULT 'Fast Money Solutions',
  description TEXT NOT NULL DEFAULT 'Discover the best platforms for earning money online.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default landing settings
INSERT INTO public.landing_settings (site_name, title, description) 
VALUES ('FastMoney', 'Fast Money Solutions', 'Discover the best platforms for earning, investing, and growing your wealth online. Whether you''re looking for side hustles or full-time opportunities.');

-- Related search categories (boxes on landing page)
CREATE TABLE public.related_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_text TEXT NOT NULL,
  title TEXT NOT NULL,
  web_result_page INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Web results (individual results shown on each web result page)
CREATE TABLE public.web_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  web_result_page INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  original_link TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  country_permissions TEXT[] DEFAULT ARRAY['worldwide']::TEXT[],
  fallback_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link tracking for masked links
CREATE TABLE public.link_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id INTEGER NOT NULL,
  web_result_id UUID REFERENCES public.web_results(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  device_type TEXT,
  user_agent TEXT,
  country TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session tracking
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  device_type TEXT,
  user_agent TEXT,
  country TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_related_searches_page ON public.related_searches(web_result_page);
CREATE INDEX idx_related_searches_order ON public.related_searches(display_order);
CREATE INDEX idx_web_results_page ON public.web_results(web_result_page);
CREATE INDEX idx_web_results_order ON public.web_results(display_order);
CREATE INDEX idx_link_tracking_session ON public.link_tracking(session_id);
CREATE INDEX idx_link_tracking_link ON public.link_tracking(link_id);
CREATE INDEX idx_link_tracking_web_result ON public.link_tracking(web_result_id);

-- Enable RLS
ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can view)
CREATE POLICY "Anyone can view landing settings" ON public.landing_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can view active related searches" ON public.related_searches FOR SELECT USING (true);
CREATE POLICY "Anyone can view active web results" ON public.web_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert link tracking" ON public.link_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view link tracking" ON public.link_tracking FOR SELECT USING (true);
CREATE POLICY "Anyone can manage sessions" ON public.sessions FOR ALL USING (true);

-- Admin policies (for now, public write - you can add auth later)
CREATE POLICY "Anyone can manage landing settings" ON public.landing_settings FOR ALL USING (true);
CREATE POLICY "Anyone can manage related searches" ON public.related_searches FOR ALL USING (true);
CREATE POLICY "Anyone can manage web results" ON public.web_results FOR ALL USING (true);

-- Insert sample data for related searches
INSERT INTO public.related_searches (search_text, title, web_result_page, position, display_order) VALUES
('Online Earning Platforms', 'Top Online Earning Platforms', 1, 1, 1),
('Investment Opportunities', 'Best Investment Opportunities', 2, 2, 2),
('Freelance Work', 'Freelance Job Platforms', 3, 3, 3),
('Passive Income', 'Passive Income Ideas', 4, 4, 4),
('Quick Cash', 'Quick Cash Methods', 5, 5, 5);

-- Insert sample web results
INSERT INTO public.web_results (web_result_page, title, description, original_link, display_order) VALUES
(1, 'Fiverr', 'Freelance services marketplace for businesses', 'https://www.fiverr.com', 1),
(1, 'Upwork', 'World''s largest freelancing website', 'https://www.upwork.com', 2),
(1, 'Freelancer', 'Hire expert freelancers for any job', 'https://www.freelancer.com', 3),
(2, 'Robinhood', 'Commission-free investing', 'https://robinhood.com', 1),
(2, 'Coinbase', 'Buy, sell, and manage cryptocurrency', 'https://coinbase.com', 2),
(3, 'Indeed', 'Job search engine for all industries', 'https://indeed.com', 1),
(4, 'Shopify', 'Start your own online store', 'https://shopify.com', 1),
(5, 'Survey Junkie', 'Get paid for sharing your opinion', 'https://surveyjunkie.com', 1);