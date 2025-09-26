create extension if not exists vector;

alter table public.manuals
  add column if not exists source_domain text,
  add column if not exists source_url text,
  add column if not exists created_by uuid,
  add column if not exists safety_tags text[];

create table if not exists public.manual_files (
  id uuid primary key default gen_random_uuid(),
  manual_id uuid not null references public.manuals(id) on delete cascade,
  storage_path text not null,
  page_count int,
  bytes bigint,
  mime text default 'application/pdf',
  language text,
  version text,
  checksum text,
  created_at timestamptz not null default now()
);
create index if not exists manual_files_manual_idx on public.manual_files (manual_id);

create table if not exists public.manual_chunks (
  id uuid primary key default gen_random_uuid(),
  manual_id uuid not null references public.manuals(id) on delete cascade,
  page int not null,
  chunk_idx int not null,
  content text not null,
  section text,
  embedding vector(1536)
);
create index if not exists manual_chunks_lookup_idx on public.manual_chunks (manual_id, page, chunk_idx);

create table if not exists public.manual_jobs (
  job_id uuid not null,
  manual_id uuid not null references public.manuals(id) on delete cascade,
  primary key (job_id, manual_id)
);

create table if not exists public.manual_audit (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  job_id uuid,
  manual_id uuid,
  event text not null,
  meta jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists manual_audit_org_created_idx on public.manual_audit (org_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manuals', 'manuals', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = excluded.public;

drop policy if exists manual_files_select_org on public.manual_files;
drop policy if exists manual_files_insert_org on public.manual_files;
drop policy if exists manual_files_update_org on public.manual_files;
drop policy if exists manual_files_delete_org on public.manual_files;

alter table public.manual_files enable row level security;

create policy manual_files_select_org on public.manual_files
  for select using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_files.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_files_insert_org on public.manual_files
  for insert with check (
    exists (
      select 1 from public.manuals m
      where m.id = manual_files.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_files_update_org on public.manual_files
  for update using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_files.manual_id
        and m.org_id = current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.manuals m
      where m.id = manual_files.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_files_delete_org on public.manual_files
  for delete using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_files.manual_id
        and m.org_id = current_org_id()
    )
  );

drop policy if exists manual_chunks_select_org on public.manual_chunks;
drop policy if exists manual_chunks_insert_org on public.manual_chunks;
drop policy if exists manual_chunks_update_org on public.manual_chunks;
drop policy if exists manual_chunks_delete_org on public.manual_chunks;

alter table public.manual_chunks enable row level security;

create policy manual_chunks_select_org on public.manual_chunks
  for select using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_chunks.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_chunks_insert_org on public.manual_chunks
  for insert with check (
    exists (
      select 1 from public.manuals m
      where m.id = manual_chunks.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_chunks_update_org on public.manual_chunks
  for update using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_chunks.manual_id
        and m.org_id = current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.manuals m
      where m.id = manual_chunks.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_chunks_delete_org on public.manual_chunks
  for delete using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_chunks.manual_id
        and m.org_id = current_org_id()
    )
  );

drop policy if exists manual_jobs_select_org on public.manual_jobs;
drop policy if exists manual_jobs_insert_org on public.manual_jobs;
drop policy if exists manual_jobs_delete_org on public.manual_jobs;

alter table public.manual_jobs enable row level security;

create policy manual_jobs_select_org on public.manual_jobs
  for select using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_jobs.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_jobs_insert_org on public.manual_jobs
  for insert with check (
    exists (
      select 1 from public.manuals m
      where m.id = manual_jobs.manual_id
        and m.org_id = current_org_id()
    )
  );
create policy manual_jobs_delete_org on public.manual_jobs
  for delete using (
    exists (
      select 1 from public.manuals m
      where m.id = manual_jobs.manual_id
        and m.org_id = current_org_id()
    )
  );

drop policy if exists manual_audit_select_org on public.manual_audit;
drop policy if exists manual_audit_insert_org on public.manual_audit;
drop policy if exists manual_audit_delete_org on public.manual_audit;

alter table public.manual_audit enable row level security;

create policy manual_audit_select_org on public.manual_audit
  for select using (
    org_id = current_org_id()
  );
create policy manual_audit_insert_org on public.manual_audit
  for insert with check (
    org_id = current_org_id()
  );
create policy manual_audit_delete_org on public.manual_audit
  for delete using (
    org_id = current_org_id()
  );

