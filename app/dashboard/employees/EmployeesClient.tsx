'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface EmpRow {
  id: string; employee_code: string; name: string; department: string;
  designation: string; role: string; email: string; join_date: string;
  is_active: boolean; created_at: string; photo_url: string | null;
}

const roleColors: Record<string, { bg: string; color: string }> = {
  admin: { bg: 'rgba(200,152,94,.12)', color: '#c8985e' },
  hr: { bg: 'rgba(37,99,235,.1)', color: '#2563eb' },
  it: { bg: 'rgba(22,163,74,.1)', color: '#16a34a' },
  employee: { bg: 'rgba(107,114,128,.1)', color: '#6b7280' },
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function EmployeesClient({ employees: initialEmployees, viewerRole }: { employees: EmpRow[]; viewerRole: string }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 8 : 10;

  const isAdmin = viewerRole === 'admin';

  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmpRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Reset to page 1 when screen size changes (mobile ↔ desktop)
  useEffect(() => { setPage(1); }, [isMobile]);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.designation.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const toggleActive = async (emp: EmpRow) => {
    setToggling(emp.id);
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id, is_active: !emp.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployees(employees.map(e => e.id === emp.id ? { ...e, is_active: !emp.is_active } : e));
      toast.success(`${emp.name} ${!emp.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setToggling(null);
    }
  };

  const openDeleteModal = (emp: EmpRow) => {
    setDeleteTarget(emp);
    setDeleteConfirmText('');
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} permanently deleted.`);
      setDeleteTarget(null);
      setDeleteConfirmText('');
    } catch (err: unknown) {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Employee Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold" style={{ color: '#16a34a' }}>{employees.filter(e => e.is_active).length} active</span>
            {' · '}{employees.length} total employees
          </p>
        </div>
        <input
          type="text"
          placeholder="Search by name, code, department..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="px-4 py-2.5 border rounded-xl text-sm bg-background text-foreground w-full sm:w-72"
        />
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f1a2e' }}>
                  {['Employee', 'Department', 'Role', 'Email', 'Join Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap" style={{ opacity: 0.75 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      {search ? 'No employees match your search.' : 'No employees found.'}
                    </td>
                  </tr>
                ) : paginated.map(emp => {
                  const rc = roleColors[emp.role] ?? roleColors.employee;
                  return (
                    <tr key={emp.id} className="hover:bg-muted/40 transition-colors cursor-pointer">
                      <td className="px-4 py-3" onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                        <div className="flex items-center gap-2.5">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt={emp.name} className="size-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #0f1a2e, #1c2d4a)', color: '#c8985e' }}>
                              {getInitials(emp.name)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground text-sm">{emp.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{emp.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                        <div className="text-sm text-foreground">{emp.department}</div>
                        <div className="text-xs text-muted-foreground">{emp.designation}</div>
                      </td>
                      <td className="px-4 py-3" onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                          style={{ background: rc.bg, color: rc.color }}>{emp.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground" onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                        {emp.email}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap" onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                        {new Date(emp.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: emp.is_active ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)',
                            color: emp.is_active ? '#16a34a' : '#dc2626',
                          }}>
                          <span className="size-1.5 rounded-full" style={{ background: emp.is_active ? '#16a34a' : '#dc2626' }} />
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                            className="px-3 py-1 rounded-md text-xs font-semibold"
                            style={{ background: 'rgba(200,152,94,.12)', color: '#c8985e', border: '1px solid rgba(200,152,94,.3)' }}>
                            View
                          </button>
                          <button onClick={() => toggleActive(emp)} disabled={toggling === emp.id}
                            className="px-3 py-1 rounded-md text-xs font-semibold"
                            style={{
                              background: emp.is_active ? 'rgba(220,38,38,.08)' : 'rgba(22,163,74,.08)',
                              color: emp.is_active ? '#dc2626' : '#16a34a',
                              opacity: toggling === emp.id ? 0.6 : 1,
                            }}>
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {isAdmin && (
                            <button onClick={() => openDeleteModal(emp)}
                              className="px-2 py-1 rounded-md text-xs font-semibold"
                              style={{ background: 'rgba(220,38,38,.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}
                              title="Permanently delete employee">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            {search ? 'No employees match your search.' : 'No employees found.'}
          </CardContent></Card>
        ) : paginated.map(emp => {
          const rc = roleColors[emp.role] ?? roleColors.employee;
          return (
            <Card key={emp.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Top row: avatar + name + status */}
                <div className="flex items-center gap-3 mb-3">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.name} className="size-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="size-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0f1a2e, #1c2d4a)', color: '#c8985e' }}>
                      {getInitials(emp.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm leading-tight">{emp.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{emp.employee_code}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{
                      background: emp.is_active ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)',
                      color: emp.is_active ? '#16a34a' : '#dc2626',
                    }}>
                    <span className="size-1.5 rounded-full" style={{ background: emp.is_active ? '#16a34a' : '#dc2626' }} />
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Middle: dept + role */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                    {emp.department} · {emp.designation}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize flex-shrink-0"
                    style={{ background: rc.bg, color: rc.color }}>{emp.role}</span>
                </div>

                {/* Bottom: actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center"
                    style={{ background: 'rgba(200,152,94,.12)', color: '#c8985e', border: '1px solid rgba(200,152,94,.3)' }}>
                    View Profile
                  </button>
                  <button
                    onClick={() => toggleActive(emp)}
                    disabled={toggling === emp.id}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center"
                    style={{
                      background: emp.is_active ? 'rgba(220,38,38,.08)' : 'rgba(22,163,74,.08)',
                      color: emp.is_active ? '#dc2626' : '#16a34a',
                      opacity: toggling === emp.id ? 0.6 : 1,
                    }}>
                    {emp.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => openDeleteModal(emp)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(220,38,38,.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}
                      title="Permanently delete employee">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center size-10 rounded-full flex-shrink-0"
                style={{ background: 'rgba(220,38,38,0.12)' }}>
                <Trash2 className="size-5" style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Permanently Delete Employee</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-5 text-sm"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-foreground">
                This will permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.employee_code}) and all their data —
                documents, leave history, equipment records, and login access.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mb-1.5">
              Type <strong className="text-foreground">{deleteTarget.name}</strong> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget.name}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-background text-foreground mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border text-muted-foreground">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== deleteTarget.name || deleting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{
                  background: deleteConfirmText === deleteTarget.name ? '#dc2626' : 'rgba(220,38,38,0.3)',
                  cursor: deleteConfirmText === deleteTarget.name && !deleting ? 'pointer' : 'not-allowed',
                }}>
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
          {/* Desktop: show count info */}
          <p className="hidden md:block text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-semibold text-foreground">{filtered.length}</span> employees
          </p>

          <div className="flex items-center gap-2 md:ml-auto">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
              style={{
                borderColor: currentPage === 1 ? 'var(--border)' : '#c8985e',
                color: currentPage === 1 ? 'var(--muted-foreground)' : '#c8985e',
                opacity: currentPage === 1 ? 0.4 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}>
              <ChevronLeft className="size-3.5" />
              <span>Prev</span>
            </button>

            <span className="text-xs font-semibold text-muted-foreground px-1">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
              style={{
                borderColor: currentPage === totalPages ? 'var(--border)' : '#c8985e',
                color: currentPage === totalPages ? 'var(--muted-foreground)' : '#c8985e',
                opacity: currentPage === totalPages ? 0.4 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}>
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
