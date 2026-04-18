-- Trade partner bidding tables
-- Run this in the Supabase SQL editor to enable the bidding portal.

-- bid_packages: a scope bundle sent out for competitive pricing
create table if not exists bid_packages (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id) on delete cascade,
  name         text        not null,
  description  text,
  scope        text,
  due_date     date,
  status       text        not null default 'active'
                           check (status in ('draft', 'active', 'closed')),
  created_by   uuid        not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- bid_invitations: outbound invites sent to trade partners / subs
create table if not exists bid_invitations (
  id         uuid        primary key default gen_random_uuid(),
  package_id uuid        not null references bid_packages(id) on delete cascade,
  project_id uuid        not null references projects(id) on delete cascade,
  email      text        not null,
  name       text,
  company    text,
  token      text        unique not null,
  status     text        not null default 'pending'
                         check (status in ('pending', 'submitted', 'declined')),
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

-- bid_submissions: pricing received from trade partners
create table if not exists bid_submissions (
  id                uuid        primary key default gen_random_uuid(),
  invitation_id     uuid        references bid_invitations(id) on delete set null,
  package_id        uuid        not null references bid_packages(id) on delete cascade,
  project_id        uuid        not null references projects(id) on delete cascade,
  submitter_name    text,
  submitter_email   text,
  submitter_company text,
  amount_low        numeric,
  amount_mid        numeric,
  amount_high       numeric,
  notes             text,
  qualifications    text,
  is_awarded        boolean     not null default false,
  submitted_at      timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- Row-level security ---------------------------------------------------------

alter table bid_packages   enable row level security;
alter table bid_invitations enable row level security;
alter table bid_submissions enable row level security;

-- Project owners and members can read/write bid_packages
create policy "bid_packages_project_access" on bid_packages
  for all using (
    auth.uid() = created_by
    or exists (
      select 1 from projects p
      where p.id = bid_packages.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

create policy "bid_invitations_project_access" on bid_invitations
  for all using (
    exists (
      select 1 from projects p
      where p.id = bid_invitations.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

create policy "bid_submissions_project_access" on bid_submissions
  for all using (
    exists (
      select 1 from projects p
      where p.id = bid_submissions.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
    )
  );

-- Indexes
create index if not exists bid_packages_project_id   on bid_packages(project_id);
create index if not exists bid_invitations_package_id on bid_invitations(package_id);
create index if not exists bid_invitations_token      on bid_invitations(token);
create index if not exists bid_submissions_package_id on bid_submissions(package_id);
