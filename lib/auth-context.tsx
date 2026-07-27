'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { slugifyOrg } from './utils/org';

export interface AuthUser {
  id: string;
  staffId: string;
  name: string;
  role: string;
  isAdmin: boolean;
  organizationName: string;
  department: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (staffId: string, password: string, org: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, staffId: string, password: string, role: string, org: string, dept: string) => Promise<{ success: boolean; error?: string }>;
  getUsers: () => Promise<AuthUser[]>;
  updateUserRole: (userId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (userId: string, updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDummyEmail = (staffId: string) => `${staffId.toLowerCase().replace(/[^a-z0-9]/g, '')}@acrux.local`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.user_metadata);
      }
      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only update the user state for session-bearing events.
      // Ignore USER_UPDATED — it can fire during admin.createUser() operations
      // in some Supabase versions and must not displace the current session.
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        await loadUserProfile(session.user.id, session.user.user_metadata);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logAudit = async (action: string, entityType: string, entityId: string, changes?: any) => {
    if (!user) return;
    
    try {
      await supabase.from('audit_logs').insert({
        userId: user.id,
        action,
        entityType,
        entityId,
        changes: changes || {},
        orgId: slugifyOrg(user.organizationName),
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  };

  const loadUserProfile = async (userId: string, metadata: any) => {
    // Fetch from Supabase directly
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser({
        id: profile.id,
        staffId: profile.staffId || metadata.staffId,
        name: profile.name || metadata.name,
        role: profile.role || metadata.role,
        isAdmin: profile.isAdmin ?? metadata.isAdmin,
        organizationName: profile.organizationName || metadata.organizationName,
        department: profile.department || metadata.department,
      });
      return;
    }

    // ---- SELF-HEALING: No profile row found ----
    // This happens for users created before the DB trigger was installed.
    // Build the profile from Supabase Auth metadata and upsert it.
    if (metadata?.staffId || metadata?.name) {
      const orgSlug = metadata.organizationName
        ? metadata.organizationName.toLowerCase().replace(/\s+/g, '-')
        : 'acrux-it-solutions';

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const email = authUser?.email || '';

      await supabase.from('user_profiles').upsert({
        id: userId,
        email,
        staffId: metadata.staffId || '',
        name: metadata.name || email.split('@')[0],
        role: metadata.role || 'user',
        isAdmin: metadata.isAdmin === true || metadata.role === 'superadmin' || metadata.role === 'admin',
        organizationName: orgSlug,
        department: metadata.department || 'General',
        defaultCurrency: 'USD',
      }, { onConflict: 'id' });

      setUser({
        id: userId,
        staffId: metadata.staffId || '',
        name: metadata.name || email.split('@')[0],
        role: metadata.role || 'user',
        isAdmin: metadata.isAdmin === true || metadata.role === 'superadmin' || metadata.role === 'admin',
        organizationName: orgSlug,
        department: metadata.department || 'General',
      });
    }
  };

  const login = async (staffId: string, password: string, org: string) => {
    try {
      const email = getDummyEmail(staffId);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error || !data.session) {
        return { success: false, error: error?.message || 'Invalid credentials' };
      }

      // Verify organization matches
      const meta = data.user.user_metadata || {};
      if (slugifyOrg(meta.organizationName) !== slugifyOrg(org)) {
        await supabase.auth.signOut();
        return { success: false, error: 'Organization mismatch' };
      }

      // Fetch profile - handle 406 gracefully with metadata fallback
      let profileData = null;
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .limit(1);
        
        if (!profileError && profiles && profiles.length > 0) {
          profileData = profiles[0];
        }
      } catch (e) {
        console.warn('[AuthContext] Profile fetch failed, using metadata fallback:', e);
      }

      // Build user object from profile OR metadata
      const authUser = {
        id: data.user.id,
        staffId: profileData?.staffId || meta.staffId || staffId,
        name: profileData?.name || meta.name || 'User',
        role: profileData?.role || meta.role || 'user',
        isAdmin: profileData?.isAdmin ?? (meta.isAdmin === true),
        organizationName: profileData?.organizationName || meta.organizationName || org,
        department: profileData?.department || meta.department || 'General',
      };

      setUser(authUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const register = async (name: string, staffId: string, password: string, role: string, org: string, dept: string) => {
    try {
      const orgSlug = slugifyOrg(org);

      // 1. Check if user already exists (prevent duplicate API calls)
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('staffId', staffId)
        .eq('organizationName', orgSlug)
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: 'User with this Staff ID already exists in your organization.' };
      }

      // PRIVILEGE CHECK: Only Superadmins can create other Superadmins
      if (role === 'superadmin' && user?.role !== 'superadmin') {
        return { 
          success: false, 
          error: 'Only Superadmins can create Superadmin accounts.' 
        };
      }

      // ALL roles (user, admin, superadmin) go through the server-side API.
      //
      // CRITICAL: supabase.auth.signUp() on the client side auto-signs-in the
      // newly created user, which fires onAuthStateChange and replaces the
      // currently logged-in admin's session with the new user's session —
      // causing the dashboard to go blank and spin until a hard refresh.
      //
      // auth.admin.createUser() (service role, server-side) does NOT create a
      // client session, so the admin's session is never disturbed.
      try {
        const response = await fetch('/api/create-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            staffId, 
            password, 
            name, 
            role,
            organizationName: orgSlug, 
            department: dept 
          })
        });
        
        const data = await response.json();
        if (!response.ok || !data.success) {
          if (response.status === 429) {
            return { success: false, error: 'System busy. Please wait 30 seconds and try again.' };
          }
          return { success: false, error: data.error || 'Failed to create user' };
        }

        // Log audit against the currently signed-in admin (user state is untouched)
        await logAudit('CREATE', 'user_profiles', data.user.id, { name, staffId, role, department: dept });

        return { success: true };
        
      } catch (err: any) {
        return { success: false, error: 'Network error during user creation' };
      }

    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const getUsers = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organizationName', slugifyOrg(user.organizationName));

