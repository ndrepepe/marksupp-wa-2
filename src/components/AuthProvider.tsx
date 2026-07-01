import * as React from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/utils/logger";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: string;
  updateRole: (newRole: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<string>("STAFF");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Ambil sesi awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const isSuperAdmin = currentUser.email?.toLowerCase() === "salmon@pepenio.my.id";
        setRole(isSuperAdmin ? "SUPER_ADMIN" : (currentUser.user_metadata?.role || "STAFF"));
      }
      setLoading(false);
    });

    // Dengar perubahan status auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const isSuperAdmin = currentUser.email?.toLowerCase() === "salmon@pepenio.my.id";
        setRole(isSuperAdmin ? "SUPER_ADMIN" : (currentUser.user_metadata?.role || "STAFF"));
        
        if (event === "SIGNED_IN") {
          logActivity("LOGIN", { email: currentUser.email });
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fitur Otomatis Logout setelah 3 menit tidak ada aktivitas
  React.useEffect(() => {
    if (!session || !user) return;

    let timeoutId: NodeJS.Timeout;

    const handleAutoLogout = async () => {
      await logActivity("LOGOUT", { email: user.email, reason: "Inactivity timeout" });
      await supabase.auth.signOut();
      toast.error("Sesi Anda telah berakhir karena tidak ada aktivitas selama 3 menit.", {
        duration: 6000,
      });
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleAutoLogout, 3 * 60 * 1000); // 3 menit
    };

    // Daftar event aktivitas pengguna
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Inisialisasi timer pertama kali
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, user]);

  const updateRole = async (newRole: string) => {
    if (!user) return;
    const { data, error } = await supabase.auth.updateUser({
      data: { role: newRole }
    });
    if (error) throw error;
    setRole(newRole);
  };

  const signOut = async () => {
    if (user) {
      await logActivity("LOGOUT", { email: user.email });
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, role, updateRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};