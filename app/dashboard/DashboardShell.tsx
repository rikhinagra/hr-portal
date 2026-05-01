'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/Sidebar';
import type { Employee } from '@/types';

interface DashboardShellProps {
  employee: Employee;
  children: React.ReactNode;
}

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

export default function DashboardShell({ employee, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar employee={employee} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <div className="dashboard-content flex-1 p-3 sm:p-6 min-h-[calc(100vh-3rem)]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
