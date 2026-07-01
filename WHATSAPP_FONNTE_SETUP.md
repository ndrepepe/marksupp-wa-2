# Setup Notifikasi WhatsApp Fonnte

Integrasi notifikasi approval memakai Supabase Edge Function `send-whatsapp`.

## Secret yang dibutuhkan

Atur secret berikut di Supabase:

```bash
supabase secrets set FONNTE_TOKEN="token_fonnte_anda"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service_role_key_supabase_anda"
```

Jika masih ingin memakai notifikasi umum seperti ringkasan import masal, tambahkan nomor fallback:

```bash
supabase secrets set WHATSAPP_TARGET_NUMBER="628xxxxxxxxxx"
```

`WHATSAPP_API_KEY` lama masih didukung sebagai fallback, tetapi nama baru yang disarankan adalah `FONNTE_TOKEN`.

## Cara kerja

- Saat transaksi baru dibuat dan `approval_type` adalah `MANAGER`, `DIREKTUR`, atau `BOTH`, aplikasi memanggil function `send-whatsapp`.
- Function menerima email manager/direktur yang ditugaskan.
- Function mengambil `no_hp` dari `raw_user_meta_data` user Supabase Auth menggunakan service role.
- Pesan dikirim lewat Fonnte ke nomor manager dan/atau direktur yang sesuai.
- Saat transaksi diedit, notifikasi dikirim lagi hanya jika tipe approval atau approver yang ditugaskan berubah.

Pastikan setiap akun manager/direktur memiliki `no_hp` di menu manajemen user.

## Deploy function

```bash
supabase functions deploy send-whatsapp
```
