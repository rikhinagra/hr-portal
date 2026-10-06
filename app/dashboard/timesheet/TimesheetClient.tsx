'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, ExternalLink, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { WORK_TYPES } from '@/types';
import type { Employee, TimesheetEntry, WorkType } from '@/types';
import Dropdown from './Dropdown';
import { useIsMobile } from '@/hooks/use-mobile';

type EntryWithEmployee = TimesheetEntry & {
  employee: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'email' | 'reporting_manager_email'> | null;
};

interface TimesheetClientProps {
  employee: Employee;
  initialEntries: EntryWithEmployee[];
}

type DraftRow = {
  key: string;
  date: string;
  project: string;
  task: string;
  hours: string;
  workType: WorkType;
  ticket: string;
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmtDay = (s: string) =>
  parseISO(s).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const fmtHours = (n: number) => `${Number(n.toFixed(2))}h`;

const cellInput =
  'w-full bg-background xl:bg-transparent px-2.5 py-2 text-sm text-foreground outline-none border rounded-lg xl:border-0 xl:rounded-none ' +
  'placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-[#c8985e]/70 xl:focus:ring-inset xl:focus:bg-muted/40';

const WORK_TYPE_OPTIONS = WORK_TYPES.map(wt => ({ value: wt, label: wt }));
const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];
const filterTrigger = 'rounded-lg border bg-background px-3 py-2';

const GRID_COLS = 'xl:grid-cols-[132px_minmax(140px,1fr)_minmax(200px,2fr)_84px_170px_minmax(130px,1fr)_40px]';

