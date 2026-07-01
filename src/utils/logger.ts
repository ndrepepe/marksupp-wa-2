import { supabase } from "@/integrations/supabase/client";

export const logActivity = async (action: string, details: any = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Menyimpan log ke tabel activity_logs secara asinkron
    await supabase.from("activity_logs").insert({
      user_email: user.email,
      action: action,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (error) {
    // Gagal mencatat log tidak boleh menghentikan alur utama aplikasi
    console.error("Gagal mencatat aktivitas:", error);
  }
};