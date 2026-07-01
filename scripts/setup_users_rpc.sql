-- Hapus fungsi lama terlebih dahulu untuk menghindari bentrok tipe data
DROP FUNCTION IF EXISTS list_users_admin();
DROP FUNCTION IF EXISTS create_user_admin(text, text, text);
DROP FUNCTION IF EXISTS update_user_role_admin(uuid, text);
DROP FUNCTION IF EXISTS update_user_password_admin(uuid, text);
DROP FUNCTION IF EXISTS delete_user_admin(uuid);
DROP FUNCTION IF EXISTS get_approvers();
DROP FUNCTION IF EXISTS update_user_profile_admin(uuid, text, text);

-- 1. Fungsi untuk mengambil daftar pengguna (Hanya untuk Super Admin)
CREATE OR REPLACE FUNCTION list_users_admin()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
  -- Proteksi keamanan: Hanya email salmon@pepenio.my.id yang boleh memanggil
  IF auth.jwt() ->> 'email' <> 'salmon@pepenio.my.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang diizinkan.';
  END IF;

  RETURN QUERY 
  SELECT u.id, u.email, u.raw_user_meta_data, u.created_at 
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- 2. Fungsi untuk membuat pengguna baru langsung ke tabel Auth
CREATE OR REPLACE FUNCTION create_user_admin(
  user_email TEXT,
  user_password TEXT,
  user_role TEXT,
  user_nama TEXT DEFAULT NULL,
  user_no_hp TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
  meta_data JSONB;
BEGIN
  -- Proteksi keamanan
  IF auth.jwt() ->> 'email' <> 'salmon@pepenio.my.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang diizinkan.';
  END IF;

  -- Enkripsi password menggunakan enkripsi bawaan Supabase
  encrypted_pw := crypt(user_password, gen_salt('bf'));

  -- Bangun meta data dengan role, nama, dan no_hp
  meta_data := jsonb_build_object('role', user_role);
  IF user_nama IS NOT NULL AND user_nama <> '' THEN
    meta_data := meta_data || jsonb_build_object('nama', user_nama);
  END IF;
  IF user_no_hp IS NOT NULL AND user_no_hp <> '' THEN
    meta_data := meta_data || jsonb_build_object('no_hp', user_no_hp);
  END IF;

  -- Masukkan data ke tabel auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    encrypted_pw,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    meta_data,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Buat identitas user agar bisa login menggunakan email & password
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', user_email),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );
END;
$$;

-- 3. Fungsi untuk memperbarui Role pengguna
CREATE OR REPLACE FUNCTION update_user_role_admin(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
  -- Proteksi keamanan
  IF auth.jwt() ->> 'email' <> 'salmon@pepenio.my.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang diizinkan.';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role))
  WHERE id = target_user_id;
END;
$$;

-- 4. Fungsi untuk mengganti Password pengguna
CREATE OR REPLACE FUNCTION update_user_password_admin(
  target_user_id UUID,
  new_password TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  encrypted_pw TEXT;
BEGIN
  -- Proteksi keamanan
  IF auth.jwt() ->> 'email' <> 'salmon@pepenio.my.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang diizinkan.';
  END IF;

  encrypted_pw := crypt(new_password, gen_salt('bf'));

  UPDATE auth.users
  SET encrypted_password = encrypted_pw,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- 5. Fungsi untuk menghapus pengguna secara permanen
CREATE OR REPLACE FUNCTION delete_user_admin(
  target_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
  -- Proteksi keamanan
  IF auth.jwt() ->> 'email' <> 'salmon@pepenio.my.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang diizinkan.';
  END IF;

  -- Hapus identitas terlebih dahulu karena relasi foreign key
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 6. Fungsi publik/authenticated untuk mengambil daftar email & role approver secara aman
CREATE OR REPLACE FUNCTION get_approvers()
RETURNS TABLE (
  email VARCHAR,
  role TEXT
)
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hanya izinkan pengguna yang sudah login (authenticated)
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Akses ditolak: Silakan login terlebih dahulu.';
  END IF;

  RETURN QUERY
  SELECT 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'role', 'STAFF') as role
  FROM auth.users u
  WHERE u.raw_user_meta_data->>'role' IS NOT NULL;
END;
$$;

-- 7. Fungsi untuk memperbarui profil pengguna (Nama dan No HP)
CREATE OR REPLACE FUNCTION update_user_profile_admin(
  target_user_id UUID,
  user_nama TEXT,
  user_no_hp TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  current_meta JSONB;
BEGIN
  -- Proteksi keamanan
  IF auth.jwt() ->> 'email' <> 'salmon@pepenio.my.id' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang diizinkan.';
  END IF;

  -- Ambil meta data yang ada
  SELECT raw_user_meta_data INTO current_meta FROM auth.users WHERE id = target_user_id;
  
  -- Update nama dan no_hp di dalam meta data
  current_meta := COALESCE(current_meta, '{}'::jsonb);
  
  IF user_nama IS NOT NULL THEN
    current_meta := jsonb_set(current_meta, '{nama}', to_jsonb(user_nama));
  END IF;
  
  IF user_no_hp IS NOT NULL THEN
    current_meta := jsonb_set(current_meta, '{no_hp}', to_jsonb(user_no_hp));
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = current_meta,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Berikan izin eksekusi ke pengguna yang terautentikasi
GRANT EXECUTE ON FUNCTION get_approvers() TO authenticated;