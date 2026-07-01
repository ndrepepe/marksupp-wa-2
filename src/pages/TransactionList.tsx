"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, Edit, Trash2, FileDown, CheckCircle, Circle, Filter, X, Calendar, Paperclip, Image as ImageIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logActivity } from "@/utils/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import AttachmentDialog from "@/components/AttachmentDialog";
import TransactionPreviewDialog from "@/components/TransactionPreviewDialog";

const TransactionList = () => {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "SUPER_ADMIN" || user?.email?.toLowerCase() === "salmon@pepenio.my.id";
  const showPrintColumn = role !== "MANAGER" && role !== "DIREKTUR";

  // Helper to get last 30 days range including today
  const getLast30DaysRange = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 29); // 30 days including today
    
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };

  const defaultRange = getLast30DaysRange();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [printFilter, setPrintFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(defaultRange.start);
  const [endDate, setEndDate] = useState<string>(defaultRange.end);

  // State for Edit
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // State for Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // State for Attachment
  const [attachmentTransaction, setAttachmentTransaction] = useState<any>(null);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);

  // State for Preview
  const [previewTransaction, setPreviewTransaction] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply server-side date filtering for performance
      if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      // Mencatat log aktivitas delete
      await logActivity("DELETE_TRANSACTION", {
        transaction_id: deletingId
      });

      toast.success("Data berhasil dihapus");
      fetchTransactions();
    } catch (error: any) {
      toast.error("Gagal menghapus data: " + error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const markTransactionPrinted = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ is_printed: true })
        .eq("id", transactionId);

      if (error) throw error;

      await logActivity("MARK_PRINTED", {
        transaction_id: transactionId
      });
    } catch (error: any) {
      console.error("Error marking printed:", error);
      throw error;
    }
  };

  const handlePrint = async (transactionId: string) => {
    try {
      await markTransactionPrinted(transactionId);
      toast.success("Transaksi telah ditandai sebagai sudah di-print");
      fetchTransactions();
    } catch (error: any) {
      toast.error("Gagal menandai transaksi: " + error.message);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    // 1. Filter berdasarkan Role & Email Penanggung Jawab
    const userEmail = user?.email?.toLowerCase();
    
    if (role === "MANAGER") {
      const isAssigned = t.assigned_manager_email?.toLowerCase() === userEmail;
      const needsManagerApproval = t.approval_type === "MANAGER" || t.approval_type === "BOTH";
      const isNotYetApproved = !t.manager_approved;
      
      // Manager hanya melihat transaksi yang ditugaskan kepadanya, butuh approval manager, dan belum di-approve
      if (!isAssigned || !needsManagerApproval || !isNotYetApproved) return false;
    } else if (role === "DIREKTUR") {
      const isAssigned = t.assigned_director_email?.toLowerCase() === userEmail;
      const needsDirectorApproval = t.approval_type === "DIREKTUR" || t.approval_type === "BOTH";
      const isNotYetApproved = !t.director_approved;

      // Direktur hanya melihat transaksi yang ditugaskan kepadanya, butuh approval direktur, dan belum di-approve
      if (!isAssigned || !needsDirectorApproval || !isNotYetApproved) return false;
    }

    // 2. Filter Pencarian & Print (untuk semua role)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (t.code && t.code.toLowerCase().includes(searchLower)) ||
      (t.nama_rekanan && t.nama_rekanan.toLowerCase().includes(searchLower)) ||
      (t.bank_name && t.bank_name.toLowerCase().includes(searchLower)) ||
      (t.account_owner && t.account_owner.toLowerCase().includes(searchLower));
    
    const matchesPrintFilter = 
      printFilter === "all" ? true :
      printFilter === "printed" ? t.is_printed === true :
      t.is_printed === false || t.is_printed === null;

    return matchesSearch && matchesPrintFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const downloadPDF = async (t: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("BUKTI TRANSAKSI - GRAND LINE", 14, 15);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Kode: ${t.code}`, 14, 22);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 27);
    
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
    
    const tableData = [
      ["Tanggal Input", new Date(t.created_at).toLocaleDateString("id-ID")],
      ["Nama Sekolah", t.school_name],
      ["Cabang", t.cabang || "-"],
      ["Nomor PO", t.po_number],
      ["Platform SIPLAH", t.nama_siplah],
      ["Jenis Produk", t.produk],
      ["Nominal Transaksi", formatCurrency(t.transaction_amount)],
      ["Status Transaksi", t.status],
    ];

    // Tambahkan informasi penyetuju jika statusnya DISETUJUI
    if (t.status === "DISETUJUI") {
      let approvers = [];
      if (t.manager_approved && t.assigned_manager_email) {
        approvers.push(`Manager (${t.assigned_manager_email})`);
      }
      if (t.director_approved && t.assigned_director_email) {
        approvers.push(`Direktur (${t.assigned_director_email})`);
      }
      tableData.push(["Disetujui Oleh", approvers.length > 0 ? approvers.join("\n") : "Sistem (Tanpa Approval)"]);
    }

    tableData.push(
      ["Tipe Rekanan", t.rekanan_type],
      ["Nama Rekanan", t.rekanan_type === "REKANAN" ? t.nama_rekanan : "NON REKANAN"]
    );

    // Add BM Details
    tableData.push(["", ""]);
    tableData.push(["RINCIAN % BM", ""]);
    
    if (t.bm_splits && Array.isArray(t.bm_splits)) {
      t.bm_splits.forEach((split: any, idx: number) => {
        tableData.push([
          `Bagian ${idx + 1}`, 
          `${formatCurrency(parseFloat(split.amount))} @ ${split.percentage}%`
        ]);
      });
    } else {
      tableData.push(["Persentase BM", `${t.bm_percentage}%`]);
    }

    tableData.push(["", ""]);
    tableData.push(["INFORMASI PEMBAYARAN BM", ""]);
    tableData.push(["Nama Bank", t.bank_name || "-"]);
    tableData.push(["Nomor Rekening", t.account_number || "-"]);
    tableData.push(["Pemilik Rekening", t.account_owner || "-"]);

    // Tambahkan Alasan & Catatan Approval jika ada
    if (t.reason_for_approval) {
      tableData.push(["", ""]);
      tableData.push(["ALASAN & CATATAN APPROVAL", ""]);
      tableData.push(["Detail", t.reason_for_approval]);
    }

    autoTable(doc, {
      startY: 35,
      body: tableData,
      theme: 'plain',
      styles: { 
        fontSize: 10, 
        cellPadding: 3,
        textColor: [50, 50, 50]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60, textColor: [30, 41, 59] },
        1: { cellWidth: 'auto' }
      },
      didParseCell: function(data) {
        const label = data.row.raw[0];
        if (label === "INFORMASI PEMBAYARAN BM" || label === "RINCIAN % BM" || label === "ALASAN & CATATAN APPROVAL") {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [30, 41, 59];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Dokumen ini dihasilkan secara otomatis oleh Grand Line Manager.", 14, finalY + 10);

    doc.save(`transaksi-${t.code}.pdf`);

    // Mencatat log aktivitas download PDF dan menandai sudah diprint
    await logActivity("DOWNLOAD_PDF", {
      transaction_id: t.id,
      school_name: t.school_name,
      code: t.code
    });

    if (!t.is_printed) {
      await markTransactionPrinted(t.id);
    }

    toast.success("PDF berhasil diunduh");
    fetchTransactions();
  };

  const resetDateFilters = () => {
    const range = getLast30DaysRange();
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <Card className="w-full max-w-full shadow-lg border-t-4 border-t-primary rounded-none lg:rounded-xl overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-4 px-4 sm:px-6">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            Daftar Transaksi 
            {role !== "STAFF" && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-xs">
                Mode Approval: {role}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {role !== "STAFF" 
              ? `Menampilkan transaksi yang ditugaskan ke email Anda (${user?.email}) dan membutuhkan persetujuan Anda.`
              : startDate && endDate 
                ? `Menampilkan data periode ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`
                : "Menampilkan semua data transaksi"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cari Kode, Rekanan, atau Bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={printFilter} onValueChange={setPrintFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter Print" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="printed">Sudah Print</SelectItem>
                    <SelectItem value="not_printed">Belum Print</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 bg-muted/50 p-1 rounded-lg border border-border w-full sm:w-auto overflow-hidden">
                <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 flex-1 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 w-full bg-transparent border-none focus-visible:ring-0 p-0 text-[10px] sm:text-xs min-w-[80px]"
                  />
                </div>
                <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">-</span>
                <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 flex-1 min-w-0">
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 w-full bg-transparent border-none focus-visible:ring-0 p-0 text-[10px] sm:text-xs min-w-[80px]"
                  />
                </div>
                {(startDate || endDate) && (
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={resetDateFilters}
                      title="Reset ke 30 hari terakhir"
                      className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={clearDateFilters}
                      title="Hapus filter tanggal (Tampilkan semua)"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold px-2">Tanggal</TableHead>
                <TableHead className="font-bold px-2">Status</TableHead>
                <TableHead className="font-bold px-2">Approval</TableHead>
                <TableHead className="font-bold px-2">Kode Transaksi</TableHead>
                <TableHead className="font-bold px-2">Rekanan</TableHead>
                <TableHead className="font-bold px-2">Bank / Rekening</TableHead>
                {showPrintColumn && <TableHead className="font-bold text-center px-2">Print</TableHead>}
                <TableHead className="font-bold text-center px-2">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={showPrintColumn ? 8 : 7} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showPrintColumn ? 8 : 7} className="h-24 text-center text-muted-foreground">
                    Tidak ada data transaksi yang membutuhkan tindakan Anda saat ini.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "transition-colors",
                      t.status === "DIBATALKAN" ? "bg-pink-50 hover:bg-pink-100" : "hover:bg-muted/30"
                    )}
                  >
                    <TableCell className="whitespace-nowrap px-2">
                      {new Date(t.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant={t.status === "DIBATALKAN" ? "destructive" : "outline"}
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            t.status === "DIAJUKAN" && "bg-green-50 text-green-700 border-green-200",
                            t.status === "DISETUJUI" && "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {t.status || "DIAJUKAN"}
                        </Badge>
                        {t.status === "DISETUJUI" && (
                          <div className="text-[9px] text-muted-foreground flex flex-col gap-0.5 mt-1 max-w-[140px] overflow-hidden">
                            {t.manager_approved && t.assigned_manager_email && (
                              <span className="truncate block" title={`Manager: ${t.assigned_manager_email}`}>
                                M: {t.assigned_manager_email}
                              </span>
                            )}
                            {t.director_approved && t.assigned_director_email && (
                              <span className="truncate block" title={`Direktur: ${t.assigned_director_email}`}>
                                D: {t.assigned_director_email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="flex flex-col gap-1 text-[10px]">
                        {(!t.approval_type || t.approval_type === "NONE") ? (
                          <span className="text-muted-foreground italic text-[11px]">Tidak perlu persetujuan</span>
                        ) : (
                          <>
                            {(t.approval_type === "MANAGER" || t.approval_type === "BOTH") && (
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-500">M:</span>
                                <Badge variant={t.manager_approved ? "default" : "outline"} className="text-[9px] px-1 py-0">
                                  {t.manager_approved ? "Approved" : "Pending"}
                                </Badge>
                              </div>
                            )}
                            {(t.approval_type === "DIREKTUR" || t.approval_type === "BOTH") && (
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-500">D:</span>
                                <Badge variant={t.director_approved ? "default" : "outline"} className="text-[9px] px-1 py-0">
                                  {t.director_approved ? "Approved" : "Pending"}
                                </Badge>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border">
                        {t.code}
                      </code>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="font-medium text-xs">{t.rekanan_type}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {t.rekanan_type === "REKANAN" ? t.nama_rekanan : "NON REKANAN"}
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="font-medium text-xs">{t.bank_name || "-"}</div>
                      <div className="text-[10px] text-muted-foreground">{t.account_number || "-"}</div>
                      <div className="text-[9px] italic leading-tight">{t.account_owner || "-"}</div>
                    </TableCell>
                    {showPrintColumn && (
                      <TableCell className="text-center px-2">
                        <div className="flex items-center justify-center gap-1">
                          {t.status === "DISETUJUI" ? (
                            t.is_printed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handlePrint(t.id)}
                                title="Tandai sebagai sudah di-print"
                              >
                                <Circle className="w-3.5 h-3.5" />
                              </Button>
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="px-2">
                      <div className="flex items-center justify-center gap-1">
                        {/* Tombol Preview untuk Manager / Direktur */}
                        {(role === "MANAGER" || role === "DIREKTUR") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium rounded-lg flex items-center gap-1 border-slate-200 hover:bg-slate-50"
                            onClick={() => {
                              setPreviewTransaction(t);
                              setIsPreviewDialogOpen(true);
                            }}
                            title="Preview Pengajuan"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> Preview
                          </Button>
                        )}

                        {/* Tombol untuk Staff */}
                        {role === "STAFF" && (
                          <>
                            {!t.is_printed && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setEditingTransaction(t);
                                    setIsEditDialogOpen(true);
                                  }}
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                {t.status !== "DISETUJUI" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setDeletingId(t.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </>
                        )}

                        {/* Tombol untuk Super Admin */}
                        {role === "SUPER_ADMIN" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7",
                                t.attachment_url 
                                  ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
                                  : "text-slate-400 hover:text-slate-500 hover:bg-slate-50"
                              )}
                              onClick={() => {
                                setAttachmentTransaction(t);
                                setIsAttachmentDialogOpen(true);
                              }}
                              title="Lampiran Bukti"
                            >
                              {t.attachment_url ? <ImageIcon className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
                            </Button>
                            {t.status === "DISETUJUI" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => downloadPDF(t)}
                                title="Download PDF"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!t.is_printed && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setEditingTransaction(t);
                                    setIsEditDialogOpen(true);
                                  }}
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                {t.status !== "DISETUJUI" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setDeletingId(t.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <EditTransactionDialog
        transaction={editingTransaction}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={fetchTransactions}
      />

      <AttachmentDialog
        transaction={attachmentTransaction}
        open={isAttachmentDialogOpen}
        onOpenChange={setIsAttachmentDialogOpen}
        onSuccess={fetchTransactions}
      />

      <TransactionPreviewDialog
        transaction={previewTransaction}
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        onSuccess={fetchTransactions}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data transaksi ini akan dihapus secara permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default TransactionList;
