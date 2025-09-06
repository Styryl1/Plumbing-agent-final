-- Tracks the last read timestamp per user per conversation (org-scoped)
create table if not exists wa_read_markers (
  org_id text not null references organizations(id),
  user_id uuid not null,
  conversation_id uuid not null references wa_conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id, conversation_id)
);

create index if not exists idx_wa_read_markers_org_user on wa_read_markers(org_id, user_id);
create index if not exists idx_wa_read_markers_convo on wa_read_markers(conversation_id);

-- RLS
alter table wa_read_markers enable row level security;

-- Org isolation + user ownership (adjust to your auth claim helpers if different)
do $$ begin
  create policy wa_read_markers_select on wa_read_markers
    for select using (
      org_id = (auth.jwt()->>'org_id')::text
      and user_id = auth.uid()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy wa_read_markers_upsert on wa_read_markers
    for all using (
      org_id = (auth.jwt()->>'org_id')::text
      and user_id = auth.uid()
    ) with check (
      org_id = (auth.jwt()->>'org_id')::text
      and user_id = auth.uid()
    );
exception when duplicate_object then null; end $$;