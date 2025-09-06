-- Invoice daily snapshots table for reporting
-- Stores aggregated daily metrics per org without PII
create table if not exists invoice_daily_snapshots (
  snapshot_date date not null,
  org_id uuid not null,
  total_invoices int not null default 0,
  sent_count int not null default 0,
  paid_count int not null default 0,
  revenue_paid_cents bigint not null default 0,
  revenue_outstanding_cents bigint not null default 0,
  overdue_count int not null default 0,
  overdue_cents bigint not null default 0,
  aging_0_7_cents bigint not null default 0,
  aging_8_30_cents bigint not null default 0,
  aging_31_60_cents bigint not null default 0,
  aging_61_plus_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_daily_snapshots_pk primary key (org_id, snapshot_date)
);

-- Indexes for range queries
create index if not exists idx_invoice_daily_snapshots_date 
on invoice_daily_snapshots (snapshot_date);

create index if not exists idx_invoice_daily_snapshots_org_date 
on invoice_daily_snapshots (org_id, snapshot_date);

-- Add foreign key constraint to organizations
alter table invoice_daily_snapshots 
add constraint fk_invoice_daily_snapshots_org
foreign key (org_id) references organizations (id) on delete cascade;

-- Security: Use SECURITY INVOKER to inherit RLS from source queries
-- This table stores only aggregates (no PII), but source reads must respect RLS
comment on table invoice_daily_snapshots is 'Daily invoice snapshots per org - aggregated data only, no PII';