alter table public.transactions
  add column if not exists approval_request_reason text;
