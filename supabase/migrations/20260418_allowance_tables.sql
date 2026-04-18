-- Allowance tracking
-- Run in the Supabase SQL editor.

ALTER TABLE public.line_items
  ADD COLUMN IF NOT EXISTS is_allowance boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.allowance_draws (
  id           uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  line_item_id uuid        REFERENCES public.line_items(id) ON DELETE CASCADE NOT NULL,
  amount       numeric     NOT NULL,
  description  text        NOT NULL,
  drawn_date   date        DEFAULT CURRENT_DATE,
  created_by   uuid        REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.allowance_draws ENABLE ROW LEVEL SECURITY;

-- Project members can view draws on items that belong to their projects
CREATE POLICY "allowance_draws_read" ON public.allowance_draws
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM line_items li
      JOIN scenarios s ON s.id = li.scenario_id
      JOIN projects p  ON p.id = s.project_id
      WHERE li.id = allowance_draws.line_item_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
          )
        )
    )
  );

-- Editors and owners can insert / delete draws
CREATE POLICY "allowance_draws_write" ON public.allowance_draws
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM line_items li
      JOIN scenarios s ON s.id = li.scenario_id
      JOIN projects p  ON p.id = s.project_id
      WHERE li.id = allowance_draws.line_item_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('Editor', 'editor', 'owner')
          )
        )
    )
  );

CREATE POLICY "allowance_draws_delete" ON public.allowance_draws
  FOR DELETE USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS allowance_draws_line_item_id ON public.allowance_draws(line_item_id);
