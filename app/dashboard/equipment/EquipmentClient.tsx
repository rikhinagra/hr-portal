'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Monitor, Package, ChevronDown, CalendarDays, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Employee, EquipmentRequest } from '@/types';

type EquipmentRow = EquipmentRequest & {
  employee: Pick<Employee, 'id' | 'name' | 'email' | 'employee_code' | 'department'> | null;
};

type EmpOption = { id: string; name: string; employee_code: string; department: string };

interface Props {
  employee: Employee;
  initialRequests: EquipmentRow[];
  employees: EmpOption[];
}

const EQUIPMENT_TYPES = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Mobile', 'Tablet', 'Software License', 'Other'];

const emptyAdd = { employee_id: '', equipment_type: 'Laptop', specifications: '', date_of_issue: '', device_info: '', total_value: '' };
const emptyReq = { employee_id: '', equipment_type: 'Laptop', specifications: '', urgency: 'Normal', notes: '' };

export default function EquipmentClient({ employee, initialRequests, employees }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');

  const isHr = employee.role === 'hr';
  const isHrOrAdmin = employee.role === 'hr' || employee.role === 'admin';

  // Add Record modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ equipment_type: 'Laptop', specifications: '', date_of_issue: '', device_info: '', total_value: '', status: 'pending' });

  // Request modal (HR only)
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState(emptyReq);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View modal
  const [showView, setShowView] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<EquipmentRow | null>(null);

  const filtered = search.trim()
    ? requests.filter(r =>
        r.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee?.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee?.department?.toLowerCase().includes(search.toLowerCase()) ||
        r.equipment_type.toLowerCase().includes(search.toLowerCase()) ||
        r.device_info?.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  const today = new Date().toISOString().split('T')[0];

  const handleAdd = async () => {
    if (!addForm.employee_id || !addForm.specifications.trim()) {
      toast.error('Missing Fields', { description: 'Employee and specifications are required.' }); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'record',
          employee_id: addForm.employee_id,
          equipment_type: addForm.equipment_type,
          specifications: addForm.specifications,
          date_of_issue: addForm.date_of_issue || null,
          device_info: addForm.device_info || null,
          total_value: addForm.total_value ? Number(addForm.total_value) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(prev => [data.request, ...prev]);
      setShowAdd(false);
      setAddForm(emptyAdd);
      toast.success('Equipment record added.');
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSaving(false); }
  };

  const openEdit = (r: EquipmentRow) => {
    setEditingId(r.id);
    setEditForm({
      equipment_type: r.equipment_type,
      specifications: r.specifications,
      date_of_issue: r.date_of_issue ?? '',
      device_info: r.device_info ?? '',
      total_value: r.total_value != null ? String(r.total_value) : '',
      status: r.status ?? 'pending',
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editForm.specifications.trim()) {
      toast.error('Missing Fields', { description: 'Specifications are required.' }); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/equipment/${editingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_type: editForm.equipment_type,
          specifications: editForm.specifications,
          date_of_issue: editForm.date_of_issue || null,
          device_info: editForm.device_info || null,
          total_value: editForm.total_value ? Number(editForm.total_value) : null,
          status: editForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(prev => prev.map(r => r.id === editingId ? data.request : r));
      setShowEdit(false);
      setEditingId(null);
      toast.success('Equipment record updated.');
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (r: EquipmentRow) => {
    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/equipment/${r.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(prev => prev.filter(x => x.id !== r.id));
      toast.success('Equipment record deleted.');
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setDeletingId(null); }
  };

  const handleRequest = async () => {
    if (!reqForm.employee_id || !reqForm.specifications.trim()) {
      toast.error('Missing Fields', { description: 'Employee and specifications are required.' }); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'request',
          employee_id: reqForm.employee_id,
          equipment_type: reqForm.equipment_type,
          specifications: reqForm.specifications,
          urgency: reqForm.urgency,
          notes: reqForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(prev => [data.request, ...prev]);
      setShowRequest(false);
      setReqForm(emptyReq);
      toast.success('Equipment Requested', { description: 'Email sent to IT team.' });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSaving(false); }
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const fmtValue = (v: number | null) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Equipment Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isHrOrAdmin ? 'Manage equipment assigned to employees.' : 'View all company equipment records.'}
          </p>
        </div>
        {isHrOrAdmin && (
          <div className="flex gap-2 flex-wrap">
            {isHr && (
              <button onClick={() => setShowRequest(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border"
                style={{ background: 'rgba(58,123,213,0.1)', color: '#3a7bd5', borderColor: 'rgba(58,123,213,0.25)' }}>
                <Package className="size-4" /> Request Equipment
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: '#c8985e', color: '#0f1a2e' }}>
              + Add Record
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <input type="text" placeholder="Search by name, code, department, equipment type…"
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-[#c8985e]/30" />

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f1a2e' }}>
                  {['Employee', 'Equipment', 'Specifications', 'Device Info', 'Date of Issue', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">No equipment records found.</td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground whitespace-nowrap">{r.employee?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.employee?.employee_code} · {r.employee?.department}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.equipment_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                      <span className="line-clamp-2">{r.specifications}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                      <span className="line-clamp-2">{r.device_info ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.date_of_issue)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setViewingRecord(r); setShowView(true); }} title="View Details"
                          className="p-1.5 rounded border"
                          style={{ color: '#c8985e', borderColor: 'rgba(200,152,94,0.3)' }}>
                          <Eye className="size-3.5" />
                        </button>
                        {isHrOrAdmin && (
                          <>
                            <button onClick={() => openEdit(r)} title="Edit"
                              className="p-1.5 rounded border"
                              style={{ color: '#3a7bd5', borderColor: 'rgba(58,123,213,0.3)' }}>
                              <Pencil className="size-3.5" />
                            </button>
                            <button onClick={() => handleDelete(r)} disabled={deletingId === r.id} title="Delete"
                              className="p-1.5 rounded border"
                              style={{ color: '#b33a3a', borderColor: 'rgba(179,58,58,0.3)', opacity: deletingId === r.id ? 0.5 : 1 }}>
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No equipment records found.</CardContent></Card>
        ) : filtered.map(r => (
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
                <Monitor className="size-3.5 flex-shrink-0" style={{ color: '#c8985e' }} />
                <span className="text-sm font-medium text-foreground">{r.equipment_type}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{r.specifications}</p>
              {r.device_info && <p className="text-xs text-muted-foreground mb-1">Device: {r.device_info}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {r.date_of_issue && <span>Issued: {fmtDate(r.date_of_issue)}</span>}
                {r.total_value != null && <span>Value: {fmtValue(r.total_value)}</span>}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                <button onClick={() => { setViewingRecord(r); setShowView(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{ color: '#c8985e', borderColor: 'rgba(200,152,94,0.3)' }}>
                  <Eye className="size-3" /> View
                </button>
                {isHrOrAdmin && (
                  <>
                    <button onClick={() => openEdit(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ color: '#3a7bd5', borderColor: 'rgba(58,123,213,0.3)' }}>
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ color: '#b33a3a', borderColor: 'rgba(179,58,58,0.3)', opacity: deletingId === r.id ? 0.5 : 1 }}>
                      <Trash2 className="size-3" /> {deletingId === r.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Add Record Modal ── */}
      {showAdd && (
        <ModalShell title="Add Equipment Record" onClose={() => { setShowAdd(false); setAddForm(emptyAdd); }}>
          <div className="space-y-4">
            <Field label="Employee *">
              <EmpSelect employees={employees} value={addForm.employee_id} onChange={v => setAddForm(f => ({ ...f, employee_id: v }))} />
            </Field>
            <Field label="Equipment Type *">
              <Sel value={addForm.equipment_type} onChange={v => setAddForm(f => ({ ...f, equipment_type: v }))}>
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </Sel>
            </Field>
            <Field label="Specifications *">
              <textarea value={addForm.specifications} onChange={e => setAddForm(f => ({ ...f, specifications: e.target.value }))}
                placeholder="e.g. Dell Inspiron, 16GB RAM, 512GB SSD" rows={2}
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
            </Field>
            <Field label="Date of Issue">
              <DateInput value={addForm.date_of_issue} max={today} onChange={v => setAddForm(f => ({ ...f, date_of_issue: v }))} />
            </Field>
            <Field label="Device Info (Serial No. / Model)">
              <input value={addForm.device_info} onChange={e => setAddForm(f => ({ ...f, device_info: e.target.value }))}
                placeholder="e.g. SN: ABC123, Model: XPS 15"
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </Field>
            <Field label="Total Value (₹)">
              <input type="number" min="0" value={addForm.total_value} onChange={e => setAddForm(f => ({ ...f, total_value: e.target.value }))}
                placeholder="e.g. 75000"
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowAdd(false); setAddForm(emptyAdd); }}
                className="flex-1 py-2.5 rounded-lg text-sm border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: saving ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
                {saving ? 'Saving…' : 'Add Record'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Edit Record Modal ── */}
      {showEdit && (
        <ModalShell title="Edit Equipment Record" onClose={() => { setShowEdit(false); setEditingId(null); }}>
          <div className="space-y-4">
            <Field label="Equipment Type *">
              <Sel value={editForm.equipment_type} onChange={v => setEditForm(f => ({ ...f, equipment_type: v }))}>
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </Sel>
            </Field>
            <Field label="Specifications *">
              <textarea value={editForm.specifications} onChange={e => setEditForm(f => ({ ...f, specifications: e.target.value }))}
                rows={2} className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
            </Field>
            <Field label="Date of Issue">
              <DateInput value={editForm.date_of_issue} max={today} onChange={v => setEditForm(f => ({ ...f, date_of_issue: v }))} />
            </Field>
            <Field label="Device Info (Serial No. / Model)">
              <input value={editForm.device_info} onChange={e => setEditForm(f => ({ ...f, device_info: e.target.value }))}
                placeholder="e.g. SN: ABC123, Model: XPS 15"
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </Field>
            <Field label="Status *">
              <Sel value={editForm.status} onChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <option value="pending">Requested</option>
                <option value="approved">Approved</option>
                <option value="assigned">Assigned</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
              </Sel>
            </Field>
            <Field label="Total Value (₹)">
              <input type="number" min="0" value={editForm.total_value} onChange={e => setEditForm(f => ({ ...f, total_value: e.target.value }))}
                placeholder="e.g. 75000"
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowEdit(false); setEditingId(null); }}
                className="flex-1 py-2.5 rounded-lg text-sm border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleEdit} disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: saving ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── View Record Modal ── */}
      {showView && viewingRecord && (
        <ModalShell title="Equipment Details" onClose={() => { setShowView(false); setViewingRecord(null); }}>
          <div className="space-y-4">
            <div className="rounded-lg p-4 space-y-1" style={{ background: 'rgba(200,152,94,0.08)', border: '1px solid rgba(200,152,94,0.2)' }}>
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="text-sm font-semibold text-foreground">{viewingRecord.employee?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{viewingRecord.employee?.employee_code} · {viewingRecord.employee?.department}</p>
            </div>
            <ViewRow label="Equipment Type" value={viewingRecord.equipment_type} />
            <ViewRow label="Specifications" value={viewingRecord.specifications} />
            <ViewRow label="Device Info / Serial No." value={viewingRecord.device_info ?? '—'} />
            <ViewRow label="Date of Issue" value={fmtDate(viewingRecord.date_of_issue)} />
            <ViewRow label="Total Value" value={fmtValue(viewingRecord.total_value)} />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Status</p>
              <StatusBadge status={viewingRecord.status} />
            </div>
            <div className="pt-1">
              <button onClick={() => { setShowView(false); setViewingRecord(null); }}
                className="w-full py-2.5 rounded-lg text-sm border text-muted-foreground hover:bg-muted transition-colors">
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Request Equipment Modal (HR only) ── */}
      {showRequest && (
        <ModalShell title="Request Equipment" onClose={() => { setShowRequest(false); setReqForm(emptyReq); }}>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground -mt-2">An email will be sent to the IT team to procure this equipment.</p>
            <Field label="Employee *">
              <EmpSelect employees={employees} value={reqForm.employee_id} onChange={v => setReqForm(f => ({ ...f, employee_id: v }))} />
            </Field>
            <Field label="Equipment Type *">
              <Sel value={reqForm.equipment_type} onChange={v => setReqForm(f => ({ ...f, equipment_type: v }))}>
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </Sel>
            </Field>
            <Field label="Specifications *">
              <textarea value={reqForm.specifications} onChange={e => setReqForm(f => ({ ...f, specifications: e.target.value }))}
                placeholder="e.g. 16GB RAM, i7 processor, Windows 11" rows={2}
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
            </Field>
            <Field label="Urgency">
              <Sel value={reqForm.urgency} onChange={v => setReqForm(f => ({ ...f, urgency: v }))}>
                <option>Low</option><option>Normal</option><option>High</option><option>Critical</option>
              </Sel>
            </Field>
            <Field label="Notes (optional)">
              <input value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional context for IT"
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground" />
            </Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowRequest(false); setReqForm(emptyReq); }}
                className="flex-1 py-2.5 rounded-lg text-sm border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleRequest} disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: saving ? '#ccc' : '#3a7bd5', color: '#fff' }}>
                {saving ? 'Sending…' : 'Send to IT'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ── Small helper components ── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
      <div className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl bg-card text-foreground border max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function EmpSelect({ employees, value, onChange }: { employees: EmpOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
        <option value="">— Select Employee —</option>
        {employees.map(e => (
          <option key={e.id} value={e.id}>{e.name} ({e.employee_code}) · {e.department}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function DateInput({ value, max, onChange }: { value: string; max?: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input type="date" value={value} max={max} onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none" />
      {!value && <span className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none bg-background pr-1">DD/MM/YYYY</span>}
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator{position:absolute;top:0;right:0;width:44px;height:100%;opacity:0;cursor:pointer}`}</style>
    </div>
  );
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground leading-relaxed break-words">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    assigned:  { bg: 'rgba(22,163,74,.12)',   color: '#16a34a', label: 'Assigned' },
    pending:   { bg: 'rgba(230,126,34,.12)',  color: '#e67e22', label: 'Requested' },
    approved:  { bg: 'rgba(46,125,50,.12)',   color: '#2e7d32', label: 'Approved' },
    delivered: { bg: 'rgba(58,123,213,.12)',  color: '#3a7bd5', label: 'Delivered' },
    rejected:  { bg: 'rgba(179,58,58,.12)',   color: '#b33a3a', label: 'Rejected' },
  };
  const s = map[status] ?? map.assigned;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
