"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logActivity } from "@/utils/logger";
import { sendApprovalWhatsAppNotification, shouldNotifyApprovers } from "@/utils/whatsappNotifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck } from "lucide-react";

interface ApproverUser {
  email: string;
}

interface EditTransactionDialogProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditTransactionDialog = ({ transaction, open, onOpenChange, onSuccess }: EditTransactionDialogProps) => {
  const { role } = useAuth();
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [managers, setManagers] = useState<ApproverUser[]>([]);
  const [directors, setDirectors] = useState<ApproverUser[]>([]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        status: transaction.status || "DIAJUKAN",
        code: transaction.code || "",
        approval_type: transaction.approval_type || "BOTH",
        assigned_manager_email: transaction.assigned_manager_email || "",
        assigned_director_email: transaction.assigned_director_email || "",
        manager_approved: transaction.manager_approved || false,
        director_approved: transaction.director_approved || false,
      });
    }
  }, [transaction]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const { data, error } = await supabase.rpc("get_approvers");
        if (error) throw error;

        if (data) {
          setManagers(
            data
              .filter((u: any) => u.role?.toUpperCase() === "MANAGER")
              .map((u: any) => ({ email: u.email }))
          );
          setDirectors(
            data
              .filter((u: any) => u.role?.toUpperCase() === "DIREKTUR" || u.role?.toUpperCase() === "DIRECTOR")
              .map((u: any) => ({ email: u.email }))
          );
        }
      } catch (err) {
        console.error("Gagal mengambil data approvers:", err);
      }
    };

    fetchApprovers();
  }, []);

  useEffect(() => {
    if (formData.approval_type === "NONE") {
      setFormData((prev: any) => ({ ...prev, assigned_manager_email: "", assigned_director_email: "" }));
    } else if (formData.approval_type === "MANAGER") {
      setFormData((prev: any) => ({ ...prev, assigned_director_email: "" }));
    } else if (formData.approval_type === "DIREKTUR") {
      setFormData((prev: any) => ({ ...prev, assigned_manager_email: "" }));
    }
  }, [formData.approval_type]);

  const handleSave = async () => {
    if (!transaction) return;

    if ((formData.approval_type === "MANAGER" || formData.approval_type === "BOTH") && !formData.assigned_manager_email) {
      toast.error("Email Manager wajib diisi untuk tipe approval ini");
      return;
    }

    if ((formData.approval_type === "DIREKTUR" || formData.approval_type === "BOTH") && !formData.assigned_director_email) {
      toast.error("Email Direktur wajib diisi untuk tipe approval ini");
      return;
    }

    setIsSaving(true);
    const updatedTransactionData = {
      status: formData.approval_type === "NONE" ? "DISETUJUI" : formData.status,
      approval_type: formData.approval_type,
      assigned_manager_email: (formData.approval_type === "MANAGER" || formData.approval_type === "BOTH") ? formData.assigned_manager_email || null : null,
      assigned_director_email: (formData.approval_type === "DIREKTUR" || formData.approval_type === "BOTH") ? formData.assigned_director_email || null : null,
      manager_approved: formData.approval_type === "NONE" || formData.approval_type === "DIREKTUR" || formData.manager_approved,
      director_approved: formData.approval_type === "NONE" || formData.approval_type === "MANAGER" || formData.director_approved,
    };

    try {
      const { error } = await supabase
        .from("transactions")
        .update(updatedTransactionData)
        .eq("id", transaction.id);

      if (error) throw error;

      await logActivity("UPDATE_TRANSACTION", {
        transaction_id: transaction.id,
        code: transaction.code,
      });

      if (shouldNotifyApprovers(updatedTransactionData)) {
        await sendApprovalWhatsAppNotification({
          ...updatedTransactionData,
          code: transaction.code,
        });
      }

      toast.success("Data berhasil diperbarui");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Gagal memperbarui data: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Transaksi</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Kode Transaksi</Label>
            <Input value={formData.code || ""} disabled className="bg-muted font-mono" />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status || "DIAJUKAN"}
              onValueChange={(val) => setFormData({ ...formData, status: val })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIAJUKAN">DIAJUKAN</SelectItem>
                <SelectItem value="DIBATALKAN">DIBATALKAN</SelectItem>
                <SelectItem value="DISETUJUI">DISETUJUI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role !== "STAFF" && (
            <div className="md:col-span-2 space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Konfigurasi Approval
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dibutuhkan Approval Dari</Label>
                  <Select
                    value={formData.approval_type || "BOTH"}
                    onValueChange={(val) => setFormData({ ...formData, approval_type: val })}
                  >
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Tidak Perlu Approval</SelectItem>
                      <SelectItem value="MANAGER">Hanya Manager</SelectItem>
                      <SelectItem value="DIREKTUR">Hanya Direktur</SelectItem>
                      <SelectItem value="BOTH">Manager & Direktur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.approval_type === "MANAGER" || formData.approval_type === "BOTH") && (
                  <div className="space-y-2">
                    <Label>Email Manager</Label>
                    <Select
                      value={formData.assigned_manager_email || ""}
                      onValueChange={(val) => setFormData({ ...formData, assigned_manager_email: val })}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Manager" /></SelectTrigger>
                      <SelectContent>
                        {managers.length === 0 ? (
                          <SelectItem value="no-manager" disabled>Tidak ada manager tersedia</SelectItem>
                        ) : (
                          managers.map((m) => <SelectItem key={m.email} value={m.email}>{m.email}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.approval_type === "DIREKTUR" || formData.approval_type === "BOTH") && (
                  <div className="space-y-2">
                    <Label>Email Direktur</Label>
                    <Select
                      value={formData.assigned_director_email || ""}
                      onValueChange={(val) => setFormData({ ...formData, assigned_director_email: val })}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Direktur" /></SelectTrigger>
                      <SelectContent>
                        {directors.length === 0 ? (
                          <SelectItem value="no-director" disabled>Tidak ada direktur tersedia</SelectItem>
                        ) : (
                          directors.map((d) => <SelectItem key={d.email} value={d.email}>{d.email}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Batal</Button>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog;
