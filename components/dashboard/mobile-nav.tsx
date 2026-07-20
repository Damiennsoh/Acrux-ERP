'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  LogOut,
  Settings,
  Users,
  Shield,
  Zap,
  LayoutDashboard,
  FolderKanban,
  Hammer,
  UsersRound,
  Briefcase,
  Wallet,
  TrendingUp,
  LineChart,
  Wifi,
  WifiOff,
  History as AuditHistory,
} from 'lucide-react';
import { toast } from 'sonner';

const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
const WHITE = '#ffffff';
const WHITE_78 = 'rgba(255,255,255,0.78)';
const WHITE_55 = 'rgba(255,255,255,0.55)';
const WHITE_18 = 'rgba(255,255,255,0.18)';
const WHITE_10 = 'rgba(255,255,255,0.10)';
const WHITE_08 = 'rgba(255,255,255,0.08)';
const BLUE_LIGHT = 'rgba(147,197,253,0.9)';
const BLUE_LIGHT_70 = 'rgba(147,197,253,0.7)';

interface MobileNavProps {
  user: any;
}

export function MobileNav({ user }: MobileNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { logout } = useAuth();
  const isAdmin = user?.isAdmin;
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setOpen(false);
      router.replace('/auth');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleNav = (tab: string) => {
    setOpen(false);
    if (tab === 'users') {
      router.push('/dashboard/users');
    } else {
      router.push(`/dashboard?tab=${tab}`);
    }
  };

  const NavItem = ({ tab, icon, label }: { tab: string; icon: React.ReactNode; label: string }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => handleNav(tab)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.55rem 0.75rem',
          borderRadius: '0.5rem',
          fontFamily: FONT,
          fontSize: '0.85rem',
          fontWeight: isActive ? 600 : 500,
          color: isActive ? WHITE : WHITE_78,
          cursor: 'pointer',
          background: isActive ? WHITE_18 : 'transparent',
          border: 'none',
          textAlign: 'left',
        }}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div
      className="sm:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#1e3a8a',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem', padding: '0 1rem' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 700, color: WHITE, margin: 0 }}>{user?.name}</p>
          <span style={{ color: BLUE_LIGHT, display: 'flex', alignItems: 'center' }}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10" style={{ color: WHITE }}>
              <Menu className="w-5 h-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-[300px] p-0 flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #1e3a8a 0%, #2563eb 40%, #3b82f6 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <SheetHeader style={{ borderBottom: `1px solid rgba(255,255,255,0.12)`, padding: '1rem' }}>
              <SheetTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: WHITE, fontFamily: FONT }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: WHITE_18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap className="w-5 h-5" style={{ color: WHITE }} />
                </div>
                ACRUX ERP
              </SheetTitle>
            </SheetHeader>

            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              {/* User card */}
              <div style={{ marginBottom: '1.25rem', background: WHITE_08, padding: '0.75rem', borderRadius: '0.5rem' }}>
                <p style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 700, color: WHITE, margin: 0 }}>{user?.name}</p>
                <p style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 500, color: BLUE_LIGHT_70, margin: 0 }}>{user?.staffId}</p>
                {isAdmin && (
                  <p style={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield className="w-3 h-3" /> Administrator
                  </p>
                )}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT, fontSize: '0.65rem', fontWeight: 600, color: BLUE_LIGHT_70 }}>
                  {isOnline ? <><Wifi className="w-3 h-3" /> Online</> : <><WifiOff className="w-3 h-3" /> Offline Mode</>}
                </div>
              </div>

              <NavItem tab="dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
              <NavItem tab="projects" icon={<FolderKanban className="w-4 h-4" />} label="Project Info" />

              <div style={{ padding: '0.75rem 0.5rem 0.3rem', fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: WHITE_55, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Costs</div>
              <NavItem tab="development-tools" icon={<Hammer className="w-4 h-4" />} label="Development Tools" />
              <NavItem tab="development-costs" icon={<UsersRound className="w-4 h-4" />} label="Development Costs" />
              <NavItem tab="broker" icon={<Briefcase className="w-4 h-4" />} label="Broker Payments" />
              <NavItem tab="miscellaneous" icon={<Wallet className="w-4 h-4" />} label="Miscellaneous" />

              <div style={{ padding: '0.75rem 0.5rem 0.3rem', fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: WHITE_55, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Income & Reports</div>
              <NavItem tab="revenue" icon={<TrendingUp className="w-4 h-4" />} label="Revenue" />
              <NavItem tab="summary" icon={<LineChart className="w-4 h-4" />} label="Summary" />

              {isAdmin && (
                <>
                  <div style={{ padding: '0.75rem 0.5rem 0.3rem', fontFamily: FONT, fontSize: '0.6rem', fontWeight: 700, color: WHITE_55, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Administration</div>
                  <NavItem tab="users" icon={<Users className="w-4 h-4" />} label="User Management" />
                  <NavItem tab="audit" icon={<AuditHistory className="w-4 h-4" />} label="Audit Logs" />
                  <NavItem tab="settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
                </>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '1rem', background: 'rgba(0,0,0,0.12)' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'transparent',
                  color: WHITE,
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
