'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Heart, FileText, Users, Monitor, BookOpen, ChevronRight, Trash2, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Employee } from '@/types';

interface DashboardClientProps {
  employee: Employee;
  policiesCount: number;
  teamCount: number;
  handbookAck: { acknowledged_at: string } | null;
  activityLog: Array<{ id: string; action: string; description: string; action_type: string; created_at: string; performer?: { name: string; employee_code: string } | null }>;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString('en-IN');
}

const roleLabel: Record<string, string> = { admin: 'Administrator', hr: 'HR Manager', it: 'IT Staff', employee: 'Employee' };
const roleColor: Record<string, string> = { admin: '#c8985e', hr: '#2563eb', it: '#16a34a', employee: '#6b7280' };
const roleColorBg: Record<string, string> = { admin: 'rgba(200,152,94,0.12)', hr: 'rgba(37,99,235,0.1)', it: 'rgba(22,163,74,0.1)', employee: 'rgba(107,114,128,0.1)' };

const activityDot: Record<string, string> = { success: '#16a34a', info: '#2563eb', warning: '#ea580c', error: '#dc2626' };

export default function DashboardClient({ employee, policiesCount, teamCount, handbookAck, activityLog: initialActivityLog }: DashboardClientProps) {
  const router = useRouter();
  const [activityLog, setActivityLog] = useState(initialActivityLog);
  const [clearingActivity, setClearingActivity] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearActivity = async () => {
    setClearingActivity(true);
    try {
      const res = await fetch('/api/activity', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActivityLog([]);
      toast.success('Activity log cleared.');
    } catch (err: unknown) {
      toast.error('Failed to clear activity', { description: err instanceof Error ? err.message : 'Try again.' });
    } finally {
      setClearingActivity(false);
      setShowClearConfirm(false);
    }
  };

  const isAdmin = employee.role === 'admin';

  const stats = [
    ...(!isAdmin ? [
      { label: 'Casual Leave', value: employee.leave_balance_casual, sub: 'of 12 days', icon: Calendar, iconBg: 'rgba(37,99,235,0.1)', iconColor: '#2563eb' },
      { label: 'Sick Leave', value: employee.leave_balance_sick, sub: 'of 7 days', icon: Heart, iconBg: 'rgba(234,88,12,0.1)', iconColor: '#ea580c' },
    ] : []),
    { label: 'Policies', value: policiesCount, sub: 'documents', icon: FileText, iconBg: 'rgba(22,163,74,0.1)', iconColor: '#16a34a' },
    { label: 'Team Size', value: teamCount, sub: 'active members', icon: Users, iconBg: 'rgba(200,152,94,0.1)', iconColor: '#c8985e' },
  ];

  const quickActions = [
    ...(!isAdmin ? [
      { label: 'Apply for Leave', sub: 'Submit leave request', icon: Calendar, href: '/dashboard/leave', iconBg: 'rgba(37,99,235,0.1)', iconColor: '#2563eb' },
    ] : []),
    ...(isAdmin || employee.role === 'hr' ? [
      { label: 'Request Equipment', sub: 'Hardware or software', icon: Monitor, href: '/dashboard/equipment', iconBg: 'rgba(22,163,74,0.1)', iconColor: '#16a34a' },
    ] : []),
    { label: 'Read Handbook', sub: handbookAck ? 'Acknowledged' : 'Pending acknowledgement', icon: BookOpen, href: '/dashboard/handbook', iconBg: handbookAck ? 'rgba(22,163,74,0.1)' : 'rgba(234,88,12,0.1)', iconColor: handbookAck ? '#16a34a' : '#ea580c' },
    { label: 'View Policies', sub: `${policiesCount} documents`, icon: FileText, href: '/dashboard/policies', iconBg: 'rgba(124,58,237,0.1)', iconColor: '#7c3aed' },
  ];

  return (
    <div className="space-y-6">

      {/* Profile Hero */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
            {/* Photo + Info row */}
            <div className="flex items-start gap-3 sm:gap-6 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2" style={{ borderColor: '#c8985e' }}>
                  {employee.photo_url && <AvatarImage src={employee.photo_url} alt={employee.name} className="object-cover object-top" />}
                  <AvatarFallback className="text-xl font-bold"
                    style={{ background: 'linear-gradient(135deg, #0f1a2e, #1c2d4a)', color: '#c8985e' }}>
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-green-500 border-2 border-background" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                    {employee.name}
                  </h1>
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full tracking-wide"
                    style={{ background: roleColorBg[employee.role], color: roleColor[employee.role] }}>
                    {roleLabel[employee.role] ?? employee.role}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 dark:text-slate-400">{employee.designation} · {employee.department}</p>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-mono font-semibold text-xs" style={{ color: '#c8985e' }}>{employee.employee_code}</span>
                  <span>{employee.email}</span>
                  {employee.phone && <span>{employee.phone}</span>}
                  <span>Joined {formatDate(employee.join_date)}</span>
                </div>
              </div>
            </div>

            {/* View Profile button — right-aligned on desktop, left-aligned below info on mobile */}
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all self-start sm:flex-shrink-0"
              style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e', border: '1px solid rgba(200,152,94,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,152,94,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,152,94,0.1)'; }}
            >
              <span className="flex items-center gap-1">View Profile <ChevronRight className="size-3.5" /></span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={i} className="border shadow-xs bg-gradient-to-t from-primary/5 to-card dark:bg-card">
            <CardHeader className="pb-2">
              <div className="flex size-8 items-center justify-center rounded-lg"
                style={{ background: s.iconBg }}>
                <s.icon className="size-4" style={{ color: s.iconColor }} />
              </div>
              <CardDescription className="text-xs font-semibold uppercase tracking-wide mt-2">{s.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: s.iconColor }}>
                {s.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-3 text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickActions.map((a, i) => (
            <Card key={i}
              onClick={() => router.push(a.href)}
              className="border shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg" style={{ background: a.iconBg }}>
                  <a.icon className="size-5" style={{ color: a.iconColor }} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.sub}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity (admin/hr only) */}
      {(employee.role === 'admin' || employee.role === 'hr') && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Recent Activity</h2>
            {activityLog.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={clearingActivity}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)', opacity: clearingActivity ? 0.6 : 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; }}
              >
                <Trash2 className="size-3" />
                {clearingActivity ? 'Clearing…' : 'Clear All'}
              </button>
            )}
          </div>
          <Card className="border shadow-xs">
            <CardContent className="p-0">
              {activityLog.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No activity yet. Actions from the portal will appear here.
                </div>
              ) : (
                <div className="divide-y max-h-[320px] overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#1c2d4a transparent' }}>
                  {activityLog.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="size-2 rounded-full flex-shrink-0"
                        style={{ background: activityDot[a.action_type] ?? '#2563eb' }} />
                      <div className="flex-1 min-w-0 text-sm">
                        {a.performer ? (
                          <span className="font-medium text-foreground">{a.performer.name}</span>
                        ) : (
                          <span className="font-medium text-foreground">System</span>
                        )}
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-muted-foreground">{a.description}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatRelativeTime(a.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f1a2e] border border-[#1c2d4a] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d4a]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500" />
                <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>Clear Activity Log?</h3>
              </div>
              <button onClick={() => setShowClearConfirm(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                Are you sure you want to clear the recent activity log?
              </p>
              <div className="bg-[#1c2d4a]/50 border border-[#1c2d4a] p-3 rounded-lg flex gap-2.5 mb-5">
                <div className="size-1.5 rounded-full bg-[#c8985e] mt-1.5 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                  <strong className="text-gray-300">Note:</strong> This only removes the text entries shown in the list. It will <strong className="text-white">NOT</strong> delete the actual uploaded documents, leave requests, or any other data.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingActivity}
                  className="px-4 py-2 text-sm font-semibold text-white bg-transparent hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearActivity}
                  disabled={clearingActivity}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                  style={{ background: '#dc2626', color: 'white' }}
                >
                  {clearingActivity ? 'Clearing…' : 'Yes, Clear Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
