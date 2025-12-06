-- Add is_sponsored column to web_results table
ALTER TABLE public.web_results 
ADD COLUMN is_sponsored boolean NOT NULL DEFAULT false;