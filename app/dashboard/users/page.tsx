'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, AuthUser } from '@/lib/auth-context';
import { slugifyOrg } from '@/lib/utils/org';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Trash2, 
  Building, 
  Zap,
  ShieldAlert,
  Search,
  UserPlus,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCog,
  ChevronRight,
  Edit,
  X
} from 'lucide-react';
import { toast } from 'sonner';

/** Design System Constants */
const FONT_SANS = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
const FONT_HEADING = "'Outfit', 'Inter', 'Segoe UI', sans-serif";

const COLORS = {
  primary: '#14532d', // Forest Green
  primaryLight: '#16a34a', // Green 600
  primaryGradient: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
  accent: '#10b981', // Emerald 500
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  adminBadge: '#10b981', // Emerald
  userBadge: '#64748b', // Slate
};

export default function UserManagementPage() {
  const { user: currentUser, getUsers, updateUserRole, deleteUser, updateUserProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', staffId: '', department: '' });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getUsers();
      // Don't filter by organization - getUsers already does this
      setUsers(allUsers);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleToggleRole = async (targetUser: any) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const actionName = newRole === 'admin' ? 'promote' : 'revoke';
    
    if (!confirm(`Are you sure you want to ${actionName} ${targetUser.name} ${newRole === 'admin' ? 'to Administrator' : 'as Regular Staff'}?`)) {
      return;
    }

    try {
      setActionLoading(targetUser.id);
      await updateUserRole(targetUser.id, newRole);
      toast.success(`${targetUser.name} role updated to ${newRole}`);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${actionName} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (targetUser: any) => {
    if (!confirm(`CAUTION: Are you sure you want to delete ${targetUser.name}'s account? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(targetUser.id);
      const result = await deleteUser(targetUser.id);
      if (result.success) {
        toast.success(`${targetUser.name}'s account has been deleted.`);
        await fetchUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({ name: user.name, staffId: user.staffId, department: user.department || 'General' });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setActionLoading(editingUser.id);
      const result = await updateUserProfile(editingUser.id, editForm);
      if (result.success) {
        toast.success('User profile updated successfully');
        setEditingUser(null);
        await fetchUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', staffId: '', department: '' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Spinner className="w-12 h-12" style={{ color: COLORS.primary }} />
        <p style={{ fontFamily: FONT_SANS, color: COLORS.textMuted, fontWeight: 500 }}>Loading team data...</p>
      </div>
    );
  }

  if (!currentUser?.isAdmin) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="border-red-500/50 bg-red-50 dark:bg-red-950/20 shadow-xl rounded-2xl">
          <ShieldAlert className="h-6 w-6 text-red-600" />
          <div className="ml-3">
            <h3 style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: '1.25rem' }} className="text-red-900 dark:text-red-100">Access Denied</h3>
            <AlertDescription className="mt-1 text-red-700 dark:text-red-300 font-medium">
              You do not have administrative privileges to manage organization users. 
              Please contact your system administrator if you believe this is an error.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-slate-900">
      
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border-2 border-green-600 shadow-2xl" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-green-400/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-white shadow-lg">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#047857' }} />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" style={{ color: '#ffffff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>User Management</h1>
              </div>
              <p className="font-bold text-sm sm:text-base lg:text-lg" style={{ color: '#d1fae5', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>Active Command Center</p>
            </div>
            
            <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 border-green-500 shadow-xl self-start sm:self-auto" style={{ backgroundColor: '#ffffff' }}>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#d1fae5' }}>
                <Building className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#047857' }} />
              </div>
              <div>
                <p className="font-bold text-xs uppercase tracking-wider" style={{ color: '#065f46' }}>Organization</p>
                <p className="font-black text-sm sm:text-base" style={{ color: '#064e3b' }}>{currentUser.organizationName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="relative overflow-hidden border-2 shadow-xl" style={{ backgroundColor: '#ffffff', borderColor: '#93c5fd' }}>
          <CardHeader className="pb-1 relative p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#1d4ed8' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 pt-0 sm:pt-0">
            <p className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a' }}>{users.length}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#64748b' }}>Active team members</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-2 shadow-xl" style={{ backgroundColor: '#ffffff', borderColor: '#6ee7b7' }}>
          <CardHeader className="pb-1 relative p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#047857' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
              Administrators
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 pt-0 sm:pt-0">
            <p className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a' }}>
              {users.filter(u => u.role === 'admin' || u.isAdmin).length}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#64748b' }}>Full access users</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-xl" style={{ backgroundColor: '#ffffff', borderColor: '#fcd34d' }}>
          <CardHeader className="pb-1 relative p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#b45309' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              Regular Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 pt-0 sm:pt-0">
            <p className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a' }}>
              {users.filter(u => u.role !== 'admin' && !u.isAdmin).length}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#64748b' }}>Standard access users</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-xl" style={{ backgroundColor: '#ffffff', borderColor: '#c4b5fd' }}>
          <CardHeader className="pb-1 relative p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#6d28d9' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 pt-0 sm:pt-0">
            <p className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a' }}>
              {[...new Set(users.map(u => u.department || 'General'))].length}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#64748b' }}>Active departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Table Section */}
      <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-700/50 shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-700/50 bg-slate-800/30 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl text-white font-bold flex items-center gap-2 sm:gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <span className="truncate">Team Directory</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">
                Manage {users.length} team members at {currentUser.organizationName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Member</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-white uppercase tracking-wider hidden sm:table-cell">Department</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Role</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-white uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/20 transition-all duration-200">
                    <td className="px-3 sm:px-6 py-3 sm:py-5">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg flex-shrink-0
                          ${(u.role === 'admin' || u.isAdmin) ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                          {u.name.charAt(0).toUpperCase()}
                          {(u.role === 'admin' || u.isAdmin) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                              <ShieldAlert className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm sm:text-lg truncate">{u.name}</p>
                          <p className="text-blue-300 text-xs sm:text-sm font-medium">
                            {u.id === currentUser.id ? u.staffId : '***'}
                          </p>
                          {/* Mobile-only department info */}
                          <p className="text-slate-400 text-xs sm:hidden mt-0.5">{u.department || 'General'}</p>
                        </div>
                        {u.id === currentUser.id && (
                          <Badge className="bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-200 border border-blue-400/40 font-semibold px-2 sm:px-3 py-0.5 sm:py-1 text-xs flex-shrink-0">
                            You
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-5 hidden sm:table-cell">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-700/50">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{u.department || 'General'}</p>
                          <p className="text-blue-300 text-xs">Department</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-5">
                      {(u.role === 'admin' || u.isAdmin) ? (
                        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 font-bold px-2 sm:px-4 py-1 sm:py-2 shadow-lg shadow-blue-500/20 text-xs sm:text-sm">
                          <ShieldAlert className="w-2 h-2 sm:w-3 sm:h-3 mr-1 sm:mr-2 hidden sm:inline" />
                          <span className="sm:hidden">Admin</span>
                          <span className="hidden sm:inline">Administrator</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200 border-0 font-bold px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">
                          <Users className="w-2 h-2 sm:w-3 sm:h-3 mr-1 sm:mr-2 hidden sm:inline" />
                          Staff
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-5 text-right">
                      {u.id !== currentUser.id ? (
                        <div className="flex items-center justify-end gap-1 sm:gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(u)}
                            disabled={!!actionLoading}
                            className="bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white font-semibold transition-all duration-200 text-xs px-2 sm:px-3 h-8"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRole(u)}
                            disabled={!!actionLoading}
                            className="bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white font-semibold transition-all duration-200 text-xs px-2 sm:px-3 h-8"
                          >
                            {(u.role === 'admin' || u.isAdmin) ? <span className="hidden sm:inline">Revoke Admin</span> : <span className="hidden sm:inline">Make Admin</span>}
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(u)}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border-red-500/50 hover:border-red-500 transition-all duration-200 h-8 w-8"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <Badge className="bg-slate-600/50 text-blue-200 border-0 font-medium italic px-2 sm:px-3 py-0.5 sm:py-1 text-xs">
                            <span className="hidden sm:inline">Managed externally</span>
                            <span className="sm:hidden">External</span>
                          </Badge>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-6 rounded-full bg-slate-700">
                          <Search className="w-10 h-10 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-slate-200">No members found</p>
                          <p className="text-slate-400">Try adjusting your search query</p>
                        </div>
                        <Button variant="outline" className="rounded-xl border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setSearchQuery('')}>Clear search</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer Info */}
      <div className="text-center pb-10">
        <p style={{ fontFamily: FONT_SANS }} className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-[0.2em]">
          End of directory • Data synchronized with local-first vault
        </p>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Edit User Profile</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelEdit}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="User name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Staff ID</label>
                <Input
                  value={editForm.staffId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, staffId: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="ACRUX001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Department</label>
                <Input
                  value={editForm.department}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, department: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  placeholder="General"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3">
              <Button
                onClick={handleSaveEdit}
                disabled={actionLoading === editingUser.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {actionLoading === editingUser.id ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared Components ─── */

function StatCard({ label, value, subtext, icon, color }: any) {
  return (
    <Card 
      className="relative overflow-hidden border-slate-700 shadow-xl transition-all duration-300 hover:-translate-y-1 bg-slate-800 group rounded-2xl"
    >
      <div 
        className="absolute top-0 right-0 w-32 h-32 opacity-20 group-hover:opacity-30 transition-opacity duration-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
        style={{ background: color }}
      />
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between mb-2">
          <div 
            style={{ background: `${color}30`, color: color }}
            className="p-2.5 rounded-xl transition-transform duration-500 group-hover:rotate-12"
          >
            {icon}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1" />
        </div>
        <CardTitle className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">{value}</p>
        <p className="text-xs text-slate-400 font-medium">{subtext}</p>
      </CardContent>
    </Card>
  );
}
