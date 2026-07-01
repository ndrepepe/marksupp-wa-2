"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus, Key, Shield, Trash2, RefreshCw, Pencil, UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form Create User
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [newNama, setNewNama] = useState("");
  const [newNoHp, setNewNoHp] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Form Change Password
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Form Edit Profile (Nama & No HP)
  const [editUser, setEditUser] = useState<any>(null);
  const [editNama, setEditNama] = useState("");
  const [editNoHp, setEditNoHp] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_users_admin');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Gagal memuat daftar user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error("Email dan Password wajib diisi");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.rpc('create_user_admin', {
        user_email: newEmail,
        user_password: newPassword,
        user_role: newRole,
        user_nama: newNama || null,
        user_no_hp: newNoHp || null,
      });

      if (error) throw error;

      toast.success("User baru berhasil dibuat!");
      setNewEmail("");
      setNewPassword("");
      setNewRole("STAFF");
      setNewNama("");
      setNewNoHp("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error("Gagal membuat user: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.rpc('update_user_role_admin', {
        target_user_id: userId,
        new_role: role
      });

      if (error) throw error;

      toast.success("Role user berhasil diperbarui!");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error("Gagal memperbarui role: " + error.message);
    }
  };

  const handleChangePassword = async () => {
    if (!newPasswordForUser) {
      toast.error("Password baru wajib diisi");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.rpc('update_user_password_admin', {
        target_user_id: selectedUser.id,
        new_password: newPasswordForUser
      });

      if (error) throw error;

      toast.success(`Password untuk ${selectedUser.email} berhasil diubah!`);
      setIsPasswordDialogOpen(false);
      setNewPasswordForUser("");
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Gagal mengubah password: " + error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase.rpc('update_user_profile_admin', {
        target_user_id: editUser.id,
        user_nama: editNama,
        user_no_hp: editNoHp,
      });

      if (error) throw error;

      toast.success(`Profil untuk ${editUser.email} berhasil diperbarui!`);
      setIsEditDialogOpen(false);
      setEditUser(null);
      setEditNama("");
      setEditNoHp("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil: " + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user ${email}?`)) return;

    try {
      const { error } = await supabase.rpc('delete_user_admin', {
        target_user_id: userId
      });

      if (error) throw error;

      toast.success("User berhasil dihapus");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Gagal menghapus user: " + error.message);
    }
  };

  const openEditDialog = (u: any) => {
    const meta = u.raw_user_meta_data || {};
    setEditUser(u);
    setEditNama(meta.nama || "");
    setEditNoHp(meta.no_hp || "");
    setIsEditDialogOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Tambah User */}
        <Card className="bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden h-fit">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/5">
            <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Tambah Akun Baru
            </CardTitle>
            <CardDescription>Buat akun staf, manager, atau direktur baru.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nama@pepenio.my.id"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="STAFF">STAFF (Input)</SelectItem>
                    <SelectItem value="MANAGER">MANAGER</SelectItem>
                    <SelectItem value="DIREKTUR">DIREKTUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Nama lengkap"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>No HP</Label>
                <Input
                  type="text"
                  value={newNoHp}
                  onChange={(e) => setNewNoHp(e.target.value)}
                  placeholder="08XXXXXXXXXX"
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" disabled={isCreating} className="w-full rounded-xl font-bold mt-2">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Buat Akun
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Daftar User */}
        <Card className="lg:col-span-2 bg-white/90 backdrop-blur-md border-primary/10 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Daftar Pengguna
              </CardTitle>
              <CardDescription>Kelola hak akses dan password seluruh pengguna.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={loading} className="rounded-full">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Nama</TableHead>
                    <TableHead className="font-bold">No HP</TableHead>
                    <TableHead className="font-bold">Role</TableHead>
                    <TableHead className="font-bold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada user terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      const isSelf = u.email?.toLowerCase() === 'salmon@pepenio.my.id';
                      const currentRole = u.raw_user_meta_data?.role || 'STAFF';
                      const nama = u.raw_user_meta_data?.nama || '-';
                      const noHp = u.raw_user_meta_data?.no_hp || '-';

                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-sm">
                            {u.email}
                            {isSelf && <Badge className="ml-2 bg-primary">Super Admin</Badge>}
                          </TableCell>
                          <TableCell className="text-sm">{nama}</TableCell>
                          <TableCell className="text-sm">{noHp}</TableCell>
                          <TableCell>
                            {isSelf ? (
                              <Badge variant="outline" className="font-bold">SUPER_ADMIN</Badge>
                            ) : (
                              <Select 
                                value={currentRole} 
                                onValueChange={(val) => handleRoleChange(u.id, val)}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs font-bold rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                  <SelectItem value="STAFF" className="text-xs font-bold">STAFF</SelectItem>
                                  <SelectItem value="MANAGER" className="text-xs font-bold">MANAGER</SelectItem>
                                  <SelectItem value="DIREKTUR" className="text-xs font-bold">DIREKTUR</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs font-bold rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => openEditDialog(u)}
                                title="Edit Profil"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" /> Profil
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs font-bold rounded-lg"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setIsPasswordDialogOpen(true);
                                }}
                              >
                                <Key className="w-3.5 h-3.5 mr-1" /> Sandi
                              </Button>
                              {!isSelf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Ganti Password */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Ganti Password User</DialogTitle>
            <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Password Baru</Label>
              <Input
                type="password"
                value={newPasswordForUser}
                onChange={(e) => setNewPasswordForUser(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button onClick={handleChangePassword} disabled={isUpdatingPassword} className="rounded-xl">
              {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
              Simpan Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Profil (Nama & No HP) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              Edit Profil Pengguna
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{editUser?.email}</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                type="text"
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                placeholder="Nama lengkap"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>No HP</Label>
              <Input
                type="text"
                value={editNoHp}
                onChange={(e) => setEditNoHp(e.target.value)}
                placeholder="08XXXXXXXXXX"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="rounded-xl bg-green-600 hover:bg-green-700">
              {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
              Simpan Profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;