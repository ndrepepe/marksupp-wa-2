"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneCall, FileInput, ShieldCheck, Printer, ArrowRight, ArrowDown, HelpCircle, UserCheck } from "lucide-react";

interface Step {
  number: string;
  title: string;
  actor: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  detailInfo?: string[];
}

const SubmissionGuide = () => {
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);

  const steps: Step[] = [
    {
      number: "1",
      title: "Telepon Tim SIPLAH",
      actor: "Cabang",
      description: "Cabang Menelepon Tim SIPLAH untuk menginformasikan Data Transaksi.",
      icon: PhoneCall,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      borderColor: "border-blue-100",
      bgColor: "bg-blue-50/50",
      detailInfo: [
        "Pastikan nomor telepon Tim SIPLAH dalam keadaan aktif.",
        "Sampaikan maksud koordinasi transaksi dengan jelas.",
        "Siapkan data-data awal transaksi sebelum melakukan panggilan."
      ]
    },
    {
      number: "2",
      title: "Input ke Aplikasi",
      actor: "Tim SIPLAH",
      description: "Tim SIPLAH menginputkan data transaksi secara lengkap dan benar ke dalam aplikasi Grand Line Manager.",
      icon: FileInput,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      borderColor: "border-purple-100",
      bgColor: "bg-purple-50/50",
      detailInfo: [
        "Tim SIPLAH membuka menu Input Transaksi.",
        "Memasukkan detail nominal, nomor PO, dan keterangan cabang.",
        "Memastikan seluruh data valid sebelum disimpan ke sistem."
      ]
    },
    {
      number: "3",
      title: "Konfirmasi Accounting",
      actor: "Accounting",
      description: "Pihak Accounting akan melakukan telepon konfirmasi balik ke Cabang untuk verifikasi data.",
      icon: ShieldCheck,
      color: "bg-amber-500",
      textColor: "text-amber-500",
      borderColor: "border-amber-100",
      bgColor: "bg-amber-50/50",
      detailInfo: [
        "Accounting memeriksa data transaksi yang masuk di sistem.",
        "Melakukan panggilan telepon ke Cabang terkait untuk verifikasi kecocokan data.",
        "Menyetujui (approve) transaksi setelah konfirmasi berhasil."
      ]
    },
    {
      number: "4",
      title: "Approval Manager / Direktur",
      actor: "Manager / Direktur",
      description: "Manager dan/atau Direktur memeriksa rincian pengajuan transaksi dan memberikan persetujuan (approval) melalui sistem.",
      icon: UserCheck,
      color: "bg-orange-500",
      textColor: "text-orange-500",
      borderColor: "border-orange-100",
      bgColor: "bg-orange-50/50",
      detailInfo: [
        "Manager/Direktur menerima notifikasi atau melihat daftar transaksi yang ditugaskan.",
        "Melakukan review rincian nominal, % BM, dan alasan pengajuan.",
        "Klik tombol 'Approve' untuk menyetujui pengajuan transaksi."
      ]
    },
    {
      number: "5",
      title: "Cetak Bukti (Print)",
      actor: "Sistem / Cabang",
      description: "Setelah dikonfirmasi, bukti transaksi dapat diunduh dalam bentuk PDF dan dicetak (Print).",
      icon: Printer,
      color: "bg-green-500",
      textColor: "text-green-500",
      borderColor: "border-green-100",
      bgColor: "bg-green-50/50",
      detailInfo: [
        "Masuk ke menu Daftar Transaksi.",
        "Cari transaksi yang telah disetujui oleh Accounting.",
        "Klik tombol cetak/print untuk mengunduh dokumen PDF resmi."
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/5">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-slate-800">Petunjuk Pengajuan Transaksi</CardTitle>
              <CardDescription>Klik pada salah satu langkah di bawah ini untuk melihat detail petunjuk yang lebih jelas.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-10 space-y-10">
          
          {/* Bagan Alur Visual */}
          <div className="relative flex flex-col lg:flex-row items-stretch justify-between gap-6 lg:gap-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                {/* Card Langkah */}
                <div 
                  onClick={() => setSelectedStep(step)}
                  className={`w-full lg:flex-1 border ${step.borderColor} ${step.bgColor} rounded-2xl p-6 shadow-sm hover:shadow-md hover:scale-105 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between`}
                >
                  {/* Badge Nomor */}
                  <div className={`absolute -top-3 -left-3 w-8 h-8 ${step.color} text-white rounded-full flex items-center justify-center font-black text-sm shadow-md`}>
                    {step.number}
                  </div>

                  <div className="flex flex-col items-center text-center space-y-4 h-full justify-between">
                    <div className={`p-4 rounded-2xl bg-white shadow-sm ${step.textColor} group-hover:scale-110 transition-transform duration-300`}>
                      <step.icon className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {step.actor}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm pt-1 leading-tight">{step.title}</h4>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {step.description}
                    </p>
                    
                    <span className="text-[10px] font-semibold text-primary/70 group-hover:text-primary transition-colors pt-2">
                      Klik untuk detail →
                    </span>
                  </div>
                </div>

                {/* Panah Penghubung */}
                {index < steps.length - 1 && (
                  <>
                    {/* Panah Desktop */}
                    <div className="hidden lg:flex items-center justify-center text-primary/40 animate-pulse">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                    {/* Panah Mobile */}
                    <div className="flex lg:hidden items-center justify-center text-primary/40 py-2 animate-pulse">
                      <ArrowDown className="w-5 h-5" />
                    </div>
                  </>
                )}
              </React.Fragment>
            ))}
          </div>

        </CardContent>
      </Card>

      {/* Popup Modal Detail Langkah */}
      <Dialog open={selectedStep !== null} onOpenChange={(open) => !open && setSelectedStep(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-primary/10 bg-white/95 backdrop-blur-md transition-all duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-90 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-12 data-[state=closed]:slide-out-to-bottom-8">
          {selectedStep && (
            <div className="space-y-6">
              <DialogHeader className="flex flex-col items-center text-center space-y-3">
                <div className={`p-5 rounded-3xl ${selectedStep.bgColor} ${selectedStep.textColor} inline-block`}>
                  <selectedStep.icon className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    Langkah {selectedStep.number} • {selectedStep.actor}
                  </span>
                  <DialogTitle className="text-2xl font-black text-slate-800 pt-2">
                    {selectedStep.title}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed text-center font-medium">
                    {selectedStep.description}
                  </p>
                </div>

                {selectedStep.detailInfo && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detail Prosedur:</h4>
                    <ul className="space-y-2">
                      {selectedStep.detailInfo.map((info, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className={`w-5 h-5 rounded-full ${selectedStep.bgColor} ${selectedStep.textColor} flex items-center justify-center shrink-0 font-bold text-[10px]`}>
                            {idx + 1}
                          </span>
                          <span className="pt-0.5">{info}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmissionGuide;