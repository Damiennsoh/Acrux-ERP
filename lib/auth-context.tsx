'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import { HybridSyncEngine } from './sync-service';
import { getDB } from './indexeddb';
import { securityService } from './security-service';
import { userDB } from './user-db';
import { slugifyOrg } from './utils/org';

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
  updateUserProfile: (userId: string, updates: { name?: string; staffId?: string; department?: string }) => Promise<{ success: boolean; error?: string }>;
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

// Helper to generate a dummy email for Supabase Auth (required by Supabase but not used)
// The actual authentication is based on staff ID + password stored in metadata
const getDummyEmail = (staffId: string) => {
  const clean = staffId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@dummy.local`;
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
      const email = getDummyEmail(staffId);
      
      if (!navigator.onLine) {
        // Handle strictly offline login against IndexedDB sessions if cached
        // In a true hybrid, you might hash and locally store pins, but for this migration
        // we assume login requires internet for the *first* time, or relies on existing session.
        const db = await getDB();
        const localSession = await db.get('auth_sessions', 'current-session');
        if (localSession && localSession.expiresAt > Date.now()) {
          const meta = localSession.sessionData.user.user_metadata || {};
          // Check by staff ID instead of email
          if (meta.staffId === staffId) {
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
        
        // Store profile locally for getUsers to work immediately
        if (profileData) {
          const db = await getDB();
          await db.put('user_profiles', profileData);
        }
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
    
    const email = getDummyEmail(staffId);
    
    // For admin creation, use server API route (bypasses rate limits)
    if (role === 'admin') {
      try {
        const response = await fetch('/api/create-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            staffId,
            password,
            name,
            organizationName,
            department
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to create admin' };
        }

        // Add to local DB (use staff ID as username)
        await userDB.addUser({
          username: staffId,
          name,
          passwordHash: 'managed-by-supabase',
          role: role as any,
          isAdmin: role === 'admin',
          organizationName,
          department,
          staffId,
          securityQuestion,
        });

        // Also add to user_profiles IndexedDB store for getUsers to work
        const db = await getDB();
        await db.put('user_profiles', {
          id: data.user.id,
          staffId,
          name,
          role,
          isAdmin: role === 'admin',
          organizationName: slugifyOrg(organizationName),
          department,
          defaultCurrency: 'USD'
        } as any);

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
        } else {
          return { success: false, error: loginError?.message || 'Login failed after admin creation' };
        }
      } catch (err) {
        console.error('API admin creation failed:', err);
        return { success: false, error: 'Failed to create admin via API' };
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
      
      // Also ensure user is in local DB (use staff ID as username)
      await userDB.addUser({
        username: staffId,
        name,
        passwordHash: 'managed-by-supabase',
        role: role as any,
        isAdmin: role === 'admin',
        organizationName,
        department,
        staffId,
        securityQuestion,
      });

      // Also add to user_profiles IndexedDB store for getUsers to work
      const db = await getDB();
      await db.put('user_profiles', {
        id: existingUser.user.id,
        staffId,
        name,
        role,
        isAdmin: role === 'admin',
        organizationName: slugifyOrg(organizationName),
        department,
        defaultCurrency: 'USD'
      } as any);

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
      // Handle rate limit specifically
      if (error.status === 429) {
        return { success: false, error: 'Too many sign-up attempts. Please wait a few minutes.' };
      }
      return { success: false, error: error.message };
    }
    
    // Also push user to local userDB (use staff ID as username)
    await userDB.addUser({
      username: staffId,
      name,
      passwordHash: 'managed-by-supabase',
      role: role as any,
      isAdmin: role === 'admin',
      organizationName,
      department,
      staffId,
      securityQuestion,
    });

    // Also add to user_profiles IndexedDB store for getUsers to work
    if (data.user) {
      const db = await getDB();
      await db.put('user_profiles', {
        id: data.user.id,
        staffId,
        name,
        role,
        isAdmin: role === 'admin',
        organizationName: slugifyOrg(organizationName),
        department,
        defaultCurrency: 'USD'
      } as any);
    }

    // PUSH DIRECTLY TO SUPABASE USER PROFILES (remove email field)
    if (navigator.onLine && data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
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

  const updateUserProfile = async (userId: string, updates: { name?: string; staffId?: string; department?: string }) => {
    try {
      const db = await getDB();
      
      // Update in IndexedDB user_profiles
      const existingProfile = await db.get('user_profiles', userId);
      if (existingProfile) {
        const updatedProfile = { ...existingProfile, ...updates };
        await db.put('user_profiles', updatedProfile);
      }

      // Update in IndexedDB users store
      const existingUser = await userDB.getUserById(userId);
      if (existingUser) {
        await userDB.updateUser(userId, updates);
      }

      // Update in Supabase if online
      if (navigator.onLine) {
        const { error } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', userId);
        
        if (error) {
          console.error('[AuthContext] Supabase update error:', error);
          // Don't fail the operation if Supabase update fails - will sync later
        }
      }

      // Update current user state if updating self
      if (state.user?.id === userId) {
        setState(prev => ({
          ...prev,
          user: prev.user ? { ...prev.user, ...updates } : null
        }));
      }

      return { success: true };
    } catch (err: any) {
      console.error('[AuthContext] Update user profile error:', err);
      return { success: false, error: err.message || 'Failed to update user profile' };
    }
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
      
      // Check for sync errors
      const errors = sync.getSyncErrors();
      if (errors.length > 0) {
        setCloudSyncError(errors.join('; '));
        sync.clearSyncErrors();
      }
      
      setIsCloudSyncing(false);
    } catch (error) {
      setIsCloudSyncing(false);
      setCloudSyncError((error as any).message || 'Sync failed');
    }
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    getUsers,
    deleteUser,
    updateUserProfile,
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
