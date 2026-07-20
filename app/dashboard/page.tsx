'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { SummaryTab } from '@/components/dashboard/tabs/summary-tab';
import { ProjectsTab } from '@/components/dashboard/tabs/projects-tab';
import { ExpensesTab } from '@/components/dashboard/tabs/expenses-tab';
import { RevenueTab } from '@/components/dashboard/tabs/revenue-tab';
import { SettingsTab } from '@/components/dashboard/tabs/settings-tab';
import { PWAInstall } from '@/components/pwa-install';
import { useAuth } from '@/lib/auth-context';
import { Zap, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { getDB } from '@/lib/indexeddb';

import { DevelopmentToolsTab } from '@/components/dashboard/tabs/development-tools-tab';
import { BrokerTab } from '@/components/dashboard/tabs/broker-tab';
import { MiscellaneousTab } from '@/components/dashboard/tabs/miscellaneous-tab';
import { AuditLogTab } from '@/components/dashboard/tabs/audit-log-tab';

// Wrapper to handle useSearchParams safely
function DashboardContent() {
  const { user, isCloudSyncing, cloudSyncError, triggerSync, isOnline } = useAuth();
  const isAdmin = user?.isAdmin;
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0);

  React.useEffect(() => {
    const checkPendingSync = async () => {
      try {
        const db = await getDB();
        const queue = await db.getAll('syncQueue');
        const pending = queue.filter(item => !item.synced);
        setPendingSyncCount(pending.length);
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };

    checkPendingSync();
    const interval = setInterval(checkPendingSync, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isCloudSyncing]);

  const handleManualSync = async () => {
    await triggerSync();
    // Re-check pending count after sync
    setTimeout(async () => {
      try {
        const db = await getDB();
        const queue = await db.getAll('syncQueue');
        const pending = queue.filter(item => !item.synced);
        setPendingSyncCount(pending.length);
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Top Header (only visible on mobile) */}
      <header className="sm:hidden sticky top-0 z-40 border-b border-blue-800 shadow-sm" style={{ background: 'linear-gradient(90deg, #1e3a8a, #2563eb)' }}>
        <div className="flex h-16 items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <img src="/Acrux-LOGO.png" alt="ACRUX Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>ACRUX ERP</h1>
              <p className="text-[10px] text-blue-200" style={{ fontFamily: "'Inter', sans-serif" }}>ACRUX IT SOLUTIONS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isCloudSyncing || !isOnline}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              title={isOnline ? "Sync now" : "Offline - sync unavailable"}
            >
              {isCloudSyncing ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : isOnline ? (
                <Cloud className="w-4 h-4 text-white" />
              ) : (
                <CloudOff className="w-4 h-4 text-white/50" />
              )}
            </button>
            {pendingSyncCount > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                {pendingSyncCount}
              </span>
            )}
          </div>
        </div>
        {cloudSyncError && (
          <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2">
            <p className="text-red-200 text-xs font-medium">Sync failed: {cloudSyncError}</p>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="p-4 sm:p-8 pb-24 sm:pb-8 max-w-7xl mx-auto">
        <Tabs value={activeTab} className="w-full">
          
          <TabsContent value="dashboard" className="space-y-4 m-0 border-none p-0 outline-none">
            {/* Will be replaced by new dashboard metrics tab */}
            <SummaryTab />
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 m-0 border-none p-0 outline-none">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="development-tools" className="space-y-4 m-0 border-none p-0 outline-none">
            <DevelopmentToolsTab />
          </TabsContent>
          
          <TabsContent value="broker" className="space-y-4 m-0 border-none p-0 outline-none">
            <BrokerTab />
          </TabsContent>
          
          <TabsContent value="miscellaneous" className="space-y-4 m-0 border-none p-0 outline-none">
            <MiscellaneousTab />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4 m-0 border-none p-0 outline-none">
            <RevenueTab />
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-4 m-0 border-none p-0 outline-none">
            {/* Temporary placeholder */}
            <SummaryTab />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="audit" className="space-y-4 m-0 border-none p-0 outline-none">
                <AuditLogTab />
              </TabsContent>
              <TabsContent value="settings" className="space-y-4 m-0 border-none p-0 outline-none">
                <SettingsTab />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <PWAInstall />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
