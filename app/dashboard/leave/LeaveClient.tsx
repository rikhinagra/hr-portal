'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronDown, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Employee, LeaveRequest } from '@/types';

interface LeaveClientProps {
  employee: Employee;
  initialLeaves: Array<LeaveRequest & { employee: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'email' | 'reporting_manager_email'> | null }>;
}

export default function LeaveClient({ employee, initialLeaves }: LeaveClientProps) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState<'earned' | 'sick'>('earned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = employee.role === 'admin';
  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';
  const canApply = employee.role !== 'admin';
  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  const submitLeave = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Missing Fields', { description: 'Please fill all required fields.' }); return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error('Invalid Dates', { description: 'End date must be after start date.' }); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeaves([data.leave, ...leaves]);
      setShowForm(false);
      setStartDate(''); setEndDate(''); setReason(''); setLeaveType('earned');
      toast.success('Leave Request Submitted', { description: `${data.leave.days} day(s) submitted. Email sent to Manager & HR.` });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSubmitting(false); }
  };

  const handleAction = async (leaveId: string, action: 'approved' | 'rejected') => {
    setActionLoading(leaveId + action);
    try {
      const res = await fetch(`/api/leave/${leaveId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: action } : l));
      toast.success(`Leave ${action === 'approved' ? 'Approved' : 'Rejected'}`, { description: 'Employee notified via email.' });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAdmin ? 'Track and manage leave requests' : 'Apply, track, and manage leave requests'}</p>
        </div>
        {canApply && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: '#c8985e', color: '#0f1a2e' }}>
            + Apply for Leave
          </button>
        )}
      </div>

      {/* Balance Cards */}
      <div className={`grid gap-4 leave-balance-grid ${isAdmin ? 'grid-cols-1 max-w-xs' : 'grid-cols-3'}`}>
        {!isAdmin && (
          <>
            <Card><CardContent className="p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Earned Leave</div>
              <div className="text-3xl font-bold" style={{ color: '#3a7bd5' }}>{employee.leave_balance_earned}</div>
              <div className="text-xs text-muted-foreground mt-1">of 12 days remaining</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sick Leave</div>
              <div className="text-3xl font-bold" style={{ color: '#e67e22' }}>{employee.leave_balance_sick}</div>
              <div className="text-xs text-muted-foreground mt-1">of 7 days remaining</div>
            </CardContent></Card>
          </>
        )}
        <Card><CardContent className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pending Requests</div>
          <div className="text-3xl font-bold" style={{ color: '#b33a3a' }}>{pendingCount}</div>
          <div className="text-xs text-muted-foreground mt-1">awaiting approval</div>
        </CardContent></Card>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f1a2e' }}>
                  {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', ...(isAdminOrHr ? ['Action'] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaves.length === 0 ? (
                  <tr><td colSpan={isAdminOrHr ? 7 : 6} className="py-10 text-center text-muted-foreground">No leave requests yet.</td></tr>
                ) : leaves.map(l => (
                  <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{l.employee?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 capitalize text-foreground">{l.leave_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      <span className="flex items-center gap-1.5">{new Date(l.start_date).toLocaleDateString('en-IN')} <ArrowRight className="size-3 flex-shrink-0 text-muted-foreground" /> {new Date(l.end_date).toLocaleDateString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{l.days}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{l.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    {isAdminOrHr && (
                      <td className="px-4 py-3">
                        {l.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(l.id, 'approved')} disabled={actionLoading !== null}
                              className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ background: '#2e7d32' }}>
                              {actionLoading === l.id + 'approved' ? '…' : 'Approve'}
                            </button>
                            <button onClick={() => handleAction(l.id, 'rejected')} disabled={actionLoading !== null}
                              className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ background: '#b33a3a' }}>
                              {actionLoading === l.id + 'rejected' ? '…' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {leaves.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No leave requests yet.</CardContent></Card>
        ) : leaves.map(l => (
          <Card key={l.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Top: name + status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-foreground text-sm">{l.employee?.name ?? 'Unknown'}</div>
                <StatusBadge status={l.status} />
              </div>

              {/* Type + days */}
              <div className="flex items-center gap-2 mb-2">
                <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>
                  {l.leave_type}
                </span>
                <span className="text-xs text-muted-foreground">{l.days} day{l.days !== 1 ? 's' : ''}</span>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <span>{new Date(l.start_date).toLocaleDateString('en-IN')}</span>
                <ArrowRight className="size-3 flex-shrink-0" />
                <span>{new Date(l.end_date).toLocaleDateString('en-IN')}</span>
              </div>

              {/* Reason */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{l.reason}</p>

              {/* Admin actions */}
              {isAdminOrHr && l.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button onClick={() => handleAction(l.id, 'approved')} disabled={actionLoading !== null}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#2e7d32', opacity: actionLoading !== null ? 0.6 : 1 }}>
                    {actionLoading === l.id + 'approved' ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => handleAction(l.id, 'rejected')} disabled={actionLoading !== null}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#b33a3a', opacity: actionLoading !== null ? 0.6 : 1 }}>
                    {actionLoading === l.id + 'rejected' ? '…' : 'Reject'}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showForm && canApply && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl bg-card text-foreground border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Apply for Leave</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Leave Type</label>
                <div className="relative">
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value as typeof leaveType)}
                    className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                    <option value="earned">Earned (Annual)</option>
                    <option value="sick">Sick Leave</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Start Date</label>
                  <div className="relative">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                      style={{ color: startDate ? 'inherit' : 'transparent', WebkitAppearance: 'none' }}
                    />
                    {!startDate && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        YYYY-MM-DD
                      </span>
                    )}
                    <style>{`
                      input[type="date"]::-webkit-calendar-picker-indicator {
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
                      }
                    `}</style>
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">End Date</label>
                  <div className="relative">
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                      style={{ color: endDate ? 'inherit' : 'transparent', WebkitAppearance: 'none' }}
                    />
                    {!endDate && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        YYYY-MM-DD
                      </span>
                    )}
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
              </div>
              <div className="rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2" style={{ background: 'rgba(200,152,94,0.1)' }}>
                <Mail className="size-3.5 flex-shrink-0" style={{ color: '#c8985e' }} />
                {employee.role === 'hr'
                  ? 'Email will be sent directly to all Admins for approval'
                  : 'Email will be sent to HR. Admins will be notified.'}
              </div>
              <button onClick={submitLeave} disabled={submitting}
                className="w-full py-3 rounded-lg font-semibold text-sm"
                style={{ background: submitting ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
                {submitting ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media(max-width:600px){.leave-balance-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(230,126,34,.12)', color: '#e67e22' },
    approved: { bg: 'rgba(46,125,50,.12)', color: '#2e7d32' },
    rejected: { bg: 'rgba(179,58,58,.12)', color: '#b33a3a' },
  };
  const { bg, color } = s[status] ?? s.pending;
  return <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize" style={{ background: bg, color }}>{status}</span>;
}
