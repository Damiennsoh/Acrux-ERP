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
import { Zap } from 'lucide-react';

import { DevelopmentToolsTab } from '@/components/dashboard/tabs/development-tools-tab';
import { BrokerTab } from '@/components/dashboard/tabs/broker-tab';
import { MiscellaneousTab } from '@/components/dashboard/tabs/miscellaneous-tab';
import { AuditLogTab } from '@/components/dashboard/tabs/audit-log-tab';

// Wrapper to handle useSearchParams safely
function DashboardContent() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

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
        </div>
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
