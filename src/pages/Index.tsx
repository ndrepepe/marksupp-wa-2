"use client";

import { useState } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Generator from "./Generator";
import TransactionList from "./TransactionList";
import Dashboard from "./Dashboard";
import BulkImport from "@/components/BulkImport";
import SubmissionGuide from "@/components/SubmissionGuide";
import UserManagement from "@/components/UserManagement";
import ActivityLogs from "@/components/ActivityLogs";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, PlusCircle, LogOut, User, Anchor, LayoutDashboard, FileSpreadsheet, HelpCircle, ShieldAlert, Users, Key, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const { user, role, updateRole, signOut } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === "salmon@pepenio.my.id";
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    try {
      await updateRole(newRole);
      toast.success(`Role berhasil diubah menjadi ${newRole}`);
    } catch (error: any) {
      toast.error("Gagal mengubah role: " + error.message);
    }
  };

  const defaultTab = (role === "MANAGER" || role === "DIREKTUR") ? "list" : "dashboard";
  const showAllTabs = role !== "MANAGER" && role !== "DIREKTUR";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#640D5F]/10 via-[#B12C00]/5 to-[#FFCC00]/10 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-[97%] mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white/90 p-6 rounded-3xl shadow-xl shadow-[#640D5F]/5 border border-[#640D5F]/10 backdrop-blur-md">
          <div className="text-center md:text-left flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/30">
              <Anchor className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Grand Line Manager
              </h1>
              <p className="text-primary font-bold">Sistem Pengelolaan Transaksi & Kode</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Role Switcher - Hanya interaktif untuk Super Admin */}
            {isSuperAdmin ? (
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 px-2 uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Role:
                </span>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-[130px] h-9 rounded-xl border-none bg-white shadow-sm font-bold text-xs text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="STAFF" className="text-xs font-bold">STAFF (Input)</SelectItem>
                    <SelectItem value="MANAGER" className="text-xs font-bold">MANAGER</SelectItem>
                    <SelectItem value="DIREKTUR" className="text-xs font-bold">DIREKTUR</SelectItem>
                    <SelectItem value="SUPER_ADMIN" className="text-xs font-bold">SUPER ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-slate-500 uppercase">Role:</span>
                <span className="text-xs font-bold text-primary bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-100">
                  {role}
                </span>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 bg-white/50 hover:bg-accent hover:text-white border-primary/20 rounded-xl">
                  <User className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline font-bold text-slate-700">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-primary/10">
                <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)} className="cursor-pointer font-medium">
                  <Key className="w-4 h-4 mr-2 text-primary" />
                  Ganti Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-red-600 cursor-pointer font-medium">
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Tabs key={role} defaultValue={defaultTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className={cn(
              "grid w-full max-w-full h-16 p-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-primary/10 overflow-x-auto",
              isSuperAdmin ? "grid-cols-7" : showAllTabs ? "grid-cols-5" : "grid-cols-2"
            )}>
              {showAllTabs && (
                <TabsTrigger 
                  value="dashboard" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
                >
                  <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
              )}
              {showAllTabs && (
                <TabsTrigger 
                  value="input" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
                >
                  <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Input</span>
                </TabsTrigger>
              )}
              {showAllTabs && (
                <TabsTrigger 
                  value="bulk" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Input Masal</span>
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="list" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
              >
                <ClipboardList className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Daftar</span>
              </TabsTrigger>
              <TabsTrigger 
                value="guide" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
              >
                <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Petunjuk</span>
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
                >
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Kelola User</span>
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger 
                  value="logs" 
                  className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-xs md:text-sm font-bold transition-all"
                >
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Log Aktivitas</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {showAllTabs && (
            <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Dashboard />
            </TabsContent>
          )}

          {showAllTabs && (
            <TabsContent value="input" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Generator />
            </TabsContent>
          )}

          {showAllTabs && (
            <TabsContent value="bulk" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <BulkImport />
            </TabsContent>
          )}

          <TabsContent value="list" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TransactionList />
          </TabsContent>

          <TabsContent value="guide" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SubmissionGuide />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <UserManagement />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="logs" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActivityLogs />
            </TabsContent>
          )}
        </Tabs>
      </div>
      <ChangePasswordDialog 
        open={isChangePasswordOpen} 
        onOpenChange={setIsChangePasswordOpen} 
      />
      <MadeWithDyad />
    </div>
  );
};

export default Index;