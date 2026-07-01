'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Bell, X, Calendar, Clock, Monitor } from 'lucide-react';
import Link from 'next/link';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/Sidebar';
import type { Employee } from '@/types';

interface DashboardShellProps {
  employee: Employee;
  children: React.ReactNode;
}

interface NotificationItem {
  id: string;
  type: 'leave' | 'compoff' | 'equipment';
  employeeName: string;
  summary: string;
  href: string;
  created_at: string;
}

const TYPE_CONFIG = {
  leave:     { label: 'Leave',     color: '#3b82f6', Icon: Calendar },
  compoff:   { label: 'Comp-Off',  color: '#8b5cf6', Icon: Clock    },
  equipment: { label: 'Equipment', color: '#10b981', Icon: Monitor  },
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return (
    <button className="flex items-center justify-center rounded-lg p-2 border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)', opacity: 0 }}>
      <Moon className="size-4" />
    </button>
  );

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center rounded-lg p-2 transition-all border"
      style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#c8985e'; (e.currentTarget as HTMLElement).style.color = '#c8985e'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

const NOTIF_KEY = 'hr_notif_last_seen';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotifBellProps {
  employee: Employee;
  onUnreadChange: (count: number) => void;
}

function NotificationBell({ employee, onUnreadChange }: NotifBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const isPrivileged = ['admin', 'hr', 'it', 'manager'].includes(employee.role);

  // Fetch all notifications on mount
  useEffect(() => {
    if (!isPrivileged) return;
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        const notifs: NotificationItem[] = data.notifications ?? [];
        setNotifications(notifs);
        const lastSeen = localStorage.getItem(NOTIF_KEY);
        const count = !lastSeen
          ? notifs.length
          : notifs.filter(n => new Date(n.created_at) > new Date(lastSeen)).length;
        setUnreadCount(count);
        onUnreadChange(count);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivileged]);

  // When user navigates to a relevant page, clear both badges
  useEffect(() => {
    const clearPages = ['/dashboard/leave', '/dashboard/equipment'];
    if (clearPages.includes(pathname) && isPrivileged) {
      localStorage.setItem(NOTIF_KEY, new Date().toISOString());
      setUnreadCount(0);
      onUnreadChange(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      localStorage.setItem(NOTIF_KEY, new Date().toISOString());
      setUnreadCount(0);
      onUnreadChange(0);
    }
  };

  if (!isPrivileged) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center justify-center rounded-lg p-2 transition-all border"
        style={{
          borderColor: isOpen ? '#c8985e' : 'var(--border)',
          color: isOpen ? '#c8985e' : 'var(--muted-foreground)',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!isOpen) { (e.currentTarget as HTMLElement).style.borderColor = '#c8985e'; (e.currentTarget as HTMLElement).style.color = '#c8985e'; } }}
        onMouseLeave={e => { if (!isOpen) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; } }}
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#dc2626', color: '#fff',
            fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1, pointerEvents: 'none',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 320, maxWidth: 'calc(100vw - 24px)',
            maxHeight: 440,
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            zIndex: 50,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--foreground)' }}>
              Notifications
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {notifications.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  {notifications.length} pending
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)', lineHeight: 1 }}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <Bell className="size-8 mx-auto mb-3" style={{ opacity: 0.25 }} />
                <p style={{ fontSize: '0.875rem' }}>All caught up — no pending requests</p>
              </div>
            ) : (
              notifications.map(n => {
                const initials = n.employeeName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                const cfg = TYPE_CONFIG[n.type];
                const TypeIcon = cfg.Icon;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setIsOpen(false)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,152,94,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #c8985e, #e0be8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f1a2e', fontWeight: 700, fontSize: '0.75rem' }}>
                        {initials}
                      </div>
                      {/* Type indicator dot */}
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--background)' }}>
                        <TypeIcon style={{ width: 7, height: 7, color: '#fff' }} />
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.employeeName}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.summary}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: cfg.color, background: `${cfg.color}18`, borderRadius: 4, padding: '1px 6px' }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ display: 'flex', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <Link
                href="/dashboard/leave"
                onClick={() => setIsOpen(false)}
                style={{ flex: 1, display: 'block', padding: '11px 16px', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#3b82f6', textDecoration: 'none', borderRight: employee.role !== 'manager' ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Leave & Comp-Off
              </Link>
              {employee.role !== 'manager' && (
                <Link
                  href="/dashboard/equipment"
                  onClick={() => setIsOpen(false)}
                  style={{ flex: 1, display: 'block', padding: '11px 16px', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#10b981', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Equipment
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardShell({ employee, children }: DashboardShellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <SidebarProvider>
      <AppSidebar employee={employee} pendingCount={unreadCount} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <NotificationBell employee={employee} onUnreadChange={setUnreadCount} />
          <ThemeToggle />
        </header>
        <div className="dashboard-content flex-1 p-3 sm:p-6 min-h-[calc(100vh-3rem)]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
