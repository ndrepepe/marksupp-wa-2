"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, DollarSign, PieChart, Activity, Calendar, X } from "lucide-react";
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
  transaction_amount: number;
  bm_percentage: number;
  created_at: string;
}

const Dashboard = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalBM: 0,
    count: 0,
    avgBM: 0
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
    if (allTransactions.length > 0) {
      processData();
    }
  }, [selectedMonths, selectedYears, allTransactions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_amount, bm_percentage, created_at');

      if (error) throw error;
      setAllTransactions(transactions || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    const activeMonths = selectedMonths.length > 0 
      ? selectedMonths 
      : Array.from({ length: 12 }, (_, i) => i.toString());

    const activeYears = selectedYears.length > 0
      ? selectedYears
      : [getYear(now).toString()];

    const filteredTransactions = allTransactions.filter(t => {
      const date = parseISO(t.created_at);
      const yearMatch = activeYears.includes(getYear(date).toString());
      const monthMatch = activeMonths.includes(getMonth(date).toString());
      return yearMatch && monthMatch;
    });

    let totalAmount = 0;
    let totalBM = 0;
    
    filteredTransactions.forEach(t => {
      const amount = Number(t.transaction_amount);
      const bm = amount * (Number(t.bm_percentage) / 100);
      totalAmount += amount;
      totalBM += bm;
    });

    setStats({
      totalAmount,
      totalBM,
      count: filteredTransactions.length,
      avgBM: totalAmount > 0 ? (totalBM / totalAmount) * 100 : 0
    });

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

        let mAmount = 0;
        let mBM = 0;

        monthTransactions.forEach(t => {
          const amount = Number(t.transaction_amount);
          const bm = amount * (Number(t.bm_percentage) / 100);
          mAmount += amount;
          mBM += bm;
        });

        newChartData.push({
          name: format(monthDate, 'MMM yy', { locale: id }),
          total: mAmount,
          bm: mBM,
          year: yearStr
        });
      });
    });

    setChartData(newChartData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
      {/* Filters Section */}
      <div className="flex flex-col md:flex-row items-end gap-4 bg-white/50 p-4 rounded-2xl border border-primary/10 backdrop-blur-sm">
        <div className="space-y-1.5 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Pilih Bulan (Kosongkan untuk Semua)</label>
          <MonthMultiSelect 
            selected={selectedMonths} 
            onChange={setSelectedMonths} 
            months={months} 
          />
        </div>
        <div className="space-y-1.5 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Pilih Tahun</label>
          <YearMultiSelect 
            selected={selectedYears} 
            onChange={setSelectedYears} 
            years={years} 
          />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Transaksi ({selectedMonthsLabel})</CardTitle>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.count}</div>
            <p className="text-xs text-slate-500 mt-1">Total data periode ini</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Nilai Transaksi</CardTitle>
            <div className="p-2 bg-green-100 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-slate-500 mt-1">Total PO periode ini</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Total BM</CardTitle>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalBM)}</div>
            <p className="text-xs text-slate-500 mt-1">Bonus terkumpul</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-600">Rata-rata BM</CardTitle>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
              <PieChart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.avgBM.toFixed(1)}%</div>
            <p className="text-xs text-slate-500 mt-1">Persentase rata-rata</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Calendar className="w-5 h-5 text-primary" />
              Perbandingan Transaksi
            </CardTitle>
            <CardDescription>Data untuk periode {selectedMonthsLabel} di tahun {selectedYears.join(', ')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `Rp${value / 1000000}jt`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Total Transaksi']}
                />
                <Bar 
                  dataKey="total" 
                  fill="#640D5F" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Perbandingan BM
            </CardTitle>
            <CardDescription>Data untuk periode {selectedMonthsLabel} di tahun {selectedYears.join(', ')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `Rp${value / 1000000}jt`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Total BM']}
                />
                <Bar 
                  dataKey="bm" 
                  fill="#B12C00" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;