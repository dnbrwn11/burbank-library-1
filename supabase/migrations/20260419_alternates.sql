-- Alternates management for cost estimates

create table if not exists alternates (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references projects(id) on delete cascade,
  scenario_id uuid        references scenarios(id) on delete cascade,
  number      integer     not null default 1,
  title       text        not null default '',
  description text,
  type        text        not null default 'add' check (type in ('add', 'deduct')),
  status      text        not null default 'priced' check (status in ('priced', 'accepted', 'rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists alternate_items (
  id                   uuid        primary key default gen_random_uuid(),
  alternate_id         uuid        not null references alternates(id) on delete cascade,
  line_item_id         uuid        references line_items(id) on delete set null,
  description          text        not null default '',
  quantity             numeric     not null default 1,
  unit_cost_adjustment numeric     not null default 0,
  total_adjustment     numeric     not null default 0,
  adjustment_type      text        not null default 'add' check (adjustment_type in ('add', 'deduct', 'replace')),
  created_at           timestamptz not null default now()
);

alter table alternates      enable row level security;
alter table alternate_items enable row level security;

create policy "alternates_project_access" on alternates
  for all using (
    exists (
      select 1 from projects p
      where p.id = alternates.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

create policy "alternate_items_access" on alternate_items
  for all using (
    exists (
      select 1 from alternates a
      join projects p on p.id = a.project_id
      where a.id = alternate_items.alternate_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

create index if not exists alternates_project_id  on alternates(project_id);
create index if not exists alternates_scenario_id on alternates(scenario_id);
create index if not exists alt_items_alternate_id on alternate_items(alternate_id);