export default function TimesheetClient({ employee, initialEntries }: TimesheetClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [today, setToday] = useState('');

  const keyRef = useRef(0);
  const nextKey = () => String(++keyRef.current);
  const blankRow = (date = '', workType: WorkType = WORK_TYPES[0]): DraftRow => ({
    key: nextKey(), date, project: '', task: '', hours: '', workType, ticket: '',
  });

  const [showEntry, setShowEntry] = useState(true);
  const [rows, setRows] = useState<DraftRow[]>(() => [blankRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [workFilter, setWorkFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 8 : 10;
  const listTopRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<'all' | 'week' | 'month'>('all');

  const gridRef = useRef<HTMLDivElement>(null);

  const isHr = employee.role === 'hr';
  const isManager = employee.role === 'manager';
  const canManage = isHr || isManager;

  useEffect(() => {
    const t = toISO(new Date());
    setToday(t);
    setRows(prev => prev.map(r => (r.date ? r : { ...r, date: t })));
  }, []);

  // ---------- Entry grid ----------
  const updateRow = (key: string, patch: Partial<DraftRow>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => {
    const last = rows[rows.length - 1];
    const row = blankRow(last?.date || today, last?.workType ?? WORK_TYPES[0]);
    setRows(prev => [...prev, row]);
    setTimeout(() => {
      gridRef.current?.querySelector<HTMLInputElement>(`[data-row="${row.key}"][data-col="project"]`)?.focus();
    }, 30);
  };

  const removeRow = (key: string) => setRows(prev => (prev.length === 1 ? prev : prev.filter(r => r.key !== key)));

  const resetGrid = (date: string) => setRows([blankRow(date)]);

  const isBlank = (r: DraftRow) => !r.project.trim() && !r.task.trim() && !r.hours && !r.ticket.trim();
  const filledRows = rows.filter(r => !isBlank(r));
  const draftTotal = filledRows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);

  const submitEntries = async () => {
    if (filledRows.length === 0) {
      toast.error('Nothing to submit', { description: 'Fill in at least one task row.' }); return;
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isBlank(r)) continue;
      const label = `Row ${i + 1}`;
      const h = Number(r.hours);
      if (!r.date || !r.project.trim() || !r.task.trim() || !r.hours) {
        toast.error('Missing fields', { description: `${label}: date, project, task and hours are required.` }); return;
      }
      if (isNaN(h) || h <= 0 || h > 24) {
        toast.error('Invalid duration', { description: `${label}: hours must be between 0 and 24.` }); return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/timesheet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: filledRows.map(r => ({
            date: r.date, project_client: r.project, task_activity: r.task,
            duration_hours: Number(r.hours), ticket_link: r.ticket, work_type: r.workType,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries(prev => [...(data.entries as EntryWithEmployee[]), ...prev]);
      resetGrid(filledRows[filledRows.length - 1].date);
      toast.success(
        data.entries.length === 1 ? 'Entry submitted' : `${data.entries.length} entries submitted`,
        { description: 'Sent to your reporting manager for approval.' },
      );
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSubmitting(false); }
  };

  // ---------- Actions on entries ----------
  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`/api/timesheet/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error('Already actioned', { description: `${data.error} Please refresh the page.` });
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setEntries(prev => prev.map(e => (e.id === id ? { ...e, status: action } : e)));
      toast.success(`Entry ${action === 'approved' ? 'approved' : 'rejected'}`);
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setActionLoading(null); }
  };

  const approveDay = async (date: string, items: EntryWithEmployee[]) => {
    const targets = items.filter(e => e.status === 'pending' && e.employee_id !== employee.id);
    if (targets.length === 0) return;
    setActionLoading('day-' + date);
    const done = new Set<string>();
    for (const t of targets) {
      try {
        const res = await fetch(`/api/timesheet/${t.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        });
        if (res.ok) done.add(t.id);
      } catch { /* leave as pending */ }
    }
    setEntries(prev => prev.map(e => (done.has(e.id) ? { ...e, status: 'approved' } : e)));
    if (done.size === targets.length) toast.success(`${done.size} ${done.size === 1 ? 'entry' : 'entries'} approved`);
    else toast.error('Some entries could not be approved', { description: `${done.size} of ${targets.length} approved. Refresh and retry.` });
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id + 'delete');
    try {
      const res = await fetch(`/api/timesheet/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('Entry deleted');
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setActionLoading(null); }
  };

  // ---------- Derived data ----------
  const pendingForMe = canManage
    ? entries.filter(e => e.status === 'pending' && e.employee_id !== employee.id).length
    : entries.filter(e => e.status === 'pending').length;

  const week = useMemo(() => {
    if (!today) return null;
    const t = parseISO(today);
    const offset = (t.getDay() + 6) % 7;
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - offset + i);
      return { iso: toISO(d), label: d.toLocaleDateString('en-IN', { weekday: 'short' }), num: d.getDate() };
    });
    // Pending and approved entries count as logged; rejected ones do not.
    // Approved hours are tracked separately so the header can show both.
    const hoursByDay = new Map<string, number>();
    const approvedByDay = new Map<string, number>();
    for (const e of entries) {
      if (e.employee_id !== employee.id || e.status === 'rejected') continue;
      const h = Number(e.duration_hours);
      hoursByDay.set(e.date, (hoursByDay.get(e.date) ?? 0) + h);
      if (e.status === 'approved') approvedByDay.set(e.date, (approvedByDay.get(e.date) ?? 0) + h);
    }
    const total = days.reduce((s, d) => s + (hoursByDay.get(d.iso) ?? 0), 0);
    const approved = days.reduce((s, d) => s + (approvedByDay.get(d.iso) ?? 0), 0);
    return { days, hoursByDay, total, approved };
  }, [today, entries, employee.id]);

  const projectSuggestions = useMemo(
    () => Array.from(new Set(entries.filter(e => e.employee_id === employee.id).map(e => e.project_client))).sort(),
    [entries, employee.id],
  );

  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) if (e.employee) map.set(e.employee.id, e.employee.name);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const rangeStart = useMemo(() => {
    if (!today) return null;
    if (range === 'month') return today.slice(0, 7) + '-01';
    if (range === 'week' && week) return week.days[0].iso;
    return null;
  }, [range, today, week]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(e =>
      (!rangeStart || e.date >= rangeStart) &&
      (workFilter === 'all' || e.work_type === workFilter) &&
      (personFilter === 'all' || e.employee_id === personFilter) &&
      (!q || e.project_client.toLowerCase().includes(q) || e.task_activity.toLowerCase().includes(q)),
    );
  }, [entries, rangeStart, workFilter, personFilter, search]);

  const counts = useMemo(() => ({
    all: baseFiltered.length,
    pending: baseFiltered.filter(e => e.status === 'pending').length,
    approved: baseFiltered.filter(e => e.status === 'approved').length,
    rejected: baseFiltered.filter(e => e.status === 'rejected').length,
  }), [baseFiltered]);

  const visibleEntries = useMemo(
    () => baseFiltered
      .filter(e => statusFilter === 'all' || e.status === statusFilter)
      .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date))),
    [baseFiltered, statusFilter],
  );

  const totalEntries = visibleEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(currentPage * pageSize, totalEntries);

  // Pages are counted by entries. A day can continue onto the next page, so the day
  // header always shows the full day's totals (not just the rows on this page).
  const groups = useMemo(() => {
    const dayAll = new Map<string, EntryWithEmployee[]>();
    for (const e of visibleEntries) dayAll.set(e.date, [...(dayAll.get(e.date) ?? []), e]);
    const onPage = new Map<string, EntryWithEmployee[]>();
    for (const e of visibleEntries.slice(pageStart, pageStart + pageSize)) onPage.set(e.date, [...(onPage.get(e.date) ?? []), e]);
    return Array.from(onPage, ([date, items]) => {
      const all = dayAll.get(date) ?? items;
      return {
        date,
        items,
        all,
        hours: all.reduce((sum, e) => sum + Number(e.duration_hours), 0),
        reviewable: all.filter(e => e.status === 'pending' && e.employee_id !== employee.id).length,
      };
    });
  }, [visibleEntries, pageStart, pageSize, employee.id]);

  useEffect(() => { setPage(1); }, [statusFilter, search, workFilter, personFilter, range, pageSize]);

  const goToPage = (n: number) => {
    setPage(Math.min(Math.max(1, n), totalPages));
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filtersActive = statusFilter !== 'all' || search.trim() !== '' || workFilter !== 'all' || personFilter !== 'all' || range !== 'all';
  const clearFilters = () => { setStatusFilter('all'); setSearch(''); setWorkFilter('all'); setPersonFilter('all'); setRange('all'); };

  const renderActions = (e: EntryWithEmployee, mobile = false) => {
    if (e.status !== 'pending') return null;
    const canReview = canManage && e.employee_id !== employee.id;
    const canDelete = isHr || e.employee_id === employee.id;
    if (!canReview && !canDelete) return null;
    return (
      <div className={mobile ? 'flex gap-2 pt-3 mt-3 border-t border-border' : 'flex items-center justify-end gap-1.5'}>
        {canReview && (
          <>
            <button onClick={() => handleAction(e.id, 'approved')} disabled={actionLoading !== null}
              className={`rounded-md text-xs font-semibold text-white ${mobile ? 'flex-1 py-2' : 'px-2.5 py-1'}`}
              style={{ background: '#2e7d32', opacity: actionLoading !== null ? 0.6 : 1 }}>
              {actionLoading === e.id + 'approved' ? '…' : 'Approve'}
            </button>
            <button onClick={() => handleAction(e.id, 'rejected')} disabled={actionLoading !== null}
              className={`rounded-md text-xs font-semibold text-white ${mobile ? 'flex-1 py-2' : 'px-2.5 py-1'}`}
              style={{ background: '#b33a3a', opacity: actionLoading !== null ? 0.6 : 1 }}>
              {actionLoading === e.id + 'rejected' ? '…' : 'Reject'}
            </button>
          </>
        )}
        {canDelete && (
          <button onClick={() => handleDelete(e.id)} disabled={actionLoading !== null} title="Delete entry"
            className={`rounded-md text-muted-foreground hover:text-destructive border ${mobile ? 'px-3 py-2 text-xs font-semibold' : 'p-1.5'}`}>
            {actionLoading === e.id + 'delete' ? '…' : mobile ? 'Delete' : <Trash2 className="size-3.5" />}
          </button>
        )}
      </div>
    );
  };

  const taskCell = (e: EntryWithEmployee) => (
    <>
      <span style={{ wordBreak: 'break-word' }}>{e.task_activity}</span>
      {e.ticket_link && (
        <a href={e.ticket_link} target="_blank" rel="noopener noreferrer"
          className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: '#c8985e' }}>
          Ticket <ExternalLink className="size-3" />
        </a>
      )}
    </>
  );

  const colCount = canManage ? 7 : 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-heading text-2xl">Timesheet</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'rgba(230,126,34,.12)', color: '#e67e22' }}>
              <span className="size-1.5 rounded-full" style={{ background: '#e67e22' }} />
              {pendingForMe} {canManage ? 'to review' : 'pending'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Log everything you worked on, across any number of projects, in one go</p>
        </div>
      </div>

      {/* Week at a glance */}
      {week && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</div>
              <div className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground text-base">{fmtHours(week.total)}</span> logged
                <span className="mx-1.5">·</span>
                <span className="font-semibold" style={{ color: '#2e7d32' }}>{fmtHours(week.approved)}</span> approved
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {week.days.map(d => {
                const h = week.hoursByDay.get(d.iso) ?? 0;
                const isToday = d.iso === today;
                return (
                  <div key={d.iso} className="rounded-lg border px-1 py-2 text-center"
                    style={{
                      borderColor: isToday ? '#c8985e' : undefined,
                      background: h > 0 ? 'rgba(200,152,94,0.10)' : undefined,
                    }}>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">{d.label}</div>
                    <div className="text-[11px] text-muted-foreground">{d.num}</div>
                    <div className={`mt-1 text-xs sm:text-sm font-bold ${h > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {h > 0 ? fmtHours(h) : '–'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry grid */}
      <Card>
        <CardContent className="p-0">
          <button onClick={() => setShowEntry(s => !s)}
            className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left">
            <div>
              <div className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>Log your time</div>
              <div className="text-xs text-muted-foreground mt-0.5">One row per task. Add as many rows as you need, then submit them together.</div>
            </div>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${showEntry ? 'rotate-180' : ''}`} />
          </button>

          {showEntry && (
            <div className="border-t px-3 sm:px-5 py-4 space-y-3">
              <datalist id="ts-projects">
                {projectSuggestions.map(p => <option key={p} value={p} />)}
              </datalist>

              <div ref={gridRef}>
                {/* Column headers (spreadsheet layout, wide screens) */}
                <div className={`hidden xl:grid ${GRID_COLS} text-[11px] font-semibold uppercase tracking-wide text-white rounded-t-lg`}
                  style={{ background: '#0f1a2e' }}>
                  {['Date', 'Project / Client', 'Task / Activity', 'Hours', 'Work Type', 'Ticket link', ''].map((h, i) => (
                    <div key={i} className="px-2.5 py-2.5">{h}</div>
                  ))}
                </div>

                <div className="space-y-2.5 xl:space-y-0 xl:border xl:border-t-0 xl:rounded-b-lg xl:overflow-hidden">
                  {rows.map((r, idx) => (
                    <div key={r.key}
                      className={`grid grid-cols-2 max-[400px]:grid-cols-1 gap-2 rounded-xl border p-3 xl:p-0 xl:gap-0 xl:rounded-none xl:border-0 xl:items-stretch ${GRID_COLS} xl:divide-x xl:divide-border ${idx > 0 ? 'xl:border-t' : ''}`}>
                      <label className="block">
                        <span className="xl:hidden mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
                        <input type="date" value={r.date} max={today || undefined}
                          onChange={e => updateRow(r.key, { date: e.target.value })}
                          className={cellInput} />
                      </label>
                      <label className="block">
                        <span className="xl:hidden mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Project / Client</span>
                        <input type="text" list="ts-projects" value={r.project} placeholder="Project or client"
                          data-row={r.key} data-col="project"
                          onChange={e => updateRow(r.key, { project: e.target.value })}
                          className={cellInput} />
                      </label>
                      <label className="block col-span-2 max-[400px]:col-span-1 xl:col-span-1">
                        <span className="xl:hidden mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Task / Activity</span>
                        <input type="text" value={r.task} placeholder="What did you work on?"
                          onChange={e => updateRow(r.key, { task: e.target.value })}
                          className={cellInput} />
                      </label>
                      <label className="block">
                        <span className="xl:hidden mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hours</span>
                        <input type="text" inputMode="decimal" value={r.hours} placeholder="0.0"
                          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) updateRow(r.key, { hours: v }); }}
                          className={`${cellInput} xl:text-right`} />
                      </label>
                      <div>
                        <span className="xl:hidden mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Work Type</span>
                        <Dropdown
                          ariaLabel="Work type"
                          value={r.workType}
                          onChange={v => updateRow(r.key, { workType: v as WorkType })}
                          options={WORK_TYPE_OPTIONS}
                          className="bg-background px-2.5 py-2 border rounded-lg xl:bg-transparent xl:border-0 xl:rounded-none xl:focus-visible:ring-inset"
                        />
                      </div>
                      <label className="block col-span-2 max-[400px]:col-span-1 xl:col-span-1">
                        <span className="xl:hidden mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ticket link (optional)</span>
                        <input type="text" value={r.ticket} placeholder="https://..."
                          onChange={e => updateRow(r.key, { ticket: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter' && idx === rows.length - 1) { e.preventDefault(); addRow(); } }}
                          className={cellInput} />
                      </label>
                      <div className="col-span-2 max-[400px]:col-span-1 xl:col-span-1 flex items-center justify-end xl:justify-center">
                        <button onClick={() => removeRow(r.key)} disabled={rows.length === 1} title="Remove row"
                          className="flex items-center gap-1 rounded-md p-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-30">
                          <X className="size-4" /> <span className="xl:hidden">Remove row</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <button onClick={addRow}
                  className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold"
                  style={{ color: '#c8985e', borderColor: 'rgba(200,152,94,0.4)', background: 'rgba(200,152,94,0.08)' }}>
                  <Plus className="size-4" /> Add row
                </button>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {filledRows.length} {filledRows.length === 1 ? 'task' : 'tasks'}
                    <span className="mx-1.5">·</span>
                    <span className="font-bold text-foreground">{fmtHours(draftTotal)}</span>
                  </div>
                  <button onClick={submitEntries} disabled={submitting || filledRows.length === 0}
                    className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
                    style={{ background: submitting || filledRows.length === 0 ? '#8b8b8b55' : '#c8985e', color: '#0f1a2e' }}>
                    <Check className="size-4" />
                    {submitting ? 'Submitting…' : filledRows.length > 1 ? `Submit ${filledRows.length} entries` : 'Submit entry'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entries */}
      <div ref={listTopRef} className="space-y-3 scroll-mt-4">
        <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          {canManage ? 'Team entries' : 'My entries'}
        </h2>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap"
                style={statusFilter === s
                  ? { background: '#c8985e', color: '#0f1a2e', borderColor: '#c8985e' }
                  : { color: 'var(--muted-foreground)' }}>
                {s}
                <span className="rounded-full px-1.5 text-[10px]"
                  style={{ background: statusFilter === s ? 'rgba(15,26,46,0.15)' : 'rgba(128,128,128,0.15)' }}>
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="relative col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project or task"
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-[#c8985e]/70" />
            </div>
            <Dropdown
              ariaLabel="Date range"
              value={range}
              onChange={v => setRange(v as typeof range)}
              options={RANGE_OPTIONS}
              className={`${filterTrigger} sm:w-40`}
            />
            <Dropdown
              ariaLabel="Work type filter"
              value={workFilter}
              onChange={setWorkFilter}
              options={[{ value: 'all', label: 'All work types' }, ...WORK_TYPE_OPTIONS]}
              className={`${filterTrigger} sm:w-52`}
            />
            {canManage && (
              <div className="col-span-2 sm:col-span-1">
                <Dropdown
                  ariaLabel="Person filter"
                  value={personFilter}
                  onChange={setPersonFilter}
                  options={[{ value: 'all', label: 'Everyone' }, ...people.map(p => ({ value: p.id, label: p.name }))]}
                  className={`${filterTrigger} sm:w-52`}
                />
              </div>
            )}
            {filtersActive && (
              <button onClick={clearFilters}
                className="col-span-2 rounded-lg px-3 py-2 text-sm font-semibold sm:col-span-1" style={{ color: '#c8985e' }}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {entries.length === 0 ? 'No timesheet entries yet. Log your first task above.' : 'No entries match these filters.'}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <Card className="hidden xl:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#0f1a2e' }}>
                        {[...(canManage ? ['Employee'] : []), 'Project / Client', 'Task / Activity', 'Work Type', 'Hours', 'Status', ''].map((h, i) => (
                          <th key={i} className={`px-4 py-3 text-xs font-semibold tracking-wide text-white whitespace-nowrap ${h === 'Hours' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    {groups.map(g => (
                      <tbody key={g.date} className="divide-y">
                        <tr className="bg-muted/40">
                          <td colSpan={colCount} className="px-4 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-semibold text-foreground">
                                {fmtDay(g.date)}
                                <span className="ml-2 font-normal text-muted-foreground">
                                  {g.all.length} {g.all.length === 1 ? 'entry' : 'entries'} · {fmtHours(g.hours)}
                                </span>
                              </div>
                              {canManage && g.reviewable > 0 && (
                                <button onClick={() => approveDay(g.date, g.all)} disabled={actionLoading !== null}
                                  className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                                  style={{ background: '#2e7d32', opacity: actionLoading !== null ? 0.6 : 1 }}>
                                  {actionLoading === 'day-' + g.date ? '…' : `Approve all (${g.reviewable})`}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {g.items.map(e => (
                          <tr key={e.id} className="hover:bg-muted/30 transition-colors align-top">
                            {canManage && <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{e.employee?.name ?? 'Unknown'}</td>}
                            <td className="px-4 py-3 text-foreground" style={{ wordBreak: 'break-word' }}>{e.project_client}</td>
                            <td className="px-4 py-3 text-muted-foreground" style={{ maxWidth: '300px' }}>{taskCell(e)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>
                                {e.work_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">{fmtHours(Number(e.duration_hours))}</td>
                            <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                            <td className="px-4 py-3">{renderActions(e)}</td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Mobile cards */}
            <div className="flex flex-col gap-4 xl:hidden">
              {groups.map(g => (
                <div key={g.date} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="text-xs font-semibold text-foreground">
                      {fmtDay(g.date)}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {fmtHours(g.hours)}</span>
                    </div>
                    {canManage && g.reviewable > 0 && (
                      <button onClick={() => approveDay(g.date, g.all)} disabled={actionLoading !== null}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                        style={{ background: '#2e7d32', opacity: actionLoading !== null ? 0.6 : 1 }}>
                        {actionLoading === 'day-' + g.date ? '…' : `Approve all (${g.reviewable})`}
                      </button>
                    )}
                  </div>
                  {g.items.map(e => (
                    <Card key={e.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            {canManage && <div className="text-xs text-muted-foreground mb-0.5">{e.employee?.name ?? 'Unknown'}</div>}
                            <div className="font-semibold text-foreground text-sm" style={{ wordBreak: 'break-word' }}>{e.project_client}</div>
                          </div>
                          <StatusBadge status={e.status} />
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>
                            {e.work_type}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{fmtHours(Number(e.duration_hours))}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{taskCell(e)}</div>
                        {renderActions(e, true)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{pageStart + 1}–{pageEnd}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalEntries}</span> {totalEntries === 1 ? 'entry' : 'entries'}
                </p>
                <div className="flex items-center gap-1.5">
                  <PageButton label="First page" disabled={currentPage === 1} onClick={() => goToPage(1)}><ChevronsLeft className="size-4" /></PageButton>
                  <PageButton label="Previous page" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}><ChevronLeft className="size-4" /></PageButton>
                  <span className="min-w-[88px] px-2 text-center text-xs font-semibold text-muted-foreground">
                    Page <span className="text-foreground">{currentPage}</span> of {totalPages}
                  </span>
                  <PageButton label="Next page" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}><ChevronRight className="size-4" /></PageButton>
                  <PageButton label="Last page" disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}><ChevronsRight className="size-4" /></PageButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted/50"
      style={{
        borderColor: disabled ? 'var(--border)' : '#c8985e',
        color: disabled ? 'var(--muted-foreground)' : '#c8985e',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(230,126,34,.12)', color: '#e67e22' },
    approved: { bg: 'rgba(46,125,50,.12)', color: '#2e7d32' },
    rejected: { bg: 'rgba(179,58,58,.12)', color: '#b33a3a' },
  };
  const { bg, color } = s[status] ?? s.pending;
  return <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap" style={{ background: bg, color }}>{status}</span>;
}
