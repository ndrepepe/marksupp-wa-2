"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { logActivity } from "@/utils/logger";
import { sendApprovalWhatsAppNotification } from "@/utils/whatsappNotifications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApproverUser {
  email: string;
}

const Generator = () => {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "SUPER_ADMIN" || user?.email?.toLowerCase() === "salmon@pepenio.my.id";

  const [status, setStatus] = useState("DIAJUKAN");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Approval States
  const [approvalType, setApprovalType] = useState("BOTH");
  const [assignedManagerEmail, setAssignedManagerEmail] = useState("");
  const [assignedDirectorEmail, setAssignedDirectorEmail] = useState("");

  // List Approvers dari Database
  const [managers, setManagers] = useState<ApproverUser[]>([]);
  const [directors, setDirectors] = useState<ApproverUser[]>([]);

  const { toast: showToast } = useToast();

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

  // Auto-select approver pertama jika user bukan Super Admin agar validasi form tetap lolos
  useEffect(() => {
    if (managers.length > 0 && !assignedManagerEmail) {
      setAssignedManagerEmail(managers[0].email);
    }
  }, [managers, assignedManagerEmail]);

  useEffect(() => {
    if (directors.length > 0 && !assignedDirectorEmail) {
      setAssignedDirectorEmail(directors[0].email);
    }
  }, [directors, assignedDirectorEmail]);

  // Reset email pilihan jika tipe approval berubah
  useEffect(() => {
    if (approvalType === "NONE") {
      setAssignedManagerEmail("");
      setAssignedDirectorEmail("");
    } else if (approvalType === "MANAGER") {
      setAssignedDirectorEmail("");
    } else if (approvalType === "DIREKTUR") {
      setAssignedManagerEmail("");
    }
  }, [approvalType]);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCode(result);
    toast.success("Kode baru berhasil dibuat!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!generatedCode) {
      toast.error("Mohon lengkapi semua field wajib");
      return;
    }

    // Validasi email approval jika dipilih
    if ((approvalType === "MANAGER" || approvalType === "BOTH") && !assignedManagerEmail) {
      toast.error("Email Manager wajib diisi untuk tipe approval ini");
      return;
    }
    if ((approvalType === "DIREKTUR" || approvalType === "BOTH") && !assignedDirectorEmail) {
      toast.error("Email Direktur wajib diisi untuk tipe approval ini");
      return;
    }

    setIsSaving(true);
    
    const transactionData = {
      status: approvalType === "NONE" ? "DISETUJUI" : status,
      code: generatedCode,
      approval_type: approvalType,
      assigned_manager_email: (approvalType === "MANAGER" || approvalType === "BOTH") ? assignedManagerEmail || null : null,
      assigned_director_email: (approvalType === "DIREKTUR" || approvalType === "BOTH") ? assignedDirectorEmail || null : null,
      manager_approved: approvalType === "NONE" || approvalType === "DIREKTUR",
      director_approved: approvalType === "NONE" || approvalType === "MANAGER"
    };

    try {
      const { error } = await supabase
        .from("transactions")
        .insert(transactionData);

      if (error) throw error;

      // Mencatat log aktivitas
      await logActivity("CREATE_TRANSACTION", {
        code: generatedCode
      });

      showToast({
        title: "Berhasil!",
        description: "Data transaksi disimpan.",
      });

      toast.promise(sendApprovalWhatsAppNotification(transactionData), {
        loading: 'Mengirim notifikasi WhatsApp ke approver...',
        success: 'Notifikasi WhatsApp approver terkirim!',
        error: (err) => `Gagal kirim WA: ${err.message || 'Cek koneksi/API Key'}`
      });

      // Reset Form
      setStatus("DIAJUKAN");
      setGeneratedCode("");
      setApprovalType("BOTH");
      // Jangan reset email jika bukan super admin agar tetap terisi otomatis
      if (isSuperAdmin) {
        setAssignedManagerEmail("");
        setAssignedDirectorEmail("");
      }
    } catch (error: any) {
      toast.error("Gagal menyimpan data: " + (error.message || "Terjadi kesalahan"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">
          Input Data Transaksi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIAJUKAN">DIAJUKAN</SelectItem>
                  <SelectItem value="DIBATALKAN">DIBATALKAN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Approval Configuration Section - Hanya muncul untuk Super Admin */}
            {isSuperAdmin && (
              <div className="md:col-span-2 space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-300">
                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Konfigurasi Approval Pengajuan
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Dibutuhkan Approval Dari</Label>
                    <Select onValueChange={setApprovalType} value={approvalType}>
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

                  {(approvalType === "MANAGER" || approvalType === "BOTH") && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <Label>Email Manager Penanggung Jawab</Label>
                      <Select onValueChange={setAssignedManagerEmail} value={assignedManagerEmail}>
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

                  {(approvalType === "DIREKTUR" || approvalType === "BOTH") && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <Label>Email Direktur Penanggung Jawab</Label>
                      <Select onValueChange={setAssignedDirectorEmail} value={assignedDirectorEmail}>
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
              </div>
            )}

          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="generatedCode" className="text-lg font-semibold">Kode Transaksi</Label>
            <div className="flex gap-2">
              <Input
                id="generatedCode"
                value={generatedCode}
                readOnly
                placeholder="Generate kode di sini"
                className="flex-1 font-mono text-lg bg-muted text-center tracking-widest"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={generateCode}
                className="shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full text-lg h-12" 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Simpan Transaksi
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default Generator;
