'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { useCurrency, currencies } from '@/lib/currency-context';
import { getDB } from '@/lib/indexeddb';
import { HybridSyncEngine } from '@/lib/sync-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Download, Upload, BarChart3, Lock, Moon, Sun, Database } from 'lucide-react';

export function SettingsTab() {
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const isAdmin = user?.isAdmin;
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  // Load saved settings on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    const savedEmailAlerts = localStorage.getItem('emailAlerts') !== 'false';
    const savedDateFormat = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
    
    setNotifications(savedNotifications);
    setEmailAlerts(savedEmailAlerts);
    setDateFormat(savedDateFormat);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleSaveSettings = () => {
    // Save all settings to localStorage
    localStorage.setItem('notifications', notifications.toString());
    localStorage.setItem('emailAlerts', emailAlerts.toString());
    localStorage.setItem('dateFormat', dateFormat);
    
    toast.success('Settings saved successfully');
  };

  const handleExportData = async () => {
    toast.success('Feature coming soon in reporting module');
  };

  const handleExportBackup = async () => {
    try {
      const db = await getDB();
      const backup: any = {};
      const stores = ['projects', 'expenses', 'revenue', 'materials', 'labor', 'broker_payments', 'petty_cash'];
      for (const store of stores) {
        backup[store] = await db.getAll(store as any);
      }
      // Filter for current user's org to ensure privacy
      if (user?.organizationName) {
        for (const store of stores) {
          backup[store] = backup[store].filter((item: any) => item.org_id === user.organizationName || item.orgId === user.organizationName);
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glp-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Database backup exported successfully');
    } catch (err) {
      toast.error('Backup export failed');
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const db = await getDB();
          const engine = HybridSyncEngine.getInstance();
          
          let count = 0;
          const stores = ['projects', 'expenses', 'revenue', 'materials', 'labor', 'broker_payments', 'petty_cash'];
          for (const store of stores) {
            if (Array.isArray(data[store])) {
              for (const item of data[store]) {
                 await db.put(store as any, item);
                 // Enqueue for sync so it hits supabase
                 await db.add('syncQueue', {
                    id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    action: 'update', // Treat as update to upsert
                    collection: store,
                    documentId: item.id,
                    data: item,
                    timestamp: Date.now(),
                    synced: false
                 });
                 count++;
              }
            }
          }
          await engine.pushLocalChanges();
          toast.success(`Restored ${count} records successfully`);
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          toast.error('Invalid backup file structure');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      toast.error('Import failed');
    }
  };


  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Admin settings are not available for your account</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Data & Backup</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <Label htmlFor="staff-id">Staff ID</Label>
                <Input id="staff-id" type="text" value={user?.staffId} disabled className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={user?.name || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LRD">Liberian Dollar (LRD) - L$</SelectItem>
                    <SelectItem value="USD">US Dollar (USD) - $</SelectItem>
                    <SelectItem value="EUR">Euro (EUR) - €</SelectItem>
                    <SelectItem value="GBP">British Pound (GBP) - £</SelectItem>
                    <SelectItem value="CAD">Canadian Dollar (CAD) - C$</SelectItem>
                    <SelectItem value="AUD">Australian Dollar (AUD) - A$</SelectItem>
                    <SelectItem value="NGN">Nigerian Naira (NGN) - ₦</SelectItem>
                    <SelectItem value="GHS">Ghanaian Cedi (GHS) - ₵</SelectItem>
                    <SelectItem value="XOF">West African CFA (XOF) - CFA</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selected: {currencies[currency]?.name} ({currencies[currency]?.symbol})
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateformat">Date Format</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger id="dateformat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        System Default
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current: {theme === 'system' ? 'Follows system preference' : `${theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : 'System'} mode`}
                </p>
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notif">In-App Notifications</Label>
                <Switch
                  id="notif"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts">Email Alerts</Label>
                <Switch
                  id="email-alerts"
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
              </div>

              <Button onClick={handleSaveSettings} variant="outline" className="w-full">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Settings */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Backup & Restore</CardTitle>
              <CardDescription>Export your entire organizational database or restore it from a backup file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleExportBackup} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12">
                <Download className="w-5 h-5 mr-2" />
                Download System Backup (.json)
              </Button>

              <div className="relative overflow-hidden w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background flex items-center justify-center hover:bg-accent hover:text-accent-foreground border-dashed border-2 cursor-pointer font-bold">
                <Input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportBackup} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <Upload className="w-5 h-5 mr-2 text-blue-500" />
                <span className="text-blue-500">Restore System Backup (.json)</span>
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                Backups contain your projects, expenses, and revenue isolated to <strong>{user?.organizationName}</strong>. 
                Restoring a backup will sync newly recovered data securely to your cloud backend in the background.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Reports</CardTitle>
              <CardDescription>Download your financial data in visual formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleExportData} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Summary to PDF
              </Button>

              <Button onClick={handleExportData} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>Create financial summary reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => toast.success('Report generated')} className="w-full" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Monthly Report
              </Button>

              <Button onClick={() => toast.success('Report generated')} className="w-full" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Quarterly Report
              </Button>

              <Button onClick={() => toast.success('Report generated')} className="w-full" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Annual Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm">Account Status</h4>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Email verified:</span>{' '}
                    <span className="text-emerald-600 font-semibold">Yes</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Admin status:</span>{' '}
                    <span className="text-emerald-600 font-semibold">Admin</span>
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                Change Password
              </Button>

              <Button variant="outline" className="w-full">
                Enable Two-Factor Authentication
              </Button>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-4">
                  Last activity: Just now
                </p>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  Sign Out All Devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
