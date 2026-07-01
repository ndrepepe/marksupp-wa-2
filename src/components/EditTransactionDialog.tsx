"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Save, Plus, Trash2, Calculator, ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BMSplit {
  amount: string;
  percentage: string;
}

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
  const [bmType, setBmType] = useState<"single" | "multiple">("single");
  const [bmSplits, setBmSplits] = useState<BMSplit[]>([{ amount: "", percentage: "" }]);
  const [isSaving, setIsSaving] = useState(false);

  // List Approvers dari Database
  const [managers, setManagers] = useState<ApproverUser[]>([]);
  const [directors, setDirectors] = useState<ApproverUser[]>([]);

  useEffect(() => {
    if (transaction) {
      setFormData({ 
        ...transaction,
        transaction_amount: transaction.transaction_amount?.toString() || "",
        bm_percentage: transaction.bm_percentage?.toString() || "",
        approval_type: transaction.approval_type || "BOTH",
        assigned_manager_email: transaction.assigned_manager_email || "",
        assigned_director_email: transaction.assigned_director_email || "",
        reason_for_approval: transaction.reason_for_approval || ""
      });
      
      if (transaction.bm_splits && Array.isArray(transaction.bm_splits)) {
        setBmType("multiple");
        setBmSplits(transaction.bm_splits);
      } else {
        setBmType("single");
        setBmSplits([{ amount: transaction.transaction_amount?.toString() || "", percentage: transaction.bm_percentage?.toString() || "" }]);
      }
    }
  }, [transaction]);

  // Fetch data user/approver dari database menggunakan RPC get_approvers
  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const { data, error } = await supabase.rpc("get_approvers");
        
        if (error) throw error;

        if (data) {
          const mList = data
            .filter((u: any) => u.role?.toUpperCase() === "MANAGER")
            .map((u: any) => ({ email: u.email }));
          
          const dList = data
            .filter((u: any) => u.role?.toUpperCase() === "DIREKTUR" || u.role?.toUpperCase() === "DIRECTOR")
            .map((u: any) => ({ email: u.email }));
          
          setManagers(mList);
          setDirectors(dList);
        }
      } catch (err) {
        console.error("Gagal mengambil data approvers:", err);
      }
    };

    fetchApprovers();
  }, []);

  // Reset email pilihan jika tipe approval berubah
  useEffect(() => {
    if (formData.approval_type === "NONE") {
      setFormData(prev => ({ ...prev, assigned_manager_email: "", assigned_director_email: "" }));
    } else if (formData.approval_type === "MANAGER") {
      setFormData(prev => ({ ...prev, assigned_director_email: "" }));
    } else if (formData.approval_type === "DIREKTUR") {
      setFormData(prev => ({ ...prev, assigned_manager_email: "" }));
    }
  }, [formData.approval_type]);

  const addBmSplit = () => {
    setBmSplits([...bmSplits, { amount: "", percentage: "" }]);
  };

  const removeBmSplit = (index: number) => {
    const newSplits = bmSplits.filter((_, i) => i !== index);
    setBmSplits(newSplits.length ? newSplits : [{ amount: "", percentage: "" }]);
  };

  const updateBmSplit = (index: number, field: keyof BMSplit, value: string) => {
    const newSplits = [...bmSplits];
    newSplits[index][field] = value;
    setBmSplits(newSplits);
  };

  const calculateEffectiveBM = () => {
    if (bmType === "single") return parseFloat(formData.bm_percentage) || 0;
    
    const totalAmount = parseFloat(formData.transaction_amount) || 0;
    if (totalAmount <= 0) return 0;

    let totalBMValue = 0;
    bmSplits.forEach(split => {
      const amt = parseFloat(split.amount) || 0;
      const pct = parseFloat(split.percentage) || 0;
      totalBMValue += (amt * pct) / 100;
    });

    return (totalBMValue / totalAmount) * 100;
  };

  const validateSplits = () => {
    if (bmType === "single") return true;
    
    const totalAmount = parseFloat(formData.transaction_amount) || 0;
    const splitTotal = bmSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    
    if (Math.abs(totalAmount - splitTotal) > 0.01) {
      toast.error(`Total pembagian (${splitTotal.toLocaleString()}) harus sama dengan nilai transaksi (${totalAmount.toLocaleString()})`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!formData.school_name || !formData.po_number || !formData.transaction_amount) {
      toast.error("Mohon lengkapi field wajib");
      return;
    }

    if (!validateSplits()) return;

    setIsSaving(true);
    const cleanAmount = parseFloat(formData.transaction_amount.toString().replace(/[^0-9.]/g, ''));
    const effectiveBM = calculateEffectiveBM();
    const updatedTransactionData = {
      school_name: formData.school_name,
      po_number: formData.po_number,
      transaction_amount: cleanAmount,
      bm_percentage: effectiveBM,
      bm_splits: bmType === "multiple" ? bmSplits : null,
      cabang: formData.cabang,
      nama_siplah: formData.nama_siplah,
      produk: formData.produk,
      rekanan_type: formData.rekanan_type,
      nama_rekanan: formData.rekanan_type === "REKANAN" ? formData.nama_rekanan : null,
      bank_name: formData.bank_name,
      account_number: formData.account_number,
      account_owner: formData.account_owner,
      status: formData.approval_type === "NONE" ? "DISETUJUI" : formData.status,
      approval_type: formData.approval_type,
      assigned_manager_email: (formData.approval_type === "MANAGER" || formData.approval_type === "BOTH") ? formData.assigned_manager_email || null : null,
      assigned_director_email: (formData.approval_type === "DIREKTUR" || formData.approval_type === "BOTH") ? formData.assigned_director_email || null : null,
      manager_approved: formData.approval_type === "NONE" || formData.approval_type === "DIREKTUR" || formData.manager_approved,
      director_approved: formData.approval_type === "NONE" || formData.approval_type === "MANAGER" || formData.director_approved,
      reason_for_approval: formData.approval_type === "NONE" ? null : formData.reason_for_approval || null
    };

    try {
      const { error } = await supabase
        .from("transactions")
        .update(updatedTransactionData)
        .eq("id", transaction.id);

      if (error) throw error;

      // Mencatat log aktivitas update
      await logActivity("UPDATE_TRANSACTION", {
        transaction_id: transaction.id,
        school_name: formData.school_name,
        po_number: formData.po_number,
        amount: cleanAmount
      });

      if (shouldNotifyApprovers(updatedTransactionData)) {
        try {
          await sendApprovalWhatsAppNotification({
            ...updatedTransactionData,
            code: transaction.code,
          });
          toast.success("Notifikasi WhatsApp approval terkirim");
        } catch (notificationError: any) {
          console.error("[EditTransactionDialog] Gagal mengirim notifikasi WhatsApp:", notificationError);
          toast.error(`Transaksi tersimpan, tetapi WA gagal dikirim: ${notificationError.message || "cek log Supabase Function"}`);
        }
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

  const splitTotal = bmSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  const remainingAmount = (parseFloat(formData.transaction_amount) || 0) - splitTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Transaksi</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Nama Sekolah</Label>
            <Input 
              value={formData.school_name || ""} 
              onChange={(e) => setFormData({...formData, school_name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Cabang</Label>
            <Input 
              value={formData.cabang || ""} 
              onChange={(e) => setFormData({...formData, cabang: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Nomor PO</Label>
            <Input 
              value={formData.po_number || ""} 
              onChange={(e) => setFormData({...formData, po_number: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Nama SIPLAH</Label>
            <Select 
              value={formData.nama_siplah || ""} 
              onValueChange={(val) => setFormData({...formData, nama_siplah: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LADANG">LADANG</SelectItem>
                <SelectItem value="TELKOM">TELKOM</SelectItem>
                <SelectItem value="BLIBLI">BLIBLI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nominal (Rp)</Label>
            <Input 
              type="number"
              value={formData.transaction_amount || ""} 
              onChange={(e) => setFormData({...formData, transaction_amount: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status || "DIAJUKAN"} 
              onValueChange={(val) => setFormData({...formData, status: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIAJUKAN">DIAJUKAN</SelectItem>
                <SelectItem value="DIBATALKAN">DIBATALKAN</SelectItem>
                <SelectItem value="DISETUJUI">DISETUJUI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approval Configuration Section */}
          {role !== "STAFF" && (
            <div className="md:col-span-2 space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Konfigurasi Approval Pengajuan
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dibutuhkan Approval Dari</Label>
                  <Select 
                    value={formData.approval_type || "BOTH"} 
                    onValueChange={(val) => setFormData({...formData, approval_type: val})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Tidak Perlu Approval</SelectItem>
                      <SelectItem value="MANAGER">Hanya Manager</SelectItem>
                      <SelectItem value="DIREKTUR">Hanya Direktur</SelectItem>
                      <SelectItem value="BOTH">Manager & Direktur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.approval_type === "MANAGER" || formData.approval_type === "BOTH") && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Label>Email Manager Penanggung Jawab</Label>
                    <Select 
                      value={formData.assigned_manager_email || ""} 
                      onValueChange={(val) => setFormData({...formData, assigned_manager_email: val})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Pilih Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.length === 0 ? (
                          <SelectItem value="no-manager" disabled>Tidak ada manager tersedia</SelectItem>
                        ) : (
                          managers.map((m) => (
                            <SelectItem key={m.email} value={m.email}>
                              {m.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.approval_type === "DIREKTUR" || formData.approval_type === "BOTH") && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Label>Email Direktur Penanggung Jawab</Label>
                    <Select 
                      value={formData.assigned_director_email || ""} 
                      onValueChange={(val) => setFormData({...formData, assigned_director_email: val})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Pilih Direktur" />
                      </SelectTrigger>
                      <SelectContent>
                        {directors.length === 0 ? (
                          <SelectItem value="no-director" disabled>Tidak ada direktur tersedia</SelectItem>
                        ) : (
                          directors.map((d) => (
                            <SelectItem key={d.email} value={d.email}>
                              {d.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {formData.approval_type !== "NONE" && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Label>Keterangan Alasan Membutuhkan Approval</Label>
                  <Textarea
                    value={formData.reason_for_approval || ""}
                    onChange={(e) => setFormData({...formData, reason_for_approval: e.target.value})}
                    placeholder="Tuliskan alasan mengapa transaksi ini memerlukan persetujuan..."
                    className="bg-white min-h-[80px]"
                  />
                </div>
              )}
            </div>
          )}

          {/* BM Section */}
          <div className="md:col-span-2 space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Pengaturan % BM
              </Label>
              <Tabs value={bmType} onValueChange={(v: any) => setBmType(v)} className="w-auto">
                <TabsList className="grid w-full grid-cols-2 h-8 p-1">
                  <TabsTrigger value="single" className="text-xs">Single</TabsTrigger>
                  <TabsTrigger value="multiple" className="text-xs">Multiple</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {bmType === "single" ? (
              <div className="space-y-2">
                <Label>% BM</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bm_percentage || ""}
                  onChange={(e) => setFormData({...formData, bm_percentage: e.target.value})}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {bmSplits.map((split, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Nominal PO</Label>
                      <Input
                        type="number"
                        value={split.amount}
                        onChange={(e) => updateBmSplit(index, "amount", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">% BM</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={split.percentage}
                        onChange={(e) => updateBmSplit(index, "percentage", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeBmSplit(index)}
                      className="h-9 w-9 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="text-[11px] font-medium">
                    <span className={remainingAmount === 0 ? "text-green-600" : "text-amber-600"}>
                      Sisa: {remainingAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addBmSplit}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Tambah Baris
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Produk</Label>
            <Select 
              value={formData.produk || ""} 
              onValueChange={(val) => setFormData({...formData, produk: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONBOOK">NONBOOK</SelectItem>
                <SelectItem value="BOOK">BOOK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rekanan</Label>
            <Select 
              value={formData.rekanan_type || ""} 
              onValueChange={(val) => setFormData({...formData, rekanan_type: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NON REKANAN">NON REKANAN</SelectItem>
                <SelectItem value="REKANAN">REKANAN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.rekanan_type === "REKANAN" && (
            <div className="space-y-2">
              <Label>Nama Rekanan</Label>
              <Input 
                value={formData.nama_rekanan || ""} 
                onChange={(e) => setFormData({...formData, nama_rekanan: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Nama Bank</Label>
            <Input 
              value={formData.bank_name || ""} 
              onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Nomor Rekening</Label>
            <Input 
              value={formData.account_number || ""} 
              onChange={(e) => setFormData({...formData, account_number: e.target.value})}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Pemilik Rekening</Label>
            <Input 
              value={formData.account_owner || ""} 
              onChange={(e) => setFormData({...formData, account_owner: e.target.value})}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Kode Transaksi (Tidak dapat diubah)</Label>
            <Input value={formData.code || ""} disabled className="bg-muted font-mono" />
          </div>
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
