import { supabase } from "@/integrations/supabase/client";

type ApprovalType = "NONE" | "MANAGER" | "DIREKTUR" | "BOTH" | string;
const STAFF_INPUT_WHATSAPP_TARGET = "+628112839964";

interface ApprovalNotificationPayload {
  code?: string;
  status?: string;
  approval_type?: ApprovalType;
  assigned_manager_email?: string | null;
  assigned_director_email?: string | null;
  approval_request_reason?: string | null;
}

export const shouldNotifyApprovers = (data: ApprovalNotificationPayload) => {
  const approvalType = data.approval_type || "NONE";
  return (
    (approvalType === "MANAGER" && !!data.assigned_manager_email) ||
    (approvalType === "DIREKTUR" && !!data.assigned_director_email) ||
    (approvalType === "BOTH" && (!!data.assigned_manager_email || !!data.assigned_director_email))
  );
};

export const sendApprovalWhatsAppNotification = async (data: ApprovalNotificationPayload) => {
  if (!shouldNotifyApprovers(data)) return;

  const { error } = await supabase.functions.invoke("send-whatsapp", {
    body: {
      notification_type: "approval_request",
      code: data.code,
      status: data.status,
      approval_type: data.approval_type,
      assigned_manager_email: data.assigned_manager_email,
      assigned_director_email: data.assigned_director_email,
      approval_request_reason: data.approval_request_reason,
    },
  });

  if (error) throw error;
};

export const buildStaffInputWhatsAppMessage = (code?: string) => {
  return `Transaksi Baru\n\n\n` +
    `Kode: ${code || "-"}\n\n` +
    `Pesan otomatis dari Grand Line Manager`;
};

export const sendStaffInputWhatsAppNotification = async (code?: string) => {
  const { error } = await supabase.functions.invoke("send-whatsapp", {
    body: {
      target: STAFF_INPUT_WHATSAPP_TARGET,
      message: buildStaffInputWhatsAppMessage(code),
    },
  });

  if (error) throw error;
};
