'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Paperclip, FolderOpen, Pencil, ChevronDown, ExternalLink, Monitor, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Employee, EmployeeDocument, EquipmentRequest } from '@/types';

interface Props {
  employee: Employee;
  documents: EmployeeDocument[];
  equipment?: EquipmentRequest[];
  canEdit: boolean;
  isOwnProfile: boolean;
  viewerRole: string;
}

const DOCUMENT_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Passport', '10th Marksheet', '12th Marksheet',
  'Degree Certificate', 'Previous Offer Letter', 'Experience / Relieving Letter',
  'Salary Slip – Month 1', 'Salary Slip – Month 2', 'Salary Slip – Month 3',
  'Bank Details / Cancelled Cheque', 'Address Proof', 'Appointment Letter', 'Other',
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const roleColor: Record<string, string> = { admin: '#c8985e', hr: '#2563eb', it: '#16a34a', employee: '#6b7280' };
const roleLabel: Record<string, string> = { admin: 'Administrator', hr: 'HR Manager', it: 'IT Staff', employee: 'Employee' };

export default function ProfileClient({ employee: initialEmployee, documents: initialDocs, equipment = [], canEdit, isOwnProfile, viewerRole }: Props) {
  const router = useRouter();
  const isAdmin = viewerRole === 'admin';
  const isPrivileged = viewerRole === 'admin' || viewerRole === 'hr';

  const [employee, setEmployee] = useState(initialEmployee);
  const [documents, setDocuments] = useState(initialDocs);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [docLabel, setDocLabel] = useState('');
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Editable by all with access
    phone: employee.phone ?? '',
    personal_email: employee.personal_email ?? '',
    current_address: employee.current_address ?? '',
    emergency_contact_name: employee.emergency_contact_name ?? '',
    emergency_contact_phone: employee.emergency_contact_phone ?? '',
    // Admin-only fields
    name: employee.name ?? '',
    dob: employee.dob ?? '',
    email: employee.email ?? '',
    reporting_manager_email: employee.reporting_manager_email ?? '',
    employee_code: employee.employee_code ?? '',
    designation: employee.designation ?? '',
    department: employee.department ?? '',
    role: employee.role ?? 'employee',
    join_date: employee.join_date ?? '',
    is_active: employee.is_active,
  });

  const set = (key: string) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    setEditing(false);
    setForm({
      phone: employee.phone ?? '',
      personal_email: employee.personal_email ?? '',
      current_address: employee.current_address ?? '',
      emergency_contact_name: employee.emergency_contact_name ?? '',
      emergency_contact_phone: employee.emergency_contact_phone ?? '',
      name: employee.name ?? '',
      dob: employee.dob ?? '',
      email: employee.email ?? '',
      reporting_manager_email: employee.reporting_manager_email ?? '',
      employee_code: employee.employee_code ?? '',
      designation: employee.designation ?? '',
      department: employee.department ?? '',
      role: employee.role ?? 'employee',
      join_date: employee.join_date ?? '',
      is_active: employee.is_active,
    });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 500 * 1024) {
      toast.error('Photo too large', {
        description: (
          <span>
            Your photo is {(file.size / 1024).toFixed(0)}KB. Max allowed is 500KB.{' '}
            <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer"
              style={{ color: '#c8985e', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              Compress it free at squoosh.app <ExternalLink size={11} />
            </a>
          </span>
        ) as unknown as string,
      });
      return;
    }
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('employee_id', employee.id);
      const res = await fetch('/api/profile/photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployee(prev => ({ ...prev, photo_url: data.photo_url }));
      toast.success('Profile photo updated!');
      router.refresh();
    } catch (err: unknown) {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : 'Try again.' });
    } finally { setUploadingPhoto(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployee(prev => ({ ...prev, ...form }));
      setEditing(false);
      toast.success('Profile updated successfully.');
      router.refresh();
    } catch (err: unknown) {
      toast.error('Save failed', { description: err instanceof Error ? err.message : 'Try again.' });
    } finally { setSaving(false); }
  };

  const handleDocUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: `Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed is 5MB. Please compress or reduce the file size.` });
      return;
    }
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('employee_id', employee.id);
      fd.append('document_type', docType);
      fd.append('document_label', docLabel || docType);
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocuments(prev => [data.document, ...prev]);
      setShowDocUpload(false);
      setDocLabel('');
      toast.success('Document uploaded successfully.');
    } catch (err: unknown) {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : 'Try again.' });
    } finally { setUploadingDoc(false); }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted.');
    } catch (err: unknown) {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : 'Try again.' });
    } finally { setDeletingId(null); }
  };

  const editButtons = (
    <div className="flex gap-2">
      <button onClick={handleCancel} className="text-xs px-3 py-1.5 rounded-lg border text-muted-foreground">Cancel</button>
      <button onClick={handleSave} disabled={saving}
        className="text-xs font-bold px-3 py-1.5 rounded-lg"
        style={{ background: '#c8985e', color: '#0f1a2e' }}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-heading text-2xl">{isOwnProfile ? 'My Profile' : `${employee.name}'s Profile`}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwnProfile ? 'View and manage your personal information' : 'Full employee profile and documents'}
          </p>
        </div>
        {/* Admin edit / save buttons at top level */}
        {(isOwnProfile || canEdit) && !editing && (
          <button onClick={() => setEditing(true)}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e', border: '1px solid rgba(200,152,94,0.25)' }}>
            <Pencil className="inline size-3.5 mr-1.5" />Edit Profile
          </button>
        )}
        {editing && editButtons}
      </div>

      {isPrivileged && editing && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(200,152,94,0.08)', border: '1px solid rgba(200,152,94,0.25)', color: '#c8985e' }}>
          {isAdmin ? 'Admin' : 'HR'} mode — all fields are editable
        </div>
      )}

      <div className="grid gap-5 profile-grid" style={{ gridTemplateColumns: '320px 1fr', alignItems: 'start' }}>

        {/* Left Column */}
        <div className="flex flex-col gap-4">

          {/* Profile Card */}
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="relative inline-block mb-4">
                <Avatar className="h-24 w-24 mx-auto border-2" style={{ borderColor: '#c8985e' }}>
                  {employee.photo_url && <AvatarImage src={employee.photo_url} alt={employee.name} className="object-cover object-top" />}
                  <AvatarFallback className="text-2xl font-bold"
                    style={{ background: 'linear-gradient(135deg, #0f1a2e, #1c2d4a)', color: '#c8985e' }}>
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                {(isOwnProfile || canEdit) && (
                  <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 flex items-center justify-center rounded-full border-2 border-background"
                    style={{ width: 30, height: 30, background: '#c8985e', cursor: 'pointer' }}>
                    {uploadingPhoto ? <span className="text-xs">…</span> : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0f1a2e" strokeWidth="2.5">
                        <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    )}
                  </button>
                )}
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
              </div>

              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>{employee.name}</h2>
              <p className="text-sm text-muted-foreground mb-3">{employee.designation}</p>
              <span className="text-xs font-bold uppercase px-3 py-1 rounded-full tracking-wide"
                style={{ background: `${roleColor[employee.role]}15`, color: roleColor[employee.role] }}>
                {roleLabel[employee.role] ?? employee.role}
              </span>

              <div className="mt-5 pt-5 border-t space-y-2.5 text-left">
                <Row label="Employee Code" value={<span style={{ fontFamily: 'var(--font-geist-mono), monospace', color: '#c8985e', fontWeight: 600 }}>{employee.employee_code}</span>} />
                <Row label="Department" value={employee.department} />
                <Row label="Joined" value={fmt(employee.join_date)} />
                <Row label="Status" value={<span style={{ color: employee.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>● {employee.is_active ? 'Active' : 'Inactive'}</span>} />
              </div>
            </CardContent>
          </Card>

          {/* Leave Balance — hidden for Admin */}
          {employee.role !== 'admin' && (
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Leave Balance</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#2563eb' }}>{employee.leave_balance_earned}</div>
                    <div className="text-xs text-muted-foreground mt-1">Earned</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(234,88,12,0.1)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#ea580c' }}>{employee.leave_balance_sick}</div>
                    <div className="text-xs text-muted-foreground mt-1">Sick</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-0">
              <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Personal Information</h3>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 gap-4 detail-grid">
                <InfoField label="Full Name" value={employee.name}
                  editing={isPrivileged && editing} editValue={form.name} onEdit={set('name')} placeholder="Full Name" />
                <InfoField label="Date of Birth" value={fmt(employee.dob)}
                  editing={isPrivileged && editing} editValue={form.dob} onEdit={set('dob')} type="date" />
                <InfoField label="Work Email" value={employee.email}
                  editing={isPrivileged && editing} editValue={form.email} onEdit={set('email')} type="email" placeholder="work@aadhcode.com" />
                <InfoField label="Phone Number" value={employee.phone}
                  editing={editing} editValue={form.phone} onEdit={set('phone')} placeholder="+91 98765 43210" />
                <InfoField label="Personal Email" value={employee.personal_email}
                  editing={editing} editValue={form.personal_email} onEdit={set('personal_email')} placeholder="personal@email.com" type="email" />
                <InfoField label="Reporting Manager" value={employee.reporting_manager_email ?? '—'}
                  editing={isPrivileged && editing} editValue={form.reporting_manager_email} onEdit={set('reporting_manager_email')} type="email" placeholder="manager@aadhcode.com" />
                <InfoField label="Emergency Contact" value={employee.emergency_contact_name}
                  editing={editing} editValue={form.emergency_contact_name} onEdit={set('emergency_contact_name')} placeholder="Name" />
                <InfoField label="Emergency Phone" value={employee.emergency_contact_phone}
                  editing={editing} editValue={form.emergency_contact_phone} onEdit={set('emergency_contact_phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="mt-4">
                <InfoField label="Current Address" value={employee.current_address}
                  editing={editing} editValue={form.current_address} onEdit={set('current_address')} placeholder="House/Flat No., Street, City, State, PIN" textarea />
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Employment Information</h3>
                {isPrivileged && editing && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>{isAdmin ? 'Admin' : 'HR'} editable</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 gap-4 detail-grid">
                <InfoField label="Employee Code" value={employee.employee_code} mono
                  editing={isPrivileged && editing} editValue={form.employee_code} onEdit={v => set('employee_code')(v.toUpperCase())} placeholder="AC001" />
                <InfoField label="Designation" value={employee.designation}
                  editing={isPrivileged && editing} editValue={form.designation} onEdit={set('designation')} placeholder="Software Engineer" />
                <InfoField label="Department" value={employee.department}
                  editing={isPrivileged && editing} editValue={form.department} onEdit={set('department')} placeholder="Engineering" />
                <InfoField label="Role / Access" value={roleLabel[employee.role] ?? employee.role}
                  editing={isPrivileged && editing} editValue={form.role} onEdit={set('role')}
                  options={[
                    { value: 'admin', label: 'Administrator' },
                    { value: 'hr', label: 'HR Manager' },
                    { value: 'it', label: 'IT Staff' },
                    { value: 'employee', label: 'Employee' },
                  ]} />
                <InfoField label="Date of Joining" value={fmt(employee.join_date)}
                  editing={isPrivileged && editing} editValue={form.join_date} onEdit={set('join_date')} type="date" />
                <InfoField label="Employment Status"
                  value={employee.is_active ? 'Active' : 'Inactive'}
                  valueColor={employee.is_active ? '#16a34a' : '#dc2626'}
                  editing={isPrivileged && editing}
                  editValue={String(form.is_active)}
                  onEdit={v => setForm(f => ({ ...f, is_active: v === 'true' }))}
                  options={[
                    { value: 'true', label: '● Active' },
                    { value: 'false', label: '● Inactive' },
                  ]} />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Documents</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded</p>
                </div>
                {canEdit && (
                  <button onClick={() => setShowDocUpload(v => !v)}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white"
                    style={{ background: '#0f1a2e' }}>
                    + Upload Document
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {showDocUpload && (
                <div className="rounded-xl border p-4 mb-4 bg-muted/40">
                  <div className="grid grid-cols-2 gap-3 mb-3 detail-grid">
                  <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Document Type</label>
                      <div className="relative">
                        <select value={docType} onChange={e => setDocType(e.target.value)}
                          className="w-full pl-3 pr-9 py-2 rounded-lg border text-sm bg-background text-foreground appearance-none cursor-pointer">
                          {DOCUMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      </div>
                    </div>
                    {docType === 'Other' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Custom Label <span className="text-muted-foreground/60 normal-case font-normal">(required for Other)</span></label>
                      <input value={docLabel} onChange={e => setDocLabel(e.target.value)} placeholder="e.g. Marriage Certificate"
                        className="w-full px-3 py-2 rounded-lg border text-sm bg-background text-foreground" />
                    </div>
                    )}
                  </div>
                  <button onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg"
                    style={{ background: uploadingDoc ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
                    {uploadingDoc ? 'Uploading…' : <><Paperclip className="size-3.5" /> Select &amp; Upload File</>}
                  </button>
                  <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }} />
                  <p className="text-xs text-muted-foreground mt-2">Accepted: PDF, JPG, PNG, DOC, DOCX · Max 5MB</p>
                </div>
              )}

              {documents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <FolderOpen className="size-10 mx-auto mb-2 opacity-40" />
                  No documents uploaded yet.
                  {canEdit && <div className="mt-1">Click &quot;Upload Document&quot; to add files.</div>}
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                      <div className="flex-shrink-0 flex items-center justify-center rounded-lg size-9"
                        style={{ background: 'rgba(200,152,94,0.1)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8985e" strokeWidth="1.8">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{doc.document_label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {doc.document_type} · {doc.file_name}{doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''} · {new Date(doc.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={async () => {
                            setViewingDocId(doc.id);
                            try {
                              const res = await fetch(`/api/documents/${doc.id}/view`);
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error);
                              window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
                            } catch (err: unknown) {
                              toast.error('Could not open document', { description: err instanceof Error ? err.message : 'Try again.' });
                            } finally {
                              setViewingDocId(null);
                            }
                          }}
                          disabled={viewingDocId === doc.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: '#eff6ff', color: '#2563eb', opacity: viewingDocId === doc.id ? 0.6 : 1 }}>
                          {viewingDocId === doc.id ? '…' : 'View'}
                        </button>
                        {canEdit && (
                          <button onClick={() => handleDeleteDoc(doc.id)} disabled={deletingId === doc.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                            style={{ background: '#fef2f2', color: '#dc2626' }}>
                            {deletingId === doc.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader className="pb-0">
              <h3 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Equipment Assigned</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Hardware and software provided by the company</p>
            </CardHeader>
            <CardContent className="pt-4">
              {equipment.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl bg-muted/20">
                  <Monitor className="size-8 mx-auto mb-2 opacity-40" />
                  No equipment taken.
                </div>
              ) : (
                <div className="space-y-2">
                  {equipment.map(eq => (
                    <div key={eq.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                      <div className="flex-shrink-0 flex items-center justify-center rounded-lg size-9"
                        style={{ background: 'rgba(22,163,74,0.1)' }}>
                        <Monitor className="size-5" style={{ color: '#16a34a' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{eq.equipment_type}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {eq.specifications}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full tracking-wide"
                          style={{
                            background: eq.status === 'approved' ? 'rgba(22,163,74,0.1)' : eq.status === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(234,88,12,0.1)',
                            color: eq.status === 'approved' ? '#16a34a' : eq.status === 'rejected' ? '#dc2626' : '#ea580c'
                          }}>
                          {eq.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function InfoField({ label, value, editing, editValue, onEdit, placeholder, textarea, mono, type, valueColor, options }: {
  label: string; value?: string | null; editing?: boolean; editValue?: string;
  onEdit?: (v: string) => void; placeholder?: string; textarea?: boolean;
  mono?: boolean; type?: string; valueColor?: string;
  options?: { value: string; label: string }[];
}) {
  if (editing && onEdit !== undefined) {
    return (
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</label>
        {options ? (
          <div className="relative">
            <select value={editValue} onChange={e => onEdit(e.target.value)}
              className="w-full pl-3 pr-9 py-2 border rounded-lg text-sm bg-background text-foreground appearance-none cursor-pointer">
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        ) : textarea ? (
          <textarea value={editValue} onChange={e => onEdit(e.target.value)} placeholder={placeholder} rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground resize-vertical" />
        ) : type === 'date' ? (
          <div className="relative">
            <input type="date" value={editValue} onChange={e => onEdit(e.target.value)}
              className="w-full pl-3 pr-9 py-2 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none"
              style={{ color: editValue ? 'inherit' : 'transparent', WebkitAppearance: 'none' }}
            />
            {!editValue && (
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
        ) : (
          <input type={type ?? 'text'} value={editValue} onChange={e => onEdit(e.target.value)} placeholder={placeholder}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground" />
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="text-sm" style={{
        color: valueColor ?? undefined,
        fontFamily: mono ? 'var(--font-geist-mono), monospace' : undefined,
        fontWeight: mono ? 600 : undefined,
      }}>
        <span className={valueColor ? '' : 'text-foreground'}>{value || '—'}</span>
      </div>
    </div>
  );
}
