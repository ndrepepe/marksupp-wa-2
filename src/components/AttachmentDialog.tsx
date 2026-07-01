"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon, FileText, Download, CheckCircle2, Plus, AlertCircle } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';
import { logActivity } from "@/utils/logger";

interface AttachmentDialogProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AttachmentDialog = ({ transaction, open, onOpenChange, onSuccess }: AttachmentDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && transaction?.attachment_url) {
      setPreviewUrl(transaction.attachment_url);
    } else if (!open) {
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open, transaction]);

  const compressPDF = async (pdfFile: File): Promise<File> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Create a new document to strip out all hidden bloat and metadata
      const newPdfDoc = await PDFDocument.create();
      const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page) => newPdfDoc.addPage(page));
      
      // Save with object streams enabled for maximum structure compression
      const pdfBytes = await newPdfDoc.save({ 
        useObjectStreams: true,
        addDefaultPage: false
      });
      
      return new File([pdfBytes], pdfFile.name, { type: 'application/pdf' });
    } catch (error) {
      console.error("PDF optimization error:", error);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const pdfLimit = 1024 * 1024; // 1MB
    const imageLimit = 100 * 1024; // 100KB

    // PDF Handling
    if (selectedFile.type === 'application/pdf') {
      if (selectedFile.size > pdfLimit) {
        const loadingToast = toast.loading("PDF melebihi 1MB. Mencoba optimasi agresif...");
        try {
          const optimizedPdf = await compressPDF(selectedFile);
          toast.dismiss(loadingToast);
          
          if (optimizedPdf.size > pdfLimit) {
            const sizeInMb = (optimizedPdf.size / (1024 * 1024)).toFixed(2);
            toast.error(
              <div className="space-y-1">
                <p className="font-bold">Gagal mengompres PDF di bawah 1MB</p>
                <p className="text-xs">Ukuran akhir: {sizeInMb}MB. File ini mengandung gambar resolusi tinggi yang tidak bisa dikompres otomatis. Silakan gunakan kompresor PDF online atau perkecil ukuran file sebelum diunggah.</p>
              </div>,
              { duration: 6000 }
            );
            e.target.value = '';
            return;
          }
          
          setFile(optimizedPdf);
          setPreviewUrl(null);
          toast.success(`PDF berhasil dioptimasi: ${(selectedFile.size / 1024).toFixed(0)}KB → ${(optimizedPdf.size / 1024).toFixed(0)}KB`);
        } catch (error) {
          toast.dismiss(loadingToast);
          toast.error("Gagal memproses file PDF");
          e.target.value = '';
        }
      } else {
        setFile(selectedFile);
        setPreviewUrl(null);
        toast.success("PDF siap diunggah");
      }
      return;
    }

    // Image Handling
    if (selectedFile.type.startsWith('image/')) {
      if (selectedFile.size > imageLimit) {
        const options = {
          maxSizeMB: 0.09,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.7
        };

        try {
          const loadingToast = toast.loading("Gambar melebihi 100KB. Mengompres otomatis...");
          const compressedFile = await imageCompression(selectedFile, options);
          toast.dismiss(loadingToast);
          
          setFile(compressedFile);
          setPreviewUrl(URL.createObjectURL(compressedFile));
          
          const originalSize = (selectedFile.size / 1024).toFixed(1);
          const compressedSize = (compressedFile.size / 1024).toFixed(1);
          toast.success(`Berhasil dikompres: ${originalSize}KB → ${compressedSize}KB`);
        } catch (error) {
          console.error("Compression error:", error);
          toast.error("Gagal mengompres gambar");
          e.target.value = '';
        }
      } else {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        toast.success("Gambar siap diunggah");
      }
    } else {
      toast.error("Format file tidak didukung. Gunakan Gambar atau PDF.");
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file || !transaction) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${transaction.id}-${Date.now()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('transaction_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('transaction_attachments')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ attachment_url: publicUrl })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Mencatat log aktivitas upload lampiran
      await logActivity("UPLOAD_ATTACHMENT", {
        transaction_id: transaction.id,
        school_name: transaction.school_name,
        file_name: file.name,
        file_size_kb: (file.size / 1024).toFixed(0)
      });

      toast.success("Lampiran berhasil disimpan");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Gagal mengunggah: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    if (!transaction) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ attachment_url: null })
        .eq('id', transaction.id);

      if (error) throw error;

      // Mencatat log aktivitas hapus lampiran
      await logActivity("REMOVE_ATTACHMENT", {
        transaction_id: transaction.id,
        school_name: transaction.school_name
      });

      toast.success("Lampiran berhasil dihapus");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Gagal menghapus lampiran: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Lampiran Bukti</DialogTitle>
          <p className="text-xs text-muted-foreground">{transaction?.school_name}</p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Hidden File Input */}
          <input 
            id="transaction-file-upload"
            type="file"
            ref={fileInputRef}
            className="sr-only"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
          />

          {/* Rules Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Ketentuan File:</p>
              <ul className="text-[10px] text-blue-700 list-disc list-inside space-y-0.5">
                <li>Gambar: Maks 100KB (Otomatis kompres)</li>
                <li>PDF: Maks 1MB (Otomatis optimasi)</li>
              </ul>
            </div>
          </div>

          {/* Preview Area */}
          <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
            {previewUrl ? (
              <>
                {previewUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || previewUrl.startsWith('blob:') ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-primary" />
                    <span className="text-sm font-bold text-slate-700">Dokumen PDF Terlampir</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="rounded-full"
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" /> Lihat Full
                  </Button>
                  {!transaction?.is_printed && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="rounded-full"
                      onClick={handleRemoveAttachment}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4 mr-2" /> Hapus
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <label 
                htmlFor="transaction-file-upload"
                className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer w-full h-full hover:bg-slate-100/50 transition-colors"
              >
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">Belum ada lampiran</p>
                  <p className="text-[10px] text-muted-foreground">Klik untuk memilih file</p>
                </div>
              </label>
            )}
          </div>

          {/* Upload Section */}
          {!transaction?.is_printed && (
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700">Unggah File Baru</Label>
              <label 
                htmlFor="transaction-file-upload"
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/40 transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">
                      Klik untuk memilih Gambar atau PDF
                    </p>
                  </div>
                </div>
                
                <div className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary/5 transition-colors">
                  <Plus className="w-4 h-4 mr-2" /> Pilih File
                </div>
              </label>

              {file && (
                <div className="flex items-center justify-between bg-green-50 border border-green-100 p-3 rounded-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-xs font-bold text-green-800 truncate">{file.name}</span>
                    <span className="text-[10px] text-green-600 shrink-0">({(file.size / 1024).toFixed(0)}KB)</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null); 
                      setPreviewUrl(transaction?.attachment_url || null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }} 
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Tutup
          </Button>
          {file && (
            <Button onClick={handleUpload} disabled={uploading} className="rounded-xl bg-primary shadow-lg shadow-primary/20">
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Simpan Lampiran</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentDialog;