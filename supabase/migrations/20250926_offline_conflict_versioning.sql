-- Add conflict tracking for offline sync reconciliation
alter table public.jobs
  add column if not exists conflict_flag boolean not null default false,
  add column if not exists conflict_snapshot jsonb;

-- Ensure updated_at is populated for existing rows so it can be used as a version token
update public.jobs
set updated_at = coalesce(updated_at, timezone('utc', now()));

-- Helpful index for dashboards reviewing conflicts
create index if not exists jobs_conflict_flag_idx
  on public.jobs (conflict_flag)
  where conflict_flag = true;

comment on column public.jobs.conflict_flag is
  'Indicates whether the job has unresolved field-level conflicts between organiser and plumber updates.';
comment on column public.jobs.conflict_snapshot is
  'JSON payload capturing the server and client values involved in the most recent conflict reconciliation.';