    if (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }

    return data.map(p => ({
      id: p.id,
      staffId: p.staffId,
      name: p.name,
      role: p.role,
      isAdmin: p.isAdmin,
      organizationName: p.organizationName,
      department: p.department,
    }));
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    // 1. SAFETY CHECK: Prevent revoking the LAST admin/superadmin
    const currentUsers = await getUsers();
    const targetUser = currentUsers.find(u => u.id === userId);
    const adminCount = currentUsers.filter(u => u.isAdmin).length;
    
    if (targetUser?.isAdmin && adminCount <= 1) {
      return { 
        success: false, 
        error: 'Cannot revoke the last administrator. Create a new admin first.' 
      };
    }

    // 2. PRIVILEGE CHECK: Only Superadmins can modify Superadmin accounts
    if (targetUser?.role === 'superadmin' && user?.role !== 'superadmin') {
      return { 
        success: false, 
        error: 'Only Superadmins can modify Superadmin accounts.' 
      };
    }

    // 3. PRIVILEGE CHECK: Regular admins cannot promote others to superadmin
    if (newRole === 'superadmin' && user?.role !== 'superadmin') {
      return { 
        success: false, 
        error: 'Only Superadmins can create Superadmin accounts.' 
      };
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole, isAdmin: newRole !== 'user' })
      .eq('id', userId);

    if (error) return { success: false, error: error.message };

    // Log audit
    await logAudit('UPDATE', 'user_profiles', userId, { role: newRole, isAdmin: newRole !== 'user' });

    return { success: true };
  };

  const deleteUser = async (userId: string) => {
    // 1. SAFETY CHECK: Prevent deleting the LAST admin/superadmin
    const currentUsers = await getUsers();
    const targetUser = currentUsers.find(u => u.id === userId);
    const adminCount = currentUsers.filter(u => u.isAdmin).length;
    
    if (targetUser?.isAdmin && adminCount <= 1) {
      return { 
        success: false, 
        error: 'Cannot delete the last administrator. Create a new admin first.' 
      };
    }

    // 2. PRIVILEGE CHECK: Only Superadmins can delete Superadmin accounts
    if (targetUser?.role === 'superadmin' && user?.role !== 'superadmin') {
      return { 
        success: false, 
        error: 'Only Superadmins can delete Superadmin accounts.' 
      };
    }

    // Delete profile first (RLS allows this)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileError) return { success: false, error: profileError.message };

    // Log audit
    await logAudit('DELETE', 'user_profiles', userId);

    // Note: Deleting auth user requires service role key (do this via Edge Function if needed)
    // For now, we just disable the profile
    return { success: true };
  };

  const updateUserProfile = async (userId: string, updates: Partial<AuthUser>) => {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    
    // Log audit
    await logAudit('UPDATE', 'user_profiles', userId, updates);
    
    // Update current user state if self
    if (user?.id === userId) {
      setUser(prev => prev ? { ...prev, ...updates } : null);
    }
    
    return { success: true };
  };

  const changePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, error: error.message };

    // Log audit
    await logAudit('UPDATE', 'auth', user?.id || '', { action: 'password_change' });

    return { success: true };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut failed (offline?):', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, logout, register, getUsers,
      updateUserRole, deleteUser, updateUserProfile, changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
