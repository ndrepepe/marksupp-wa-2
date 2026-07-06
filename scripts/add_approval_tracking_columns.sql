alter table public.transactions
  add column if not exists manager_approval_date timestamptz,
  add column if not exists director_approval_date timestamptz,
  add column if not exists manager_approval_reason text,
  add column if not exists director_approval_reason text;
