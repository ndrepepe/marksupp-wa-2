"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Search, Calendar, User, ShieldAlert, Clock } from "lucide-react";
import { toast } from "sonner";

const ActivityLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error("Gagal memuat log aktivitas: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      (log.details && log.details.toLowerCase().includes(searchLower))
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <Badge className="bg-green-500 hover:bg-green-600">LOGIN</Badge>;
      case "LOGOUT":
        return <Badge className="bg-gray-500 hover:bg-gray-600">LOGOUT</Badge>;
      case "CREATE_TRANSACTION":
        return <Badge className="bg-blue-500 hover:bg-blue-600">CREATE</Badge>;
      case "BULK_IMPORT_TRANSACTIONS":
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">BULK IMPORT</Badge>;
      case "UPDATE_TRANSACTION":
        return <Badge className="bg-amber-500 hover:bg-amber-600">UPDATE</Badge>;
      case "DELETE_TRANSACTION":
        return <Badge className="bg-red-500 hover:bg-red-600">DELETE</Badge>;
      case "APPROVE_TRANSACTION":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">APPROVE</Badge>;
      case "DOWNLOAD_PDF":
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">DOWNLOAD PDF</Badge>;
      case "UPLOAD_ATTACHMENT":
        return <Badge className="bg-orange-500 hover:bg-orange-600">UPLOAD ATTACHMENT</Badge>;
      case "REMOVE_ATTACHMENT":
        return <Badge className="bg-rose-500 hover:bg-rose-600">REMOVE ATTACHMENT</Badge>;
      case "MARK_PRINTED":
        return <Badge className="bg-purple-500 hover:bg-purple-600">MARK PRINTED</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Log Aktivitas Pengguna
          </CardTitle>
          <CardDescription>Memantau aktivitas login, logout, dan perubahan data (CRUD) oleh semua pengguna.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Cari berdasarkan email user, aksi, atau detail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold w-[180px]">Waktu</TableHead>
                <TableHead className="font-bold">Pengguna</TableHead>
                <TableHead className="font-bold">Aksi</TableHead>
                <TableHead className="font-bold">Detail Aktivitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Belum ada log aktivitas yang tercatat.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.created_at).toLocaleDateString("id-ID")}
                        <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.user_email}
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-xs text-slate-600 font-mono max-w-xs truncate" title={log.details}>
                      {log.details || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLogs;