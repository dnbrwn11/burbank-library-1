-- Add client identity and scope type to projects
-- Run in the Supabase SQL editor.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_type text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'new_construction';
