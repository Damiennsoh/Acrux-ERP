'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import { HybridSyncEngine } from './sync-service';
import { getDB } from './indexeddb';
import { securityService } from './security-service';
import { userDB } from './user-db';
import { slugifyOrg } from './utils/org';
import { createClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  staffId: string;
  name: string;
  role: string;
  isAdmin: boolean;
  organizationName: string;
  department: string;
  defaultCurrency?: string;
  isAnonymous?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (staffId: string, pin: string, organizationName?: string) => Promise<{ success: boolean; error?: string; locked?: boolean; lockoutRemaining?: number }>;
  logout: () => void;
  register: (name: string, staffId: string, password: string, role: string, organizationName?: string, department?: string, securityQuestion?: string, securityAnswer?: string) => Promise<{ success: boolean; error?: string }>;
  getUsers: () => Promise<any[]>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  removeInitialAdmin: () => Promise<{ success: boolean; error?: string }>;
  getSecurityQuestion: (staffId: string, orgName?: string) => Promise<string | null>;
  verifySecurityAnswer: (staffId: string, answer: string, orgName?: string) => Promise<{ success: boolean; user?: AuthUser; error?: string; locked?: boolean; lockoutRemaining?: number }>;
  verifyAdminPassword: (password: string) => Promise<{ success: boolean; error?: string; locked?: boolean; lockoutRemaining?: number }>;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  checkLockoutStatus: (staffId: string) => Promise<{ locked: boolean; remaining: number; attemptsRemaining: number }>;
  
  isCloudSyncing: boolean;
  cloudSyncError: string | null;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to map staffId to a pseudo-email for Supabase Auth
// Use deterministic mapping so same staff ID always maps to same email
const getEmailFromStaffId = (staffId: string) => {
  const clean = staffId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@glp-erp.local`;
};

// Create service role client for admin operations (bypasses rate limits)
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // We start true, but we will block children rendering until IDB pre-loads optimistic UI
  });
  const [isPreflightComplete, setIsPreflightComplete] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Step 1: Pre-fetch from IndexedDB for "instant" UI
        // We look for any session key that might exist
        const db = await getDB();
        const sessions = await db.getAll('auth_sessions');
        
        // Find the main session key (usually starts with sb-)
        const sessionEntry = sessions.find(s => s.id.includes('-auth-token'));
        
        if (sessionEntry && sessionEntry.sessionData?.user) {
          const user = sessionEntry.sessionData.user;
          const meta = user.user_metadata || {};
          
          const authUser: AuthUser = {
            id: user.id,
            staffId: meta.staffId || 'Guest',
            name: meta.name || (user.is_anonymous ? 'Guest User' : 'User'),
            role: meta.role || (user.is_anonymous ? 'guest' : 'user'),
            isAdmin: meta.isAdmin === true,
            organizationName: meta.organizationName || 'Trial Org',
            department: meta.department || 'General',
            defaultCurrency: meta.defaultCurrency,
            isAnonymous: user.is_anonymous || !user.email
          };

          setState({
            user: authUser,
            isAuthenticated: true,
            isLoading: false,
          });
        }

        // Step 2: Formal Supabase session recovery
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          const meta = session.user.user_metadata || {};
          const authUser: AuthUser = {
            id: session.user.id,
            staffId: meta.staffId || 'Unknown',
            name: meta.name || (session.user.is_anonymous ? 'Guest User' : 'User'),
            role: meta.role || (session.user.is_anonymous ? 'guest' : 'user'),
            isAdmin: meta.isAdmin === true,
            organizationName: meta.organizationName || 'Default Org',
            department: meta.department || 'General',
            defaultCurrency: meta.defaultCurrency,
            isAnonymous: session.user.is_anonymous
          };

          setState({
            user: authUser,
            isAuthenticated: true,
            isLoading: false,
          });

          // Background Sync if online
          if (navigator.onLine && authUser.organizationName && !authUser.isAnonymous) {
            const orgId = slugifyOrg(authUser.organizationName);
            
            // ENSURE PROFILE EXISTS (Auto-creation/Correction)
            await supabase.from('user_profiles').upsert({
                id: authUser.id,
                email: session.user.email,
                staffId: authUser.staffId,
                name: authUser.name,
                role: authUser.role,
                isAdmin: authUser.isAdmin,
                organizationName: orgId,
                department: authUser.department
            });

            const sync = HybridSyncEngine.getInstance();
            await sync.pullRemoteChanges(orgId);
            await sync.pushLocalChanges();
          }
        } else if (navigator.onLine) {
          // No session exists; gracefully resolve to prompt login
          setState(s => ({ ...s, isLoading: false }));
        } else {
          setState(s => ({ ...s, isLoading: false }));
        }
      } catch (err) {
        console.error('[AuthContext] Restore session error:', err);
        // Clear session if it's invalid to prevent infinite refresh loops
        const db = await getDB();
        await db.delete('auth_sessions', 'current-session');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      } finally {
        setIsPreflightComplete(true);
      }
    };
    restoreSession();
  }, []);

  const login = async (staffId: string, pin: string, organizationName?: string) => {
    try {
      const email = getEmailFromStaffId(staffId);
      
      if (!navigator.onLine) {
        // Handle strictly offline login against IndexedDB sessions if cached
        // In a true hybrid, you might hash and locally store pins, but for this migration
        // we assume login requires internet for the *first* time, or relies on existing session.
        const db = await getDB();
        const localSession = await db.get('auth_sessions', 'current-session');
        if (localSession && localSession.sessionData.user.email === email && localSession.expiresAt > Date.now()) {
          const meta = localSession.sessionData.user.user_metadata || {};
          const authUser: AuthUser = {
            id: localSession.userId,
            staffId: meta.staffId,
            name: meta.name,
            role: meta.role,
            isAdmin: meta.isAdmin,
            organizationName: meta.organizationName,
            department: meta.department,
            defaultCurrency: meta.defaultCurrency
          };
          setState({ user: authUser, isAuthenticated: true, isLoading: false });
          return { success: true };
        }
        return { success: false, error: 'You must be online to log in for the first time.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin });

      if (error || !data?.session) {
        return { success: false, error: error?.message || 'Invalid credentials' };
      }

      let profileData = null;
      if (navigator.onLine) {
        // Safe select to avoid 406 if RLS blocks or missing
        const { data: profiles } = await supabase.from('user_profiles').select('*').eq('id', data.user.id).limit(1);
        profileData = profiles && profiles.length > 0 ? profiles[0] : null;
      }

      const meta = data.user.user_metadata || {};
      const authUser: AuthUser = {
        id: data.user.id,
        staffId: profileData?.staffId || meta.staffId || staffId,
        name: profileData?.name || meta.name || 'User',
        role: profileData?.role || meta.role || 'user',
        isAdmin: profileData?.isAdmin ?? (meta.isAdmin === true),
        organizationName: profileData?.organizationName || meta.organizationName || 'Default Org',
        department: profileData?.department || meta.department || 'General',
        defaultCurrency: profileData?.defaultCurrency || meta.defaultCurrency
      };

      setState({ user: authUser, isAuthenticated: true, isLoading: false });

      // Initial Pull
      const orgId = slugifyOrg(authUser.organizationName);
      const sync = HybridSyncEngine.getInstance();
      await sync.pullRemoteChanges(orgId);

      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    const db = await getDB();
    await db.delete('auth_sessions', 'current-session');
    if (navigator.onLine) {
      await supabase.auth.signOut();
    }
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const register = async (
    name: string,
    staffId: string,
    password: string,
    role: string,
    organizationName: string = "green-land-power-inc",
    department: string = "General",
    securityQuestion?: string,
    securityAnswer?: string
  ) => {
    if (!navigator.onLine) {
      return { success: false, error: 'You must be online to register users.' };
    }
    
    const email = getEmailFromStaffId(staffId);
    
    // Try service role client first (bypasses rate limits)
    const serviceRoleClient = getServiceRoleClient();
    if (serviceRoleClient && role === 'admin') {
      try {
        const { data: adminData, error: adminError } = await serviceRoleClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            staffId,
            name,
            role,
            isAdmin: role === 'admin',
            organizationName,
            department,
            securityQuestion,
            securityAnswer
          }
        });

        if (!adminError && adminData?.user) {
          // Create user profile
          await serviceRoleClient.from('user_profiles').insert({
            id: adminData.user.id,
            staffId,
            name,
            role,
            isAdmin: role === 'admin',
            organizationName,
            department,
            defaultCurrency: 'USD'
          });

          // Add to local DB
          await userDB.addUser({
            username: email,
            name,
            passwordHash: 'managed-by-supabase',
            role: role as any,
            isAdmin: role === 'admin',
            organizationName,
            department,
            staffId,
            securityQuestion,
          });

          // Log in with regular client
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (!loginError && loginData?.session) {
            let profileData = null;
            const { data: profiles } = await supabase.from('user_profiles').select('*').eq('id', loginData.user.id).limit(1);
            profileData = profiles && profiles.length > 0 ? profiles[0] : null;

            const meta = loginData.user.user_metadata || {};
            const authUser: AuthUser = {
              id: loginData.user.id,
              staffId: profileData?.staffId || meta.staffId || staffId,
              name: profileData?.name || meta.name || 'User',
              role: profileData?.role || meta.role || 'user',
              isAdmin: profileData?.isAdmin ?? (meta.isAdmin === true),
              organizationName: profileData?.organizationName || meta.organizationName || 'Default Org',
              department: profileData?.department || meta.department || 'General',
              defaultCurrency: profileData?.defaultCurrency || meta.defaultCurrency
            };

            setState({ user: authUser, isAuthenticated: true, isLoading: false });
            return { success: true };
          }
        }
      } catch (err) {
        console.error('Service role registration failed, falling back to regular auth:', err);
      }
    }
    
    // Fallback to regular auth (with rate limit handling)
    const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (!checkError && existingUser?.session) {
      // User already exists, just log them in
      await supabase.auth.signOut(); // Sign out from the check
      
      let profileData = null;
      const { data: profiles } = await supabase.from('user_profiles').select('*').eq('id', existingUser.user.id).limit(1);
      profileData = profiles && profiles.length > 0 ? profiles[0] : null;

      const meta = existingUser.user.user_metadata || {};
      const authUser: AuthUser = {
        id: existingUser.user.id,
        staffId: profileData?.staffId || meta.staffId || staffId,
        name: profileData?.name || meta.name || 'User',
        role: profileData?.role || meta.role || 'user',
        isAdmin: profileData?.isAdmin ?? (meta.isAdmin === true),
        organizationName: profileData?.organizationName || meta.organizationName || 'Default Org',
        department: profileData?.department || meta.department || 'General',
        defaultCurrency: profileData?.defaultCurrency || meta.defaultCurrency
      };

      setState({ user: authUser, isAuthenticated: true, isLoading: false });
      
      // Also ensure user is in local DB
      await userDB.addUser({
        username: email,
        name,
        passwordHash: 'managed-by-supabase',
        role: role as any,
        isAdmin: role === 'admin',
        organizationName,
        department,
        staffId,
        securityQuestion,
      });

      return { success: true };
    }
    
    // User doesn't exist, create new one
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          staffId,
          name,
          role,
          isAdmin: role === 'admin',
          organizationName,
          department,
          securityQuestion,
          securityAnswer
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    // Also push user to local userDB
    await userDB.addUser({
      username: email,
      name,
      passwordHash: 'managed-by-supabase',
      role: role as any,
      isAdmin: role === 'admin',
      organizationName,
      department,
      staffId,
      securityQuestion,
    });

    // PUSH DIRECTLY TO SUPABASE USER PROFILES
    if (navigator.onLine && data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        email,
        staffId,
        name,
        role,
        isAdmin: role === 'admin',
        organizationName: slugifyOrg(organizationName),
        department
      });
    }
    
    return { success: true };
  };

  // The following functions are updated for the Supabase hybrid approach
  const getUsers = async () => {
    const db = await getDB();
    const currentOrg = state.user?.organizationName ? slugifyOrg(state.user.organizationName) : null;

    if (navigator.onLine && currentOrg) {
      // Re-fetch profiles for this organization
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organizationName', currentOrg);
        
      if (!error && data) {
         for (const profile of data) {
            // Also save to indexedDB directly to keep it warm
            await db.put('user_profiles', profile);
         }
      }
    }

    // Read from IndexedDB (Offline-First)
    const profiles = await db.getAll('user_profiles');
    
    // Return filtered results for current organization
    return profiles.filter(p => {
        const org = p.organizationName || p.orgId; // Support both naming conventions
        return org && slugifyOrg(org) === currentOrg;
    });
  };

  const deleteUser = async (userId: string) => { 
    await userDB.deleteUser(userId);
    if (navigator.onLine) {
       await supabase.from('user_profiles').delete().eq('id', userId);
    }
    return { success: true }; 
  };
  
  const removeInitialAdmin = async () => {
    try {
      // Clear all users from IndexedDB
      await userDB.clearAllUsers();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.clear();
      
      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] Reset error:', err);
      return { success: false, error: err.message || 'Reset failed' };
    }
  };
  
  const getSecurityQuestion = async (staffId: string, orgName?: string) => { 
    const finalOrg = orgName ? slugifyOrg(orgName) : slugifyOrg("Green Land Power Inc");
    const u = await userDB.getUserByStaffAndOrg(staffId, finalOrg);
    return u?.securityQuestion || null;
  };

  const verifySecurityAnswer = async (staffId: string, answer: string, orgName?: string) => { 
    const finalOrg = orgName ? slugifyOrg(orgName) : slugifyOrg("Green Land Power Inc");
    const u = await userDB.getUserByStaffAndOrg(staffId, finalOrg);
    if (!u) return { success: false, error: 'User not found' };
    
    if (u.securityAnswerHash) {
      const isValid = await securityService.comparePassword(answer.toLowerCase(), u.securityAnswerHash);
      if (isValid) return { success: true };
    }
    return { success: false, error: 'Incorrect answer' };
  };
  const verifyAdminPassword = async (password: string) => { return { success: true }; };
  const changePassword = async (password: string) => {
    try {
      if (!state.user) {
        return { success: false, error: 'No user logged in' };
      }

      if (!navigator.onLine) {
        return { success: false, error: 'You must be online to change password' };
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local userDB
      await userDB.updateUser(state.user.id, { passwordHash: 'managed-by-supabase' });

      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] Change password error:', err);
      return { success: false, error: err.message || 'Password change failed' };
    }
  };
  
  const updateUserRole = async (userId: string, role: string) => { 
    await userDB.updateUser(userId, { role: role as any, isAdmin: role === 'admin' });
    if (navigator.onLine) {
       await supabase.from('user_profiles').update({ role: role, isAdmin: role === 'admin' }).eq('id', userId);
    }
    return { success: true }; 
  };
  
  const checkLockoutStatus = async (staffId: string) => ({
    locked: securityService.isLockedOut(staffId),
    remaining: securityService.getLockoutTimeRemaining(staffId) * 1000,
    attemptsRemaining: securityService.getRemainingAttempts(staffId)
  });

  const triggerSync = useCallback(async () => {
    if (!state.user || !navigator.onLine) return;
    try {
      setIsCloudSyncing(true);
      setCloudSyncError(null);
      const orgId = state.user.organizationName;
      const sync = HybridSyncEngine.getInstance();
      await sync.pushLocalChanges();
      await sync.pullRemoteChanges(orgId);
      setIsCloudSyncing(false);
    } catch (error) {
      setIsCloudSyncing(false);
      setCloudSyncError('Sync failed');
    }
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    getUsers,
    deleteUser,
    removeInitialAdmin,
    getSecurityQuestion,
    verifySecurityAnswer,
    verifyAdminPassword,
    changePassword,
    updateUserRole,
    checkLockoutStatus,
    isCloudSyncing,
    cloudSyncError,
    triggerSync,
    isOnline,
  };

  // Pre-flight Guard logic:
  // We hold rendering the app components until the instantaneous IndexedDB check is complete.
  // This allows optimistic rendering of the dashboard preventing flicker!
  if (!isPreflightComplete) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full animate-pulse z-0" />
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin z-10" />
        </div>
        <p className="text-sm font-bold text-blue-400 mt-4 animate-pulse">Initializing Interface...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
