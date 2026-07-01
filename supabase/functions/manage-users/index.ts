// @ts-ignore: Deno imports are not recognized by standard TS compiler
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore: Deno imports are not recognized by standard TS compiler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // @ts-ignore: Deno is available in the runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore: Deno is available in the runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verifikasi apakah pemanggil adalah Super Admin (salmon@pepenio.my.id)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user || user.email?.toLowerCase() !== 'salmon@pepenio.my.id') {
      return new Response(JSON.stringify({ error: 'Hanya Super Admin yang diizinkan' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const { action, email, password, role, userId } = body

    if (action === 'list_users') {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
      if (error) throw error
      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'create_user') {
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email dan Password wajib diisi' }), { status: 400, headers: corsHeaders })
      }
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role || 'STAFF' }
      })
      if (error) throw error
      return new Response(JSON.stringify({ user: data.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update_user_role') {
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: 'User ID dan Role wajib diisi' }), { status: 400, headers: corsHeaders })
      }
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { role }
      })
      if (error) throw error
      return new Response(JSON.stringify({ user: data.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update_user_password') {
      if (!userId || !password) {
        return new Response(JSON.stringify({ error: 'User ID dan Password baru wajib diisi' }), { status: 400, headers: corsHeaders })
      }
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      })
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete_user') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID wajib diisi' }), { status: 400, headers: corsHeaders })
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Action tidak valid' }), { status: 400, headers: corsHeaders })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})