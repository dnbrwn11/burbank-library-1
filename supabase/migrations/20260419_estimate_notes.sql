-- Exclusions, qualifications, and clarifications for cost estimates

create table if not exists estimate_notes (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references projects(id) on delete cascade,
  scenario_id uuid        references scenarios(id) on delete cascade,
  type        text        not null check (type in ('exclusion', 'qualification', 'clarification')),
  text        text        not null default '',
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table estimate_notes enable row level security;

create policy "estimate_notes_project_access" on estimate_notes
  for all using (
    exists (
      select 1 from projects p
      where p.id = estimate_notes.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

create index if not exists estimate_notes_project_id  on estimate_notes(project_id);
create index if not exists estimate_notes_scenario_id on estimate_notes(scenario_id);
