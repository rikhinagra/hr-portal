'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Package, Mail, ClipboardList, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Employee, EquipmentRequest } from '@/types';

type EquipmentRow = EquipmentRequest & {
  employee: Pick<Employee, 'id' | 'name' | 'email' | 'employee_code' | 'department'> | null;
};

interface EquipmentClientProps {
  employee: Employee;
  initialRequests: EquipmentRow[];
}

export default function EquipmentClient({ employee, initialRequests }: EquipmentClientProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [formData, setFormData] = useState({ type: 'Laptop', specs: '', urgency: 'Normal', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  const isAdmin = employee.role === 'admin';
  const isHrOrIt = employee.role === 'hr' || employee.role === 'it';
  const isPrivileged = isAdmin || isHrOrIt;

  const submitRequest = async () => {
    if (!formData.specs.trim()) {
      toast.error('Missing Specs', { description: 'Please provide equipment specifications.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_type: formData.type, specifications: formData.specs, urgency: formData.urgency, notes: formData.notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests([data.request, ...requests]);
      setFormData({ type: 'Laptop', specs: '', urgency: 'Normal', notes: '' });
      setShowRequestModal(false);
      toast.success('Equipment Request Submitted', { description: 'Email sent to IT Admin.' });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (reqId: string, status: 'approved' | 'rejected' | 'delivered') => {
    const key = `${reqId}-${status}`;
    setActionLoading(key);
    try {
      const res = await fetch(`/api/equipment/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: data.request.status } : r));
      const labels: Record<string, string> = { approved: 'Approved', rejected: 'Rejected', delivered: 'Marked as Delivered' };
      toast.success(labels[status], { description: `Equipment request has been ${labels[status].toLowerCase()}.` });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = isPrivileged && search
    ? requests.filter(r =>
        r.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee?.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee?.department?.toLowerCase().includes(search.toLowerCase()) ||
        r.equipment_type.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  /* ── Privileged view (admin / hr / it) ── */
  if (isPrivileged) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-heading text-2xl">Equipment Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? 'View all employee equipment requests.' : 'Review and process employee equipment requests.'}
            </p>
          </div>
          {isHrOrIt && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex-shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm"
              style={{ background: '#c8985e', color: '#0f1a2e' }}>
              + New Request
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Search by name, code, department, or equipment…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-[#c8985e]/30"
        />

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#0f1a2e' }}>
                    {['Employee', 'Code', 'Equipment', 'Specifications', 'Urgency', 'Status', 'Date', ...(isHrOrIt ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={isHrOrIt ? 8 : 7} className="py-10 text-center text-muted-foreground">
                        No requests found.
                      </td>
                    </tr>
                  ) : filteredRequests.map(r => (
                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground whitespace-nowrap">{r.employee?.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{r.employee?.department}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.employee?.employee_code ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.equipment_type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                        <span className="line-clamp-2">{r.specifications}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><UrgencyTag urgency={r.urgency} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {isHrOrIt && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ActionButtons req={r} onAction={handleAction} actionLoading={actionLoading} />
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
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">No requests found.</CardContent>
            </Card>
          ) : filteredRequests.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{r.employee?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.employee?.employee_code} · {r.employee?.department}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{r.equipment_type}</span>
                  <span className="text-muted-foreground">·</span>
                  <UrgencyTag urgency={r.urgency} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.specifications}</p>
                {r.notes && <p className="text-xs text-muted-foreground mt-1 italic">{r.notes}</p>}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {isHrOrIt && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <ActionButtons req={r} onAction={handleAction} actionLoading={actionLoading} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* New Request Modal — HR/IT only */}
        {showRequestModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
            <div className="rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl bg-card text-foreground border animate-slide-up max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                New Equipment Request
              </h3>
              <p className="text-sm text-muted-foreground mb-5">Submit a request for yourself. Email goes to IT Admin.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Equipment Type</label>
                  <div className="relative">
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                      <option>Laptop</option><option>Monitor</option><option>Keyboard</option>
                      <option>Mouse</option><option>Headset</option><option>Mobile</option>
                      <option>Software License</option><option>Other</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Specifications / Details *</label>
                  <textarea value={formData.specs} onChange={e => setFormData({ ...formData, specs: e.target.value })}
                    placeholder="e.g. 16GB RAM, i7 processor, Ubuntu OS" rows={3}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Urgency</label>
                  <div className="relative">
                    <select value={formData.urgency} onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                      <option>Low</option><option>Normal</option><option>High</option><option>Critical</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Additional Notes</label>
                  <input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional — any extra context"
                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowRequestModal(false); setFormData({ type: 'Laptop', specs: '', urgency: 'Normal', notes: '' }); }}
                  className="px-5 py-2.5 rounded-lg text-sm border border-border text-muted-foreground bg-transparent hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={submitRequest} disabled={submitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: submitting ? '#ccc' : '#c8985e', color: '#0f1a2e', cursor: submitting ? 'wait' : 'pointer' }}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Employee view ── */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading text-2xl">Equipment Request</h1>
        <p className="text-sm text-muted-foreground mt-1">Request hardware or software. Email sent to IT automatically.</p>
      </div>

      <div className="grid gap-6 equipment-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Form */}
        <Card>
          <CardHeader className="pb-0">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>New Request</h3>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Equipment Type</label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                  <option>Laptop</option>
                  <option>Monitor</option>
                  <option>Keyboard</option>
                  <option>Mouse</option>
                  <option>Headset</option>
                  <option>Mobile</option>
                  <option>Software License</option>
                  <option>Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Specifications / Details *</label>
              <textarea
                value={formData.specs}
                onChange={e => setFormData({ ...formData, specs: e.target.value })}
                placeholder="e.g. 16GB RAM, i7 processor, Ubuntu OS"
                rows={3}
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Urgency</label>
              <div className="relative">
                <select
                  value={formData.urgency}
                  onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Additional Notes</label>
              <input
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional — any extra context"
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </div>

            <div className="rounded-lg p-3 text-xs text-muted-foreground space-y-1.5" style={{ background: 'rgba(200,152,94,0.1)' }}>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 flex-shrink-0" style={{ color: '#c8985e' }} />
                Email will be sent to IT Admin and HR automatically
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="size-3.5 flex-shrink-0" style={{ color: '#c8985e' }} />
                Request will appear in IT dashboard for processing
              </div>
            </div>

            <button
              onClick={submitRequest}
              disabled={submitting}
              className="w-full py-3 rounded-lg font-semibold text-sm"
              style={{ background: submitting ? '#ccc' : '#c8985e', color: '#0f1a2e', cursor: submitting ? 'wait' : 'pointer' }}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </CardContent>
        </Card>

        {/* History */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Request History</h3>
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">No equipment requests yet.</CardContent>
            </Card>
          ) : requests.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="font-semibold text-sm text-foreground">{r.equipment_type}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.specifications}</p>
                {r.notes && <p className="text-xs text-muted-foreground mt-1 italic">{r.notes}</p>}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}Urgency: <UrgencyTag urgency={r.urgency} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <style>{`@media(max-width:768px){.equipment-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function ActionButtons({ req, onAction, actionLoading }: {
  req: EquipmentRow;
  onAction: (id: string, status: 'approved' | 'rejected' | 'delivered') => void;
  actionLoading: string | null;
}) {
  const isActioning = actionLoading?.startsWith(req.id) ?? false;

  if (req.status === 'pending') {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction(req.id, 'approved')}
          disabled={isActioning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: 'rgba(46,125,50,0.12)', color: '#2e7d32', opacity: isActioning ? 0.6 : 1, cursor: isActioning ? 'wait' : 'pointer' }}>
          <Check className="size-3.5" />
          {actionLoading === `${req.id}-approved` ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={() => onAction(req.id, 'rejected')}
          disabled={isActioning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: 'rgba(179,58,58,0.12)', color: '#b33a3a', opacity: isActioning ? 0.6 : 1, cursor: isActioning ? 'wait' : 'pointer' }}>
          <X className="size-3.5" />
          {actionLoading === `${req.id}-rejected` ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    );
  }

  if (req.status === 'approved') {
    return (
      <button
        onClick={() => onAction(req.id, 'delivered')}
        disabled={isActioning}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        style={{ background: 'rgba(58,123,213,0.12)', color: '#3a7bd5', opacity: isActioning ? 0.6 : 1, cursor: isActioning ? 'wait' : 'pointer' }}>
        <Package className="size-3.5" />
        {actionLoading === `${req.id}-delivered` ? 'Saving…' : 'Mark Delivered'}
      </button>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: 'rgba(230,126,34,.12)',  color: '#e67e22', label: 'Pending' },
    approved:  { bg: 'rgba(46,125,50,.12)',   color: '#2e7d32', label: 'Approved' },
    delivered: { bg: 'rgba(58,123,213,.12)',  color: '#3a7bd5', label: 'Delivered' },
    rejected:  { bg: 'rgba(179,58,58,.12)',   color: '#b33a3a', label: 'Rejected' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function UrgencyTag({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = { Critical: '#b33a3a', High: '#e67e22', Normal: '#3a7bd5', Low: '#2e7d32' };
  return <span className="text-xs font-semibold" style={{ color: colors[urgency] ?? '#3a7bd5' }}>{urgency}</span>;
}
