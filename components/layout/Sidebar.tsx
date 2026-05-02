'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, User, Calendar, BookOpen, FileText,
  Monitor, Rocket, Users, LogOut,
} from 'lucide-react';

import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import type { Employee } from '@/types';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/profile', icon: User, label: 'My Profile', exact: false },
  { href: '/dashboard/leave', icon: Calendar, label: 'Leave', exact: false },
  { href: '/dashboard/handbook', icon: BookOpen, label: 'Handbook', exact: false },
  { href: '/dashboard/policies', icon: FileText, label: 'Policies', exact: false },
  { href: '/dashboard/equipment', icon: Monitor, label: 'Equipment', exact: false },
  { href: '/dashboard/onboarding', icon: Rocket, label: 'Onboarding', exact: false },
  { href: '/dashboard/employees', icon: Users, label: 'Employees', exact: false },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const roleColor: Record<string, string> = {
  admin: '#c8985e', hr: '#3b82f6', it: '#10b981', employee: '#6b7280',
};

export default function AppSidebar({ employee }: { employee: Employee }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <Sidebar collapsible="icon">
      {/* Brand Header */}
      <SidebarHeader>
        <div className="flex flex-col items-center py-4 px-3 gap-2 overflow-hidden">
          {!isCollapsed && (
            <>
              <img
                src="/sachhsoft_logo.png"
                alt="SACHHSOFT"
                style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
              />
              <span className="text-xs font-medium tracking-widest uppercase whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em' }}>
                Employee Portal
              </span>
            </>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 px-1">
              {navItems.map(item => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => {
                        router.push(item.href);
                        setOpenMobile(false);
                      }}
                      className="cursor-pointer py-3 h-auto"
                    >
                      <item.icon className="size-6 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer — plain div to avoid SidebarFooter's forced gap-2/p-2 classes */}
      <div data-sidebar="footer" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px 8px' }}>
        {/* Profile row */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            router.push('/dashboard/profile');
            setOpenMobile(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              router.push('/dashboard/profile');
              setOpenMobile(false);
            }
          }}
          title={employee.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: 0,
            borderRadius: 8,
            background: 'transparent',
            cursor: 'pointer',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.name}
              style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', objectPosition: 'top', flexShrink: 0, display: 'block' }}
            />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #c8985e, #e0be8a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0f1a2e', fontWeight: 700, fontSize: '0.875rem',
            }}>
              {getInitials(employee.name)}
            </div>
          )}
          {!isCollapsed && (
            <div style={{ marginLeft: 8, flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</div>
              <div style={{ color: roleColor[employee.role] ?? '#6b7280', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{employee.role}</div>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <SidebarMenu className="px-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
