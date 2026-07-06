"use client";

import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Calendar, CheckCircle2, Clock3, X, XCircle } from "lucide-react";
import {
  format,
  isSameMonth,
  setMonth,
  setYear,
  getYear,
  getMonth,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { MonthMultiSelect } from "@/components/MonthMultiSelect";
import { YearMultiSelect } from "@/components/YearMultiSelect";

interface Transaction {
  created_at: string;
  status: string | null;
}

const Dashboard = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    diajukan: 0,
    disetujui: 0,
    dibatalkan: 0,
  });
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonths, setSelectedMonths] = useState<string[]>([getMonth(now).toString()]);
  const [selectedYears, setSelectedYears] = useState<string[]>([getYear(now).toString()]);

  const years = Array.from({ length: 5 }, (_, i) => (getYear(now) - i).toString());
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    processData();
  }, [selectedMonths, selectedYears, allTransactions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('created_at, status');

      if (error) throw error;
      setAllTransactions(transactions || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    const activeMonths = selectedMonths.length > 0
      ? selectedMonths
      : Array.from({ length: 12 }, (_, i) => i.toString());

    const activeYears = selectedYears.length > 0
      ? selectedYears
      : [getYear(now).toString()];

    return allTransactions.filter(t => {
      const date = parseISO(t.created_at);
      return activeYears.includes(getYear(date).toString()) && activeMonths.includes(getMonth(date).toString());
    });
  };

  const processData = () => {
    const filteredTransactions = getFilteredTransactions();

    setStats({
      total: filteredTransactions.length,
      diajukan: filteredTransactions.filter(t => (t.status || "DIAJUKAN") === "DIAJUKAN").length,
      disetujui: filteredTransactions.filter(t => t.status === "DISETUJUI").length,
      dibatalkan: filteredTransactions.filter(t => t.status === "DIBATALKAN").length,
    });

    const activeMonths = selectedMonths.length > 0
      ? selectedMonths
      : Array.from({ length: 12 }, (_, i) => i.toString());
    const activeYears = selectedYears.length > 0
      ? selectedYears
      : [getYear(now).toString()];

    const sortedYears = [...activeYears].sort((a, b) => parseInt(a) - parseInt(b));
    const sortedMonthIndices = [...activeMonths].map(Number).sort((a, b) => a - b);

    const newChartData: any[] = [];

    sortedYears.forEach(yearStr => {
      const year = parseInt(yearStr);
      sortedMonthIndices.forEach(monthIdx => {
        const monthDate = setYear(setMonth(new Date(), monthIdx), year);
        const monthTransactions = allTransactions.filter(t =>
          isSameMonth(parseISO(t.created_at), monthDate)
        );

        newChartData.push({
          name: format(monthDate, 'MMM yy', { locale: id }),
          total: monthTransactions.length,
          diajukan: monthTransactions.filter(t => (t.status || "DIAJUKAN") === "DIAJUKAN").length,
          disetujui: monthTransactions.filter(t => t.status === "DISETUJUI").length,
          dibatalkan: monthTransactions.filter(t => t.status === "DIBATALKAN").length,
        });
      });
    });

    setChartData(newChartData);
  };

  const resetFilters = () => {
    setSelectedMonths([getMonth(now).toString()]);
    setSelectedYears([getYear(now).toString()]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedMonthsLabel = selectedMonths.length === 0
    ? "Semua Bulan"
    : selectedMonths.length === 1
      ? months[parseInt(selectedMonths[0])]
      : `${selectedMonths.length} Bulan`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-end gap-4 bg-white/50 p-4 rounded-2xl border border-primary/10 backdrop-blur-sm">
        <div className="space-y-1.5 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Pilih Bulan (Kosongkan untuk Semua)</label>
          <MonthMultiSelect selected={selectedMonths} onChange={setSelectedMonths} months={months} />
        </div>
        <div className="space-y-1.5 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Pilih Tahun</label>
          <YearMultiSelect selected={selectedYears} onChange={setSelectedYears} years={years} />
        </div>
        <Button
          variant="ghost"
          onClick={resetFilters}
          className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl"
        >
          <X className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Transaksi ({selectedMonthsLabel})</CardTitle>
            <Activity className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            <p className="text-xs text-slate-500 mt-1">Total data periode ini</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Diajukan</CardTitle>
            <Clock3 className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.diajukan}</div>
            <p className="text-xs text-slate-500 mt-1">Menunggu proses</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Disetujui</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.disetujui}</div>
            <p className="text-xs text-slate-500 mt-1">Sudah approved</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Dibatalkan</CardTitle>
            <XCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.dibatalkan}</div>
            <p className="text-xs text-slate-500 mt-1">Tidak dilanjutkan</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Calendar className="w-5 h-5 text-primary" />
            Jumlah Transaksi
          </CardTitle>
          <CardDescription>Data untuk periode {selectedMonthsLabel} di tahun {selectedYears.join(', ')}</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="total" name="Total" fill="#640D5F" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
