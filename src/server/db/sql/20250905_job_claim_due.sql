-- Atomic claim for invoice status refresh jobs
-- SECURITY DEFINER so it can bypass RLS in a narrow scope.
create or replace function job_claim_due(p_batch int default 20)
returns table (
  id uuid,
  invoice_id uuid,
  provider text,
  external_id text,
  attempts int,
  max_attempts int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with cte as (
    select q.id
    from invoice_status_refresh_queue q
    where q.run_after <= now()
    order by q.run_after asc
    for update skip locked
    limit p_batch
  )
  update invoice_status_refresh_queue q
     set run_after = now() -- mark as claimed
  from cte
  where q.id = cte.id
  returning q.id, q.invoice_id, q.provider, q.external_id, q.attempts, q.max_attempts;
end $$;

comment on function job_claim_due is
'Atomically claims due refresh jobs using FOR UPDATE SKIP LOCKED and marks them as claimed.';