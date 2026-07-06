-- Jalankan setelah aplikasi versi terbaru dideploy.
-- Kolom yang disisakan untuk public.transactions:
-- id, created_at, status, approval_type, code,
-- assigned_manager_email, assigned_director_email,
-- approval_request_reason,
-- manager_approved, director_approved,
-- manager_approval_date, director_approval_date,
-- manager_approval_reason, director_approval_reason.

alter table public.transactions
  drop column if exists school_name,
  drop column if exists po_number,
  drop column if exists transaction_amount,
  drop column if exists bm_percentage,
  drop column if exists bm_splits,
  drop column if exists cabang,
  drop column if exists nama_siplah,
  drop column if exists produk,
  drop column if exists rekanan_type,
  drop column if exists nama_rekanan,
  drop column if exists bank_name,
  drop column if exists account_number,
  drop column if exists account_owner,
  drop column if exists reason_for_approval,
  drop column if exists is_printed,
  drop column if exists attachment_url;
