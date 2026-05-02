'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, ClipboardList, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Employee, EquipmentRequest } from '@/types';

interface EquipmentClientProps {
  employee: Employee;
  initialRequests: Array<EquipmentRequest & { employee: Pick<Employee, 'name' | 'employee_code' | 'department'> | null }>;
}

export default function EquipmentClient({ employee, initialRequests }: EquipmentClientProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [formData, setFormData] = useState({ type: 'Laptop', specs: '', urgency: 'Normal', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async () => {
    if (!formData.specs.trim()) { toast.error('Missing Specs', { description: 'Please provide equipment specifications.' }); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_type: formData.type, specifications: formData.specs, urgency: formData.urgency, notes: formData.notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests([data.request, ...requests]);
      setFormData({ type: 'Laptop', specs: '', urgency: 'Normal', notes: '' });
      toast.success('Equipment Request Submitted', { description: 'Email sent to IT Admin.' });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSubmitting(false); }
  };

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
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                  <option>Laptop</option><option>Monitor</option><option>Keyboard</option>
                  <option>Mouse</option><option>Headset</option><option>Software License</option><option>Other</option>
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
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </div>
            <div className="rounded-lg p-3 text-xs text-muted-foreground space-y-1.5" style={{ background: 'rgba(200,152,94,0.1)' }}>
              <div className="flex items-center gap-2"><Mail className="size-3.5 flex-shrink-0" style={{ color: '#c8985e' }} /> Email will be sent to IT Admin automatically</div>
              <div className="flex items-center gap-2"><ClipboardList className="size-3.5 flex-shrink-0" style={{ color: '#c8985e' }} /> Request will appear in IT dashboard for processing</div>
            </div>
            <button onClick={submitRequest} disabled={submitting}
              className="w-full py-3 rounded-lg font-semibold text-sm"
              style={{ background: submitting ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </CardContent>
        </Card>

        {/* History */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Request History</h3>
          {requests.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No equipment requests yet.</CardContent></Card>
          ) : requests.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm text-foreground">{r.equipment_type}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground">{r.specifications}</p>
                <div className="text-xs text-muted-foreground mt-2">
                  {r.employee?.name ?? 'You'} · {new Date(r.created_at).toLocaleDateString('en-IN')} · Urgency: <UrgencyTag urgency={r.urgency} />
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(230,126,34,.12)', color: '#e67e22' },
    approved: { bg: 'rgba(46,125,50,.12)', color: '#2e7d32' },
    delivered: { bg: 'rgba(58,123,213,.12)', color: '#3a7bd5' },
    rejected: { bg: 'rgba(179,58,58,.12)', color: '#b33a3a' },
  };
  const { bg, color } = map[status] ?? map.pending;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ background: bg, color }}>{status}</span>;
}

function UrgencyTag({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = { Critical: '#b33a3a', High: '#e67e22', Normal: '#3a7bd5', Low: '#2e7d32' };
  return <span className="font-semibold" style={{ color: colors[urgency] ?? '#3a7bd5' }}>{urgency}</span>;
}
