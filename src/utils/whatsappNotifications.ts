import { supabase } from "@/integrations/supabase/client";

type ApprovalType = "NONE" | "MANAGER" | "DIREKTUR" | "BOTH" | string;

interface ApprovalNotificationPayload {
  code?: string;
  approval_type?: ApprovalType;
  assigned_manager_email?: string | null;
  assigned_director_email?: string | null;
  reason_for_approval?: string | null;
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
      approval_type: data.approval_type,
      assigned_manager_email: data.assigned_manager_email,
      assigned_director_email: data.assigned_director_email,
      reason_for_approval: data.reason_for_approval,
    },
  });

  if (error) throw error;
};
