'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FolderKanban,
  Hammer,
  UsersRound,
  Briefcase,
  Wallet,
  TrendingUp,
  LineChart,
  LogOut,
  Settings,
  Users,
  Shield,
  Zap,
  Wifi,
  WifiOff,
  History as AuditHistory,
} from 'lucide-react';
import { toast } from 'sonner';

/** Shared style constants */
const FONT_FAMILY = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";
const FONT_HEADING = "'Outfit', 'Inter', 'Segoe UI', sans-serif";

const SIDEBAR_BG = 'linear-gradient(180deg, #1e3a8a 0%, #2563eb 40%, #3b82f6 100%)';
const WHITE = '#ffffff';
const WHITE_78 = 'rgba(255,255,255,0.78)';
const WHITE_55 = 'rgba(255,255,255,0.55)';
const WHITE_18 = 'rgba(255,255,255,0.18)';
const WHITE_12 = 'rgba(255,255,255,0.12)';
const WHITE_10 = 'rgba(255,255,255,0.10)';
const WHITE_08 = 'rgba(255,255,255,0.08)';
const BLUE_LIGHT = 'rgba(147, 197, 253, 0.9)';
const BLUE_LIGHT_70 = 'rgba(147, 197, 253, 0.7)';
const BLUE_BADGE = '#60a5fa';

interface SidebarProps {
  user: any;
}

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { logout } = useAuth();
  const isAdmin = user?.isAdmin;
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
      router.replace('/auth');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '260px',
        minWidth: '260px',
        background: SIDEBAR_BG,
        borderRight: `1px solid ${WHITE_08}`,
        boxShadow: '2px 0 24px rgba(0,0,0,0.18)',
        fontFamily: FONT_FAMILY,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          padding: '1.25rem 1.25rem',
          borderBottom: `1px solid ${WHITE_12}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.625rem',
              background: WHITE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              flexShrink: 0,
              overflow: 'hidden',
              padding: '2px',
            }}
          >
            <img src="/Acrux-LOGO.jpg" alt="ACRUX Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '0.4rem' }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: FONT_HEADING,
                fontWeight: 800,
                fontSize: '1.05rem',
                color: WHITE,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              ACRUX ERP
            </h2>
            <p
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: 500,
                fontSize: '0.7rem',
                color: BLUE_LIGHT,
                letterSpacing: '0.02em',
                marginTop: '2px',
                margin: 0,
              }}
            >
              ACRUX IT SOLUTIONS
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '0.75rem 0.75rem',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <NavLink href="/dashboard?tab=dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" isActive={activeTab === 'dashboard'} />
        <NavLink href="/dashboard?tab=projects" icon={<FolderKanban className="w-4 h-4" />} label="Project Info" isActive={activeTab === 'projects'} />

        <SectionLabel text="Costs" />
        <NavLink href="/dashboard?tab=development-tools" icon={<Hammer className="w-4 h-4" />} label="Development Tools" isActive={activeTab === 'development-tools'} />
        <NavLink href="/dashboard?tab=development-costs" icon={<UsersRound className="w-4 h-4" />} label="Development Costs" isActive={activeTab === 'development-costs'} />
        <NavLink href="/dashboard?tab=broker" icon={<Briefcase className="w-4 h-4" />} label="Broker Payments" isActive={activeTab === 'broker'} />
        <NavLink href="/dashboard?tab=miscellaneous" icon={<Wallet className="w-4 h-4" />} label="Miscellaneous" isActive={activeTab === 'miscellaneous'} />

        <SectionLabel text="Income & Reports" />
        <NavLink href="/dashboard?tab=revenue" icon={<TrendingUp className="w-4 h-4" />} label="Revenue" isActive={activeTab === 'revenue'} />
        <NavLink href="/dashboard?tab=summary" icon={<LineChart className="w-4 h-4" />} label="Summary" isActive={activeTab === 'summary'} />

        {isAdmin && (
          <>
            <SectionLabel text="Administration" />
            <NavLink href="/dashboard/users" icon={<Users className="w-4 h-4" />} label="User Management" isActive={false} />
            <NavLink href="/dashboard?tab=audit" icon={<AuditHistory className="w-4 h-4" />} label="Audit Logs" isActive={activeTab === 'audit'} />
            <NavLink href="/dashboard?tab=settings" icon={<Settings className="w-4 h-4" />} label="Settings" isActive={activeTab === 'settings'} />
          </>
        )}
      </nav>

      {/* Footer: Status + User + Logout */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: `1px solid ${WHITE_12}`,
          background: 'rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        {/* Online/Offline badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontFamily: FONT_FAMILY,
            fontSize: '0.7rem',
            fontWeight: 600,
            color: BLUE_LIGHT,
            padding: '0.25rem 0.6rem',
            borderRadius: '999px',
            background: WHITE_08,
          }}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              marginLeft: 'auto',
              background: isOnline ? '#4ade80' : '#fbbf24',
              boxShadow: isOnline ? '0 0 6px #4ade80' : '0 0 4px #fbbf24',
            }}
          />
        </div>

        {/* User info */}
        <div>
          <p style={{ fontFamily: FONT_FAMILY, fontSize: '0.85rem', fontWeight: 700, color: WHITE, margin: 0 }}>
            {user?.name}
          </p>
          <p style={{ fontFamily: FONT_FAMILY, fontSize: '0.72rem', fontWeight: 500, color: BLUE_LIGHT_70, margin: 0 }}>
            {user?.staffId}
          </p>
          {isAdmin && (
            <p
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: '0.68rem',
                fontWeight: 700,
                color: BLUE_BADGE,
                marginTop: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Shield className="w-3 h-3" /> Administrator Access
            </p>
          )}
        </div>

        {/* Logout button */}
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
            border: `1px solid rgba(255,255,255,0.25)`,
            background: 'transparent',
            color: WHITE,
            fontFamily: FONT_FAMILY,
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = WHITE_10;
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          }}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '1rem 0.75rem 0.35rem 0.75rem',
        fontFamily: FONT_FAMILY,
        fontSize: '0.6rem',
        fontWeight: 700,
        color: WHITE_55,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      {text}
    </div>
  );
}

/* ─── Nav Link ─── */
interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavLink({ href, icon, label, isActive }: NavLinkProps) {
  const [hovered, setHovered] = React.useState(false);

  const bgColor = isActive ? WHITE_18 : hovered ? WHITE_10 : 'transparent';
  const textColor = isActive || hovered ? WHITE : WHITE_78;

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.55rem 0.75rem',
          borderRadius: '0.5rem',
          fontFamily: FONT_FAMILY,
          fontSize: '0.85rem',
          fontWeight: isActive ? 600 : 500,
          color: textColor,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          background: bgColor,
          boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}
