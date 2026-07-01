'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, ExternalLink, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Policy, Employee } from '@/types';

const CATEGORIES = ['Onboarding', 'Recruitment', 'Leave', 'WFH', 'Handbook', 'Security', 'Conduct', 'Holiday Calendar', 'General'];

const categoryColors: Record<string, string> = {
  Onboarding: '#3a7bd5', Recruitment: '#2e7d32', Leave: '#e67e22',
  WFH: '#c8985e', Handbook: '#0f1a2e', Security: '#b33a3a', Conduct: '#b33a3a', 'Holiday Calendar': '#7c3aed', General: '#7c6f5e',
};

interface Props {
  policies: Policy[];
  employee: Employee;
}

export default function PoliciesClient({ policies: initialPolicies, employee }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const isHrOrAdmin = employee.role === 'admin' || employee.role === 'hr';

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Onboarding', file_url: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAdd = () => {
    setForm({ name: '', category: 'Onboarding', file_url: '' });
    setModalMode('add');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: Policy) => {
    setForm({ name: p.name, category: p.category, file_url: p.file_url ?? '' });
    setModalMode('edit');
    setEditingId(p.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.file_url.trim()) {
      toast.error('Missing Fields', { description: 'Policy name and link are required.' });
      return;
    }
    setSaving(true);
    try {
      const url = modalMode === 'add' ? '/api/policies' : `/api/policies/${editingId}`;
      const method = modalMode === 'add' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (modalMode === 'add') {
        setPolicies(prev => [...prev, data.policy]);
        toast.success('Policy Added', { description: `"${form.name}" added to the library.` });
      } else {
        setPolicies(prev => prev.map(p => p.id === editingId ? data.policy : p));
        toast.success('Policy Updated', { description: `"${form.name}" has been updated.` });
      }
      closeModal();
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Policy) => {
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/policies/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPolicies(prev => prev.filter(pol => pol.id !== p.id));
      toast.success('Policy Deleted', { description: `"${p.name}" has been removed.` });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCardClick = (policy: Policy) => {
    if (policy.file_url) {
      window.open(policy.file_url, '_blank');
    } else {
      toast.info('No Link Attached', { description: `"${policy.name}" has no link yet.` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Policy Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Access all company policies and documents</p>
        </div>
        {isHrOrAdmin && (
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: '#c8985e', color: '#0f1a2e' }}>
            + Add Policy
          </button>
        )}
      </div>

      {policies.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No policies added yet.{isHrOrAdmin ? ' Click "Add Policy" to get started.' : ''}
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {policies.map(p => {
          const catColor = categoryColors[p.category] ?? '#0f1a2e';
          return (
            <Card key={p.id} className="transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#c8985e]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => handleCardClick(p)}>
                  <div className="flex-shrink-0 flex items-center justify-center rounded-lg size-9"
                    style={{ background: 'rgba(200,152,94,0.12)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8985e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1.5"
                      style={{ background: `${catColor}18`, color: catColor }}>
                      {p.category}
                    </span>
                    <h4 className="text-sm font-semibold text-foreground leading-snug">{p.name}</h4>
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#c8985e' }}>
                      <ExternalLink className="size-3 flex-shrink-0" />
                      Click to open
                    </p>
                  </div>
                </div>

                {isHrOrAdmin && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(p); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors hover:bg-muted"
                      style={{ color: '#3a7bd5', borderColor: 'rgba(58,123,213,0.3)' }}>
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p); }}
                      disabled={deletingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors hover:bg-muted"
                      style={{ color: '#b33a3a', borderColor: 'rgba(179,58,58,0.3)', opacity: deletingId === p.id ? 0.5 : 1 }}>
                      <Trash2 className="size-3" /> {deletingId === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl bg-card text-foreground border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                {modalMode === 'add' ? 'Add Policy' : 'Edit Policy'}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Policy Name *</label>
                <input type="text" value={form.name} onChange={set('name')}
                  placeholder="e.g. Leave Policy 2024"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground outline-none focus:border-[#c8985e]" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Category *</label>
                <div className="relative">
                  <select value={form.category} onChange={set('category')}
                    className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none outline-none focus:border-[#c8985e]">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Google Drive Link *</label>
                <input type="url" value={form.file_url} onChange={set('file_url')}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground outline-none focus:border-[#c8985e]" />
                <p className="text-xs text-muted-foreground mt-1">Paste the shareable Google Drive link for this policy.</p>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-lg font-semibold text-sm mt-2"
                style={{ background: saving ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
                {saving ? 'Saving…' : modalMode === 'add' ? 'Add Policy' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
