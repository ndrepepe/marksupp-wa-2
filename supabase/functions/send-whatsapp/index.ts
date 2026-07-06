// @ts-ignore: Deno imports are not recognized by the app TS compiler
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore: Deno imports are not recognized by the app TS compiler
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ApprovalRole = "MANAGER" | "DIREKTUR";

interface WhatsAppRecipient {
  role?: ApprovalRole | string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}

const normalizePhoneNumber = (phone?: string | null) => {
  if (!phone) return "";

  let normalized = phone.replace(/[^0-9]/g, "");
  if (normalized.startsWith("0")) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith("8")) {
    normalized = `62${normalized}`;
  }

  return normalized;
};

const needsRoleApproval = (approvalType: string | undefined, role: ApprovalRole) => {
  const type = approvalType || "NONE";
  return type === role || type === "BOTH";
};

const buildApprovalMessage = (body: any, recipient: WhatsAppRecipient) => {
  const roleLabel = recipient.role === "DIREKTUR" ? "Direktur" : "Manager";

  return `Permintaan Approval Transaksi\n\n` +
    `Yth. ${roleLabel}, terdapat transaksi yang membutuhkan persetujuan Anda.\n\n` +
    `\n` +
    `Kode: ${body.code || "-"}\n` +
    `\n` +
    `Silakan login ke aplikasi Grand Line Manager untuk melakukan approval.\n\n` +
    `Pesan otomatis dari Grand Line Manager`;
};

const buildDefaultMessage = (body: any) => {
  if (body.message) return body.message;

  return `*Transaksi Baru*\n\n` +
    `Kode: ${body.code || "-"}\n\n` +
    `Status: ${body.status || "DIAJUKAN"}\n\n` +
    `_Pesan otomatis dari Grand Line Manager_`;
};

const loadApproversFromAuth = async (body: any): Promise<WhatsAppRecipient[]> => {
  const recipients: WhatsAppRecipient[] = [];

  if (needsRoleApproval(body.approval_type, "MANAGER") && body.assigned_manager_email) {
    recipients.push({ role: "MANAGER", email: body.assigned_manager_email });
  }

  if (needsRoleApproval(body.approval_type, "DIREKTUR") && body.assigned_director_email) {
    recipients.push({ role: "DIREKTUR", email: body.assigned_director_email });
  }

  if (recipients.length === 0) return [];

  // @ts-ignore: Deno is available in the runtime
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore: Deno is available in the runtime
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diatur di Supabase Secrets.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) throw error;

  return recipients.map((recipient) => {
    const user = data.users.find((item: any) => item.email?.toLowerCase() === recipient.email?.toLowerCase());
    return {
      ...recipient,
      name: user?.user_metadata?.nama || user?.email || recipient.email,
      phone: user?.user_metadata?.no_hp || null,
    };
  });
};

const sendFonnteMessage = async (
  token: string,
  target: string,
  message: string,
) => {
  const formData = new FormData();
  formData.append("target", target);
  formData.append("message", message);
  formData.append("delay", "2");

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || result.status === false) {
    throw new Error(result.reason || result.message || "Fonnte gagal mengirim pesan.");
  }

  return result;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[send-whatsapp] Request diterima:", {
      notification_type: body.notification_type || "general",
      approval_type: body.approval_type || null,
      manager: body.assigned_manager_email || null,
      director: body.assigned_director_email || null,
      has_custom_message: !!body.message,
    });
    // @ts-ignore: Deno is available in the runtime
    const fonnteToken = (Deno.env.get("FONNTE_TOKEN") || Deno.env.get("WHATSAPP_API_KEY"))?.trim();

    if (!fonnteToken) {
      throw new Error("FONNTE_TOKEN atau WHATSAPP_API_KEY belum diatur di Supabase Secrets.");
    }

    let recipients: WhatsAppRecipient[] = [];

    if (body.notification_type === "approval_request") {
      recipients = body.recipients?.length ? body.recipients : await loadApproversFromAuth(body);
    } else {
      // @ts-ignore: Deno is available in the runtime
      const fallbackTarget = body.target || body.target_number || Deno.env.get("WHATSAPP_TARGET_NUMBER");
      recipients = [{ role: "GENERAL", phone: fallbackTarget }];
    }

    const missingRecipients = recipients
      .filter((recipient) => !normalizePhoneNumber(recipient.phone))
      .map((recipient) => recipient.email || recipient.role || "penerima");

    if (missingRecipients.length > 0) {
      throw new Error(`Nomor HP belum tersedia untuk: ${missingRecipients.join(", ")}`);
    }

    const sent = [];
    for (const recipient of recipients) {
      const target = normalizePhoneNumber(recipient.phone);
      const message = body.notification_type === "approval_request"
        ? buildApprovalMessage(body, recipient)
        : buildDefaultMessage(body);

      const result = await sendFonnteMessage(fonnteToken, target, message);
      console.log("[send-whatsapp] Pesan terkirim:", {
        role: recipient.role,
        email: recipient.email || null,
        target,
      });
      sent.push({
        role: recipient.role,
        email: recipient.email,
        target,
        result,
      });
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[send-whatsapp] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
