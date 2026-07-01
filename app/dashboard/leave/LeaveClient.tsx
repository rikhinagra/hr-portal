'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, ArrowRight, ChevronDown, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Employee, LeaveRequest, CompOffClaim } from '@/types';

interface LeaveClientProps {
  employee: Employee;
  initialLeaves: Array<LeaveRequest & { employee: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'email' | 'reporting_manager_email'> | null }>;
  initialClaims: Array<CompOffClaim & { employee: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'email'> | null }>;
}

function formatLeaveType(type: string): string {
  if (type === 'earned') return 'Earned (Annual)';
  if (type === 'sick') return 'Sick Leave';
  if (type === 'compoff') return 'Comp-Off';
  return type;
}

export default function LeaveClient({ employee, initialLeaves, initialClaims }: LeaveClientProps) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [claims, setClaims] = useState(initialClaims);

  // Leave form state
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState<'earned' | 'sick' | 'compoff'>('earned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Comp-off claim form state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [workDate, setWorkDate] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = employee.role === 'admin';
  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';
  const isManager = employee.role === 'manager';
  const canManageLeave = isAdminOrHr || isManager;
  const canApply = employee.role !== 'admin';
  const pendingCount = leaves.filter(l => l.status === 'pending').length + claims.filter(c => c.status === 'pending').length;

  const today = new Date().toISOString().split('T')[0];

  const isWeekend = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
  };

  const submitLeave = async () => {
    if (!startDate || (!isHalfDay && !endDate) || !reason.trim()) {
      toast.error('Missing Fields', { description: 'Please fill all required fields.' }); return;
    }
    const effectiveEndDate = isHalfDay ? startDate : endDate;
    if (!isHalfDay && new Date(endDate) < new Date(startDate)) {
      toast.error('Invalid Dates', { description: 'End date must be after start date.' }); return;
    }
    if (isWeekend(startDate)) {
      toast.error('Invalid Date', { description: 'Leave cannot start on a Saturday or Sunday.' }); return;
    }
    if (!isHalfDay && isWeekend(endDate)) {
      toast.error('Invalid Date', { description: 'Leave cannot end on a Saturday or Sunday.' }); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: effectiveEndDate, reason, is_half_day: isHalfDay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeaves([data.leave, ...leaves]);
      setShowForm(false);
      setStartDate(''); setEndDate(''); setReason(''); setLeaveType('earned'); setIsHalfDay(false);
      toast.success('Leave Request Submitted', { description: `${data.leave.days === 0.5 ? 'Half day' : `${data.leave.days} day(s)`} submitted. Email sent to HR.` });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSubmitting(false); }
  };

  const submitClaim = async () => {
    if (!workDate || !claimReason.trim()) {
      toast.error('Missing Fields', { description: 'Please fill all required fields.' }); return;
    }
    setClaimSubmitting(true);
    try {
      const res = await fetch('/api/compoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_date: workDate, reason: claimReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClaims([data.claim, ...claims]);
      setShowClaimForm(false);
      setWorkDate(''); setClaimReason('');
      toast.success('Comp-Off Claim Submitted', { description: 'Your claim has been sent for approval.' });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setClaimSubmitting(false); }
  };

  const handleAction = async (leaveId: string, action: 'approved' | 'rejected') => {
    setActionLoading(leaveId + action);
    try {
      const res = await fetch(`/api/leave/${leaveId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error('Already Actioned', { description: `${data.error} Please refresh the page.` });
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: action } : l));
      toast.success(`Leave ${action === 'approved' ? 'Approved' : 'Rejected'}`, { description: 'Employee notified via email.' });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setActionLoading(null); }
  };

  const handleClaimAction = async (claimId: string, action: 'approved' | 'rejected') => {
    setActionLoading('claim-' + claimId + action);
    try {
      const res = await fetch(`/api/compoff/${claimId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error('Already Actioned', { description: `${data.error} Please refresh the page.` });
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setClaims(claims.map(c => c.id === claimId ? { ...c, status: action } : c));
      toast.success(`Comp-Off Claim ${action === 'approved' ? 'Approved' : 'Rejected'}`, { description: 'Employee notified via email.' });
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
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Track and manage leave requests' : 'Apply, track, and manage leave requests'}
          </p>
        </div>
        {canApply && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowClaimForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border"
              style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', borderColor: 'rgba(22,163,74,0.25)' }}>
              + Claim Comp-Off
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: '#c8985e', color: '#0f1a2e' }}>
              + Apply for Leave
            </button>
          </div>
        )}
      </div>

      {/* Balance Cards */}
      <div className={`grid gap-4 leave-balance-grid ${isAdmin ? 'grid-cols-1 max-w-xs' : 'grid-cols-4'}`}>
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
            <Card><CardContent className="p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Comp-Off</div>
              <div className="text-3xl font-bold" style={{ color: '#16a34a' }}>{employee.leave_balance_compoff}</div>
              <div className="text-xs text-muted-foreground mt-1">days available</div>
            </CardContent></Card>
          </>
        )}
        <Card><CardContent className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pending Requests</div>
          <div className="text-3xl font-bold" style={{ color: '#b33a3a' }}>{pendingCount}</div>
          <div className="text-xs text-muted-foreground mt-1">awaiting approval</div>
        </CardContent></Card>
      </div>

      {/* Leave Requests */}
      <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Leave Requests</h2>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f1a2e' }}>
                  {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', ...(canManageLeave ? ['Action'] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaves.length === 0 ? (
                  <tr><td colSpan={canManageLeave ? 7 : 6} className="py-10 text-center text-muted-foreground">No leave requests yet.</td></tr>
                ) : leaves.map(l => (
                  <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{l.employee?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-foreground">{formatLeaveType(l.leave_type)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      <span className="flex items-center gap-1.5">
                        {new Date(l.start_date).toLocaleDateString('en-IN')}
                        <ArrowRight className="size-3 flex-shrink-0 text-muted-foreground" />
                        {new Date(l.end_date).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{Number(l.days) === 0.5 ? 'Half Day' : l.days}</td>
                    <td className="px-4 py-3 text-muted-foreground" style={{ maxWidth: '240px', wordBreak: 'break-word', whiteSpace: 'normal' }}>{l.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    {canManageLeave && (
                      <td className="px-4 py-3">
                        {l.status === 'pending' && (isAdmin || l.employee?.id !== employee.id) && (
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

      {/* Mobile Cards - Leave */}
      <div className="flex flex-col gap-3 md:hidden">
        {leaves.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No leave requests yet.</CardContent></Card>
        ) : leaves.map(l => (
          <Card key={l.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-foreground text-sm">{l.employee?.name ?? 'Unknown'}</div>
                <StatusBadge status={l.status} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>
                  {formatLeaveType(l.leave_type)}
                </span>
                <span className="text-xs text-muted-foreground">{Number(l.days) === 0.5 ? 'Half Day' : `${l.days} day${l.days !== 1 ? 's' : ''}`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <span>{new Date(l.start_date).toLocaleDateString('en-IN')}</span>
                <ArrowRight className="size-3 flex-shrink-0" />
                <span>{new Date(l.end_date).toLocaleDateString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3" style={{ wordBreak: 'break-word' }}>{l.reason}</p>
              {canManageLeave && l.status === 'pending' && (isAdmin || l.employee?.id !== employee.id) && (
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

      {/* Comp-Off Claims */}
      <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Comp-Off Claims</h2>

      {/* Desktop Table - Claims */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f1a2e' }}>
                  {['Employee', 'Date Worked', 'Reason', 'Status', ...(canManageLeave ? ['Action'] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims.length === 0 ? (
                  <tr><td colSpan={canManageLeave ? 5 : 4} className="py-10 text-center text-muted-foreground">No comp-off claims yet.</td></tr>
                ) : claims.map(c => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{c.employee?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{new Date(c.work_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-muted-foreground" style={{ maxWidth: '240px', wordBreak: 'break-word', whiteSpace: 'normal' }}>{c.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    {canManageLeave && (
                      <td className="px-4 py-3">
                        {c.status === 'pending' && (isAdmin || c.employee?.id !== employee.id) && (
                          <div className="flex gap-2">
                            <button onClick={() => handleClaimAction(c.id, 'approved')} disabled={actionLoading !== null}
                              className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ background: '#2e7d32' }}>
                              {actionLoading === 'claim-' + c.id + 'approved' ? '…' : 'Approve'}
                            </button>
                            <button onClick={() => handleClaimAction(c.id, 'rejected')} disabled={actionLoading !== null}
                              className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ background: '#b33a3a' }}>
                              {actionLoading === 'claim-' + c.id + 'rejected' ? '…' : 'Reject'}
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

      {/* Mobile Cards - Claims */}
      <div className="flex flex-col gap-3 md:hidden">
        {claims.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No comp-off claims yet.</CardContent></Card>
        ) : claims.map(c => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-foreground text-sm">{c.employee?.name ?? 'Unknown'}</div>
                <StatusBadge status={c.status} />
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Worked on: <span className="font-semibold text-foreground">{new Date(c.work_date).toLocaleDateString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3" style={{ wordBreak: 'break-word' }}>{c.reason}</p>
              {canManageLeave && c.status === 'pending' && (isAdmin || c.employee?.id !== employee.id) && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button onClick={() => handleClaimAction(c.id, 'approved')} disabled={actionLoading !== null}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#2e7d32', opacity: actionLoading !== null ? 0.6 : 1 }}>
                    {actionLoading === 'claim-' + c.id + 'approved' ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => handleClaimAction(c.id, 'rejected')} disabled={actionLoading !== null}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#b33a3a', opacity: actionLoading !== null ? 0.6 : 1 }}>
                    {actionLoading === 'claim-' + c.id + 'rejected' ? '…' : 'Reject'}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Apply Leave Modal */}
      {showForm && canApply && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl bg-card text-foreground border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Apply for Leave</h3>
              <button onClick={() => { setShowForm(false); setIsHalfDay(false); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Leave Type</label>
                <div className="relative">
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value as typeof leaveType)}
                    className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                    <option value="earned">Earned (Annual) — {employee.leave_balance_earned} day(s) remaining</option>
                    <option value="sick">Sick Leave — {employee.leave_balance_sick} day(s) remaining</option>
                    <option value="compoff">Comp-Off — {employee.leave_balance_compoff} day(s) available</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center gap-2.5 py-1">
                <input type="checkbox" id="half-day" checked={isHalfDay}
                  onChange={e => { setIsHalfDay(e.target.checked); if (e.target.checked) setEndDate(''); }}
                  className="size-4 cursor-pointer accent-[#c8985e]" />
                <label htmlFor="half-day" className="text-sm text-foreground cursor-pointer select-none">Half Day</label>
              </div>
              {isHalfDay ? (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Date</label>
                  <div className="relative">
                    <input type="date" value={startDate} min={today}
                      onChange={e => { setStartDate(e.target.value); setEndDate(e.target.value); }}
                      className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                    />
                    {!startDate && <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none bg-background pr-1">DD/MM/YYYY</span>}
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Start Date</label>
                    <div className="relative">
                      <input type="date" value={startDate} min={today}
                        onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                        className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                      />
                      {!startDate && <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none bg-background pr-1">DD/MM/YYYY</span>}
                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">End Date</label>
                    <div className="relative">
                      <input type="date" value={endDate} min={startDate || today}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                      />
                      {!endDate && <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none bg-background pr-1">DD/MM/YYYY</span>}
                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
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

      {/* Claim Comp-Off Modal */}
      {showClaimForm && canApply && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl bg-card text-foreground border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Claim Comp-Off</h3>
              <button onClick={() => setShowClaimForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Worked on a weekend or public holiday? Submit this claim for approval. Once approved, 1 day will be added to your Comp-Off balance.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Date You Worked *</label>
                <div className="relative">
                  <input type="date" value={workDate} max={today}
                    onChange={e => setWorkDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
                  />
                  {!workDate && <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none bg-background pr-1">DD/MM/YYYY</span>}
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Reason / Work Description *</label>
                <textarea value={claimReason} onChange={e => setClaimReason(e.target.value)} rows={3}
                  placeholder="Describe what work you did on that day..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y placeholder:text-muted-foreground" />
              </div>
              <div className="rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2" style={{ background: 'rgba(22,163,74,0.08)' }}>
                <Mail className="size-3.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                {employee.role === 'hr'
                  ? 'Claim will be sent directly to all Admins for approval.'
                  : 'Claim will be sent to HR. Admins will be notified.'}
              </div>
              <button onClick={submitClaim} disabled={claimSubmitting}
                className="w-full py-3 rounded-lg font-semibold text-sm"
                style={{ background: claimSubmitting ? '#ccc' : '#16a34a', color: claimSubmitting ? '#0f1a2e' : '#fff' }}>
                {claimSubmitting ? 'Submitting…' : 'Submit Comp-Off Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:768px){.leave-balance-grid{grid-template-columns:1fr 1fr!important}}
        @media(max-width:480px){.leave-balance-grid{grid-template-columns:1fr!important}}
        input[type="date"]::-webkit-calendar-picker-indicator{position:absolute;top:0;right:0;width:44px;height:100%;opacity:0;cursor:pointer}
      `}</style>
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
