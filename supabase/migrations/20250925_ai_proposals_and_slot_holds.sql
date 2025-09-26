create table if not exists public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  intake_id uuid,
  customer_id uuid,
  locale text not null check (locale in ('en','nl')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  status text not null default 'new' check (status in ('new','applied','dismissed')),
  payload jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.ai_proposals (org_id, status, created_at desc);

create table if not exists public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  resource_id uuid, -- nullable: generic team
  proposal_id uuid references public.ai_proposals(id) on delete cascade,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  expires_at timestamptz not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.slot_holds (org_id, expires_at);
create index on public.slot_holds (proposal_id);

-- RLS
alter table public.ai_proposals enable row level security;
alter table public.slot_holds enable row level security;

create policy org_read_ai_proposals on public.ai_proposals
  for select using (auth.uid() is not null and org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
create policy org_write_ai_proposals on public.ai_proposals
  for insert with check (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
create policy org_update_ai_proposals on public.ai_proposals
  for update using (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);

create policy org_read_slot_holds on public.slot_holds
  for select using (auth.uid() is not null and org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
create policy org_write_slot_holds on public.slot_holds
  for insert with check (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
create policy org_update_slot_holds on public.slot_holds
  for update using (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
create policy org_delete_slot_holds on public.slot_holds
  for delete using (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
