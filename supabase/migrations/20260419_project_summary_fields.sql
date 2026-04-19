-- Project Summary dashboard fields
-- Run in the Supabase SQL editor.

-- Project metadata columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pursuit_lead        text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS architect           text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes               text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_contact_name  text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_contact_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_contact_phone text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS dd_due_date         date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gmp_due_date        date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS bid_date            date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS construction_start  date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS drawings_url        text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS specs_url           text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rfp_url             text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_context     text;

-- May already exist from earlier migrations or AIGenerator form — safe to re-run
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gross_sf    numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS stories     integer;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_type text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS scope_type  text DEFAULT 'new_construction';

-- AI assumptions on the scenario (returned from generate-estimate and saved here)
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS ai_assumptions jsonb;
