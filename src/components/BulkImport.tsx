"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, Upload, Download, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { logActivity } from "@/utils/logger";

const BulkImport = () => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const generateTransactionCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const clearPreview = () => {
    setPreviewData([]);
    setFileName("");
    toast.info("Pratinjau data dihapus");
  };

  const sendSummaryNotification = async (items: any[]) => {
    try {
      let message = `🚀 *IMPORT MASAL BERHASIL!*\n`;
      message += `📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
      message += `📊 Total: ${items.length} Transaksi\n\n`;

      items.forEach((item, index) => {
        message += `${index + 1}. Kode: \`${item.code}\`\n`;
        message += `   Status: ${item.status || "-"}\n\n`;
      });

      message += `_Pesan otomatis dari Grand Line Manager_`;

      await supabase.functions.invoke('send-whatsapp', {
        body: { message }
      });
    } catch (err) {
      console.error("[BulkImport] Gagal mengirim ringkasan WhatsApp:", err);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Transaksi');

    worksheet.columns = [
      { header: 'Status', key: 'status', width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF640D5F' } };

    const statusOptions = ['DIAJUKAN', 'DIBATALKAN'];

    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`A${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${statusOptions.join(',')}"`],
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Template_Import_Transaksi.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template berhasil diunduh");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) { toast.error("File Excel kosong"); return; }
        setPreviewData(data);
        toast.info(`${data.length} baris data terdeteksi`);
      } catch (error) { toast.error("Gagal membaca file Excel"); }
    };
    reader.readAsBinaryString(file);
    // Reset input value so the same file can be uploaded again if cleared
    e.target.value = '';
  };

  const importData = async () => {
    if (previewData.length === 0) return;
    setLoading(true);
    
    const errors: string[] = [];
    const formattedData = previewData.map((row, index) => {
      const rowNum = index + 2;
      
      const status = row["Status"] || "DIAJUKAN";

      if (!["DIAJUKAN", "DIBATALKAN"].includes(status)) {
        errors.push(`Baris ${rowNum}: Status harus DIAJUKAN atau DIBATALKAN`);
      }

      return {
        school_name: "",
        po_number: "",
        transaction_amount: 0,
        bm_percentage: 0,
        code: generateTransactionCode(),
        cabang: "",
        nama_siplah: "",
        produk: "",
        rekanan_type: "NON REKANAN",
        nama_rekanan: "",
        bank_name: "",
        account_number: "",
        account_owner: "",
        status
      };
    });

    if (errors.length > 0) {
      const displayErrors = errors.slice(0, 5);
      const remaining = errors.length - 5;
      
      toast.error(
        <div className="space-y-1">
          <p className="font-bold">Impor Dibatalkan! Terdapat kesalahan data:</p>
          <ul className="list-disc ml-4 text-xs">
            {displayErrors.map((err, i) => <li key={i}>{err}</li>)}
            {remaining > 0 && <li>...dan {remaining} kesalahan lainnya</li>}
          </ul>
        </div>,
        { duration: 6000 }
      );
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('transactions').insert(formattedData);
      if (error) throw error;

      // Mencatat log aktivitas bulk import
      await logActivity("BULK_IMPORT_TRANSACTIONS", {
        count: formattedData.length,
        file_name: fileName
      });

      toast.success(`${formattedData.length} data berhasil diimpor! Mengirim ringkasan WhatsApp...`);
      await sendSummaryNotification(formattedData);
      toast.success("Ringkasan WhatsApp telah dikirim.");
      setPreviewData([]);
      setFileName("");
    } catch (error: any) {
      toast.error("Gagal mengimpor data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/5">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-2xl text-green-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-slate-800">Input Masal Excel</CardTitle>
              <CardDescription>Unggah banyak data sekaligus. Sistem akan memvalidasi kelengkapan data sebelum diimpor.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">1</span>
                Unduh Template
              </h3>
              <p className="text-sm text-slate-500">Gunakan template resmi agar format data sesuai dengan sistem.</p>
              <Button onClick={downloadTemplate} variant="outline" className="w-full rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-bold">
                <Download className="w-4 h-4 mr-2" /> Download Template
              </Button>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">2</span>
                Unggah File
              </h3>
              <div className="relative">
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors ${fileName ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-primary/40'}`}>
                  <Upload className={`w-8 h-8 mb-2 ${fileName ? 'text-green-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium text-slate-600">{fileName || "Klik atau seret file ke sini"}</span>
                </div>
              </div>
            </div>
          </div>

          {previewData.length > 0 && (
            <Alert className="bg-blue-50 border-blue-200 rounded-2xl relative">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <button 
                onClick={clearPreview}
                className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-100"
                title="Hapus pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
              <AlertTitle className="text-blue-800 font-bold">Data Terdeteksi</AlertTitle>
              <AlertDescription className="text-blue-700">
                Terdapat <strong>{previewData.length} baris</strong> data yang akan divalidasi.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Button onClick={importData} disabled={loading || previewData.length === 0} className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20">
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses...</> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Validasi & Impor Data</>}
            </Button>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ketentuan Kolom:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-600">
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Status</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Kode dibuat otomatis</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkImport;
