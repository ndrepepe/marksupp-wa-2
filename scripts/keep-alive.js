import { createClient } from '@supabase/supabase-js';

// Mengambil konfigurasi dari environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[keep-alive] Error: SUPABASE_URL atau SUPABASE_ANON_KEY tidak ditemukan di environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pingDatabase() {
  console.log("[keep-alive] Memulai ping ke database...");
  
  // Melakukan query ringan: mengambil 1 ID dari tabel transactions
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .limit(1);

  if (error) {
    console.error("[keep-alive] Gagal melakukan ping:", error.message);
    process.exit(1);
  }

  console.log("[keep-alive] Berhasil! Database tetap aktif. Data ditemukan:", data.length > 0 ? "Ya" : "Tabel kosong (tetap terhitung aktif)");
}

pingDatabase();