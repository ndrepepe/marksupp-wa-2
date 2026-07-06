"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/utils/logger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ThumbsUp, FileText, Calendar, KeyRound, MessageSquareText } from "lucide-react";

interface TransactionPreviewDialogProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TransactionPreviewDialog = ({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: TransactionPreviewDialogProps) => {
  const { role } = useAuth();
  const [isApproving, setIsApproving] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");

  if (!transaction) return null;

  const handleApprove = async () => {
    if (!approvalReason.trim()) {
      toast.error("Alasan approve wajib diisi");
      return;
    }

    setIsApproving(true);
    try {
      const updates: any = {};
      const approvedAt = new Date().toISOString();

      if (role === "MANAGER") {
        updates.manager_approved = true;
        updates.manager_approval_date = approvedAt;
        updates.manager_approval_reason = approvalReason.trim();
      } else if (role === "DIREKTUR") {
        updates.director_approved = true;
        updates.director_approval_date = approvedAt;
        updates.director_approval_reason = approvalReason.trim();
      }

      const willBeManagerApproved = role === "MANAGER" ? true : transaction.manager_approved;
      const willBeDirectorApproved = role === "DIREKTUR" ? true : transaction.director_approved;
      const approvalType = transaction.approval_type || "BOTH";

      let isFullyApproved = false;
      if (approvalType === "MANAGER" && willBeManagerApproved) isFullyApproved = true;
      if (approvalType === "DIREKTUR" && willBeDirectorApproved) isFullyApproved = true;
      if (approvalType === "BOTH" && willBeManagerApproved && willBeDirectorApproved) isFullyApproved = true;

      if (isFullyApproved) {
        updates.status = "DISETUJUI";
      }

      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", transaction.id);

      if (error) throw error;

      await logActivity("APPROVE_TRANSACTION", {
        transaction_id: transaction.id,
        code: transaction.code,
        role,
        reason: approvalReason.trim(),
        approved_at: approvedAt,
        fully_approved: isFullyApproved,
      });

      toast.success("Transaksi berhasil disetujui!");
      setApprovalReason("");
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error approving transaction:", error);
      toast.error("Gagal menyetujui transaksi: " + error.message);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl overflow-hidden p-0 border-none shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 pb-4 border-b border-primary/5">
          <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Detail Approval Transaksi
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Tanggal
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(transaction.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Kode Transaksi
              </span>
              <p className="text-sm font-mono font-bold text-primary">{transaction.code}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Status</span>
              <Badge variant={transaction.status === "DIBATALKAN" ? "destructive" : "outline"}>
                {transaction.status || "DIAJUKAN"}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Approval</span>
              <span className="text-xs font-bold text-slate-800">{transaction.approval_type || "NONE"}</span>
            </div>
            {(transaction.approval_type === "MANAGER" || transaction.approval_type === "BOTH") && (
              <div className="py-2 border-b border-slate-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Manager</span>
                  <Badge variant={transaction.manager_approved ? "default" : "outline"}>
                    {transaction.manager_approved ? "Approved" : "Pending"}
                  </Badge>
                </div>
                {transaction.manager_approval_date && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(transaction.manager_approval_date).toLocaleString("id-ID")}
                  </p>
                )}
                {transaction.manager_approval_reason && (
                  <p className="text-xs text-slate-700 whitespace-pre-line">{transaction.manager_approval_reason}</p>
                )}
              </div>
            )}
            {(transaction.approval_type === "DIREKTUR" || transaction.approval_type === "BOTH") && (
              <div className="py-2 border-b border-slate-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Direktur</span>
                  <Badge variant={transaction.director_approved ? "default" : "outline"}>
                    {transaction.director_approved ? "Approved" : "Pending"}
                  </Badge>
                </div>
                {transaction.director_approval_date && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(transaction.director_approval_date).toLocaleString("id-ID")}
                  </p>
                )}
                {transaction.director_approval_reason && (
                  <p className="text-xs text-slate-700 whitespace-pre-line">{transaction.director_approval_reason}</p>
                )}
              </div>
            )}
          </div>

          {(role === "MANAGER" || role === "DIREKTUR") && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <Label htmlFor="approval-reason" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <MessageSquareText className="w-3.5 h-3.5" />
                Alasan Approve <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="approval-reason"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Tuliskan alasan approve transaksi ini..."
                className="bg-white min-h-[90px] text-xs rounded-xl"
              />
            </div>
          )}
        </div>

        <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100 flex flex-row items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-9 px-4"
          >
            Tutup
          </Button>
          {(role === "MANAGER" || role === "DIREKTUR") && (
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={isApproving || !approvalReason.trim()}
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs h-9 px-4 flex items-center gap-1.5"
            >
              {isApproving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ThumbsUp className="w-3.5 h-3.5" />
              )}
              Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionPreviewDialog;
