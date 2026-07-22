'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { LogIn, User, Zap, AlertTriangle, Wifi, WifiOff, Building, IdCard, HelpCircle, Key, Eye, EyeOff, Lock as LockIcon } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading, login, changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login'>('login');
  const [isOnline, setIsOnline] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkSetup = async () => {
      if (!navigator.onLine) return;
      
      // Check if ANY admin exists in Supabase
      const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('isAdmin', true)
        .limit(1);
        
      const hasAdmin = !!data?.length;
      setShowSetupGuide(!hasAdmin);
      setAdminExists(hasAdmin);
    };
    
    if (!isLoading) checkSetup();
  }, [isLoading]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const staffId = formData.get('staffId') as string;
      const organizationName = formData.get('organizationName') as string;
      const password = formData.get('password') as string;

      if (!staffId || !organizationName || !password) {
        throw new Error('Please fill in all fields');
      }

      const result = await login(staffId, password, organizationName);
      if (result.success) {
        toast.success('Welcome! Logged in successfully.');
        router.replace('/dashboard');
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeAdmin = async () => {
    setLoading(true);
    try {
      // 1. Check if admin already exists in Supabase
      let hasRemoteAdmin = false;
      if (navigator.onLine) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('isAdmin', true)
          .limit(1);
        hasRemoteAdmin = !!data?.length;
      }

      if (hasRemoteAdmin) {
        toast.info('Administrator already exists. Please sign in.');
        setShowSetupGuide(false);
        return;
      }

      // 2. Create superadmin via API (bypasses rate limits)
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: 'ACRUX-ADMIN-01',
          password: 'Admin@1234', // 8+ chars required by Supabase
          name: 'System Administrator',
          role: 'superadmin',
          organizationName: 'ACRUX IT SOLUTIONS',
          department: 'Management'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle duplicate email gracefully
        if (response.status === 400 && data.error?.includes('already been registered')) {
          toast.info('Admin account already exists. Signing you in...');
          await login('ACRUX-ADMIN-01', 'Admin@1234', 'ACRUX IT SOLUTIONS');
          router.replace('/dashboard');
          return;
        }
        throw new Error(data.error || 'Failed to create admin');
      }

      // 3. Auto-login after successful creation
      const loginResult = await login('ACRUX-ADMIN-01', 'Admin@1234', 'ACRUX IT SOLUTIONS');
      
      if (loginResult.success) {
        toast.success('System initialized! Welcome, Administrator.');
        setShowSetupGuide(false);
        router.replace('/dashboard');
      } else {
        throw new Error(loginResult.error || 'Login failed after setup');
      }
      
    } catch (error: any) {
      console.error('Initialization error:', error);
      toast.error(error.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Spinner className="w-12 h-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white mb-4 shadow-xl shadow-blue-500/10 overflow-hidden border border-slate-700/50 p-1">
            <img src="/Acrux-LOGO.png" alt="ACRUX Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-1">ACRUX ERP</h1>
          <p className="text-blue-500 font-bold text-base">Enterprise Resource Planning</p>
        </div>

        {!isOnline && (
          <Alert variant="destructive" className="mb-6 bg-red-950/50 border-red-900 text-red-200">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="font-bold">
              Offline mode: Local sign-in available.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-1 bg-slate-800/50 p-1 rounded-none border-b border-slate-800">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all font-bold">Login</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="p-6 space-y-6 m-0 outline-none">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Member Access</h2>
                <p className="text-slate-400 text-sm">Secure login to your organization</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white uppercase tracking-wider">Organization Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      name="organizationName"
                      defaultValue="ACRUX IT SOLUTIONS"
                      list="org-options"
                      required
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <datalist id="org-options">
                      <option value="ACRUX IT SOLUTIONS" />
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white uppercase tracking-wider">Staff ID</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      name="staffId"
                      placeholder="GLP123"
                      required
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      required
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? <Spinner className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {showSetupGuide && (
          <div className="mt-8 p-6 bg-blue-900/20 border border-blue-800 rounded-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg"><AlertTriangle className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-white font-bold">System Setup</h3>
                <p className="text-blue-200 text-xs">First administrator registration required.</p>
              </div>
            </div>
            <Button onClick={handleInitializeAdmin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-sm" disabled={loading || adminExists}>
              {adminExists ? 'Administrator Already Exists' : 'Create Administrator'}
            </Button>
            <p className="text-[10px] text-blue-300 text-center font-medium mt-2">Default S/N: ACRUX-ADMIN-01 | PASS: Admin@1234 (8+ chars required)</p>
          </div>
        )}
      </div>
    </div>
  );
}
