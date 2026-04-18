ALTER TABLE line_items ADD COLUMN IF NOT EXISTS ai_advice jsonb;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id);
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS trade text;

CREATE TABLE IF NOT EXISTS trade_scopes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES scenarios(id) ON DELETE CASCADE,
  trade       text NOT NULL,
  scope_json  jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (scenario_id, trade)
);
