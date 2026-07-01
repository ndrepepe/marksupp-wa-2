"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ThumbsUp, FileText, Calendar, User, DollarSign, Percent, Landmark } from "lucide-react";

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
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Reset catatan persetujuan saat dialog dibuka/ditutup
  useEffect(() => {
    if (open) {
      setApprovalNotes("");
    }
  }, [open]);

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleApprove = async () => {
    if (!approvalNotes.trim()) {
      toast.error("Mohon isi catatan persetujuan terlebih dahulu!");
      return;
    }

    setIsApproving(true);
    try {
      const updates: any = {};
      const nowStr = new Date().toISOString();

      if (role === "MANAGER") {
        updates.manager_approved = true;
        updates.manager_approval_date = nowStr;
      } else if (role === "DIREKTUR") {
        updates.director_approved = true;
        updates.director_approval_date = nowStr;
      }

      // Simpan catatan persetujuan ke dalam kolom reason_for_approval yang sudah ada di database
      const currentReason = transaction.reason_for_approval || "";
      const notePrefix = role === "MANAGER" ? "[Catatan Manager]: " : "[Catatan Direktur]: ";
      updates.reason_for_approval = currentReason 
        ? `${currentReason}\n${notePrefix}${approvalNotes}`
        : `${notePrefix}${approvalNotes}`;

      // Cek apakah semua approval yang dibutuhkan sudah terpenuhi
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

      // Mencatat log aktivitas approval
      await logActivity("APPROVE_TRANSACTION", {
        transaction_id: transaction.id,
        school_name: transaction.school_name,
        po_number: transaction.po_number,
        role: role,
        notes: approvalNotes,
        fully_approved: isFullyApproved
      });

      toast.success("Transaksi berhasil disetujui!");
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
            Detail Pengajuan Transaksi
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Informasi Utama */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Tanggal Input
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(transaction.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Kode Transaksi
              </span>
              <p className="text-sm font-mono font-bold text-primary">
                {transaction.code}
              </p>
            </div>
          </div>

          {/* Detail Sekolah & PO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Sekolah & PO</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Nama Sekolah</span>
                <span className="text-xs font-bold text-slate-800">{transaction.school_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Cabang</span>
                <span className="text-xs font-bold text-slate-800">{transaction.cabang || "-"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Nomor PO</span>
                <span className="text-xs font-bold text-slate-800">{transaction.po_number}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Platform SIPLAH</span>
                <Badge variant="outline" className="text-[10px] font-bold">{transaction.nama_siplah}</Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Jenis Produk</span>
                <Badge className="text-[10px] font-bold">{transaction.produk}</Badge>
              </div>
            </div>
          </div>

          {/* Detail Keuangan */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rincian Keuangan</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Nominal Transaksi</span>
                <span className="text-sm font-black text-primary">{formatCurrency(transaction.transaction_amount)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> Persentase BM</span>
                <span className="text-xs font-bold text-slate-800">{transaction.bm_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Detail Rekanan & Bank */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Rekanan & Pembayaran</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Tipe Rekanan</span>
                <span className="text-xs font-bold text-slate-800">{transaction.rekanan_type}</span>
              </div>
              {transaction.rekanan_type === "REKANAN" && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Nama Rekanan</span>
                  <span className="text-xs font-bold text-slate-800">{transaction.nama_rekanan}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> Bank</span>
                <span className="text-xs font-bold text-slate-800">{transaction.bank_name || "-"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Nomor Rekening</span>
                <span className="text-xs font-bold text-slate-800">{transaction.account_number || "-"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500">Pemilik Rekening</span>
                <span className="text-xs font-bold text-slate-800">{transaction.account_owner || "-"}</span>
              </div>
            </div>
          </div>

          {/* Alasan Pengajuan */}
          {transaction.reason_for_approval && (
            <div className="space-y-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Alasan Membutuhkan Approval</h4>
              <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">{transaction.reason_for_approval}</p>
            </div>
          )}

          {/* Kolom Isian Catatan Persetujuan */}
          {(role === "MANAGER" || role === "DIREKTUR") && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <Label htmlFor="approval-notes" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Catatan Persetujuan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="approval-notes"
                placeholder="Tuliskan catatan atau alasan persetujuan Anda di sini..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="bg-white min-h-[80px] text-xs rounded-xl border-slate-200 focus-visible:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                * Catatan persetujuan wajib diisi sebelum Anda dapat menyetujui transaksi ini.
              </p>
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
              disabled={isApproving || !approvalNotes.trim()}
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