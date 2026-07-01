import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Anchor } from "lucide-react";

const Login = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#640D5F] via-[#B12C00] to-[#EB5B00]">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
      
      <Card className="w-full max-w-md shadow-2xl border-none relative z-10 bg-white/95 backdrop-blur-md overflow-hidden rounded-[2rem]">
        <div className="h-3 bg-gradient-to-r from-[#640D5F] via-[#EB5B00] to-[#FFCC00] w-full" />
        <CardHeader className="space-y-2 text-center pt-10">
          <div className="mx-auto bg-primary w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl shadow-primary/30 rotate-3">
            <Anchor className="w-10 h-10" />
          </div>
          <CardTitle className="text-4xl font-black tracking-tighter text-slate-900">
            GRAND LINE
          </CardTitle>
          <p className="text-sm text-primary font-bold uppercase tracking-widest">
            Transaction Portal
          </p>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <Auth
            supabaseClient={supabase}
            view="sign_in"
            showLinks={false}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--secondary))',
                    inputBackground: 'white',
                    inputText: 'black',
                    inputPlaceholder: 'gray',
                  },
                  radii: {
                    borderRadiusButton: '1rem',
                    inputBorderRadius: '1rem',
                  }
                }
              }
            }}
            providers={[]}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Alamat Email',
                  password_label: 'Kata Sandi',
                  button_label: 'Masuk Sekarang',
                  loading_button_label: 'Memproses...',
                  social_provider_text: 'Masuk dengan {{provider}}',
                  link_text: 'Sudah punya akun? Masuk',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;