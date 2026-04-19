-- Value Engineering log and Budget Tracker tables

-- ── VE Items ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ve_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario_id      uuid        REFERENCES scenarios(id) ON DELETE SET NULL,
  ve_number        integer     NOT NULL DEFAULT 1,
  title            text        NOT NULL,
  description      text,
  notes            text,
  category         text        NOT NULL DEFAULT 'Scope Reduction'
                               CHECK (category IN (
                                 'Material Substitution','System Redesign','Scope Reduction',
                                 'Constructability','Schedule Optimization','Design Simplification'
                               )),
  status           text        NOT NULL DEFAULT 'proposed'
                               CHECK (status IN (
                                 'proposed','under_review','approved','rejected','deferred','implemented'
                               )),
  cost_impact      numeric     NOT NULL DEFAULT 0,
  schedule_impact  text,
  risk_level       text        NOT NULL DEFAULT 'low'
                               CHECK (risk_level IN ('low','medium','high')),
  ai_impact        jsonb,
  proposed_by      uuid        REFERENCES profiles(id),
  reviewed_by      uuid        REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── VE Item Lines (links ve item to affected line items) ──────────────────────

CREATE TABLE IF NOT EXISTS ve_item_lines (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ve_item_id     uuid    NOT NULL REFERENCES ve_items(id) ON DELETE CASCADE,
  line_item_id   uuid    REFERENCES line_items(id) ON DELETE SET NULL,
  description    text,
  current_cost   numeric NOT NULL DEFAULT 0,
  proposed_cost  numeric NOT NULL DEFAULT 0,
  delta          numeric GENERATED ALWAYS AS (proposed_cost - current_cost) STORED,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Budget Events ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budget_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type          text        NOT NULL
                            CHECK (type IN (
                              'original_budget','budget_amendment','ve_adjustment',
                              'change_order','contingency_draw','scope_change',
                              'escalation_adjustment'
                            )),
  description   text        NOT NULL,
  amount        numeric     NOT NULL DEFAULT 0,
  running_total numeric     NOT NULL DEFAULT 0,
  created_by    uuid        REFERENCES profiles(id),
  event_date    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE ve_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ve_item_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ve_items_project_access" ON ve_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = ve_items.project_id
        AND (p.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "ve_item_lines_access" ON ve_item_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ve_items vi
      JOIN projects p ON p.id = vi.project_id
      WHERE vi.id = ve_item_lines.ve_item_id
        AND (p.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "budget_events_project_access" ON budget_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = budget_events.project_id
        AND (p.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ))
    )
  );

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ve_items_project_id      ON ve_items(project_id);
CREATE INDEX IF NOT EXISTS ve_items_scenario_id     ON ve_items(scenario_id);
CREATE INDEX IF NOT EXISTS ve_item_lines_ve_item_id ON ve_item_lines(ve_item_id);
CREATE INDEX IF NOT EXISTS budget_events_project_id ON budget_events(project_id, event_date);
