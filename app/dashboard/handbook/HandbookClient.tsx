'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, ArrowDown, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HANDBOOK_CHAPTERS } from '@/lib/constants';
import type { Employee } from '@/types';

export interface ComplianceRecord {
  id: string;
  name: string;
  employee_code: string;
  department: string;
  designation: string;
  acknowledged_at: string | null;
}

interface HandbookClientProps {
  employee: Employee;
  existingAck: { acknowledged_at: string } | null;
  complianceData: ComplianceRecord[];
}

export default function HandbookClient({ employee, existingAck, complianceData }: HandbookClientProps) {
  const [acknowledged, setAcknowledged] = useState(!!existingAck);
  const [ackDate, setAckDate] = useState(existingAck?.acknowledged_at ?? null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';

  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 50) setScrolledToBottom(true);
    }
  }, []);

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/handbook/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAcknowledged(true);
      setAckDate(data.acknowledged_at);
      setShowModal(false);
      toast.success('Handbook Acknowledged', {
        description: `Confirmation sent to HR. Thank you, ${employee.name.split(' ')[0]}!`,
      });
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgedCount = complianceData.filter(r => r.acknowledged_at !== null).length;
  const pendingCount = complianceData.length - acknowledgedCount;
  const progressPct = complianceData.length > 0 ? Math.round((acknowledgedCount / complianceData.length) * 100) : 0;

  const filteredCompliance = complianceData.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase()) ||
    r.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Employee Handbook</h1>
          <p className="text-sm text-muted-foreground mt-1">Read all 17 chapters and acknowledge at the bottom</p>
        </div>
        {acknowledged && (
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#2e7d32' }}>
            <Check className="size-3.5" /> Acknowledged
          </span>
        )}
      </div>

      {/* Compliance Tracker — Admin & HR only */}
      {isAdminOrHr && complianceData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Handbook Compliance Tracker
          </h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: 'rgba(37,99,235,0.1)' }}>
                    <Users className="size-4" style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{complianceData.length}</div>
                    <div className="text-xs text-muted-foreground">Total Employees</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: 'rgba(46,125,50,0.1)' }}>
                    <Check className="size-4" style={{ color: '#2e7d32' }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: '#2e7d32' }}>{acknowledgedCount}</div>
                    <div className="text-xs text-muted-foreground">Acknowledged</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: 'rgba(230,126,34,0.1)' }}>
                    <Clock className="size-4" style={{ color: '#e67e22' }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: '#e67e22' }}>{pendingCount}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <div className="rounded-xl border p-4" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Completion</span>
              <span className="text-sm font-bold" style={{ color: progressPct === 100 ? '#2e7d32' : '#c8985e' }}>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#2e7d32' : '#c8985e' }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {acknowledgedCount} of {complianceData.length} employees have acknowledged the handbook
            </p>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, department, or employee code…"
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
                      {['Employee', 'Code', 'Department', 'Designation', 'Status', 'Acknowledged On'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCompliance.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No results found.</td></tr>
                    ) : filteredCompliance.map(r => (
                      <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.employee_code}</td>
                        <td className="px-4 py-3 text-foreground">{r.department}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.designation}</td>
                        <td className="px-4 py-3">
                          {r.acknowledged_at ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                              style={{ background: 'rgba(46,125,50,0.12)', color: '#2e7d32' }}>
                              <Check className="size-3" /> Acknowledged
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                              style={{ background: 'rgba(230,126,34,0.12)', color: '#e67e22' }}>
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {r.acknowledged_at
                            ? new Date(r.acknowledged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
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
            {filteredCompliance.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No results found.</CardContent></Card>
            ) : filteredCompliance.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-foreground text-sm">{r.name}</div>
                    {r.acknowledged_at ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(46,125,50,0.12)', color: '#2e7d32' }}>
                        <Check className="size-3" /> Acknowledged
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(230,126,34,0.12)', color: '#e67e22' }}>
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.employee_code} · {r.department}</div>
                  {r.acknowledged_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      On {new Date(r.acknowledged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Handbook Content */}
      <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>
        {isAdminOrHr ? 'Handbook Content' : ''}
      </h2>

      {/* Chapter Scroll Container */}
      <Card>
        <CardContent className="p-0">
          <div ref={contentRef} onScroll={handleScroll} className="max-h-[65vh] overflow-y-auto">
            {HANDBOOK_CHAPTERS.map((ch, i) => (
              <div key={ch.num} className={`px-4 py-5 sm:px-8 sm:py-7 ${i < HANDBOOK_CHAPTERS.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="text-xs tracking-widest uppercase mb-1.5 font-semibold" style={{ color: '#c8985e', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  Chapter {ch.num}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {ch.title}
                </h3>
                {ch.content.split('\n\n').map((p, j) => (
                  <p key={j} className="text-sm text-muted-foreground leading-relaxed mb-2.5">{p}</p>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgement Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${scrolledToBottom && !acknowledged ? 'border-[#c8985e]' : 'border-border'}`}
        style={{ background: scrolledToBottom && !acknowledged ? 'rgba(200,152,94,0.08)' : 'rgba(0,0,0,0.02)' }}>
        <div>
          {!scrolledToBottom && !acknowledged && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ArrowDown className="size-3.5 flex-shrink-0" /> Scroll to the bottom of the handbook to enable acknowledgement
            </p>
          )}
          {scrolledToBottom && !acknowledged && (
            <p className="text-sm font-semibold" style={{ color: '#c8985e' }}>You&apos;ve read the full handbook. Please acknowledge below.</p>
          )}
          {acknowledged && ackDate && (
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#2e7d32' }}>
              <Check className="size-3.5 flex-shrink-0" /> Acknowledged on {new Date(ackDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. HR has been notified.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!scrolledToBottom || acknowledged}
          className="flex-shrink-0 px-6 py-2.5 rounded-lg font-semibold text-sm"
          style={{
            background: scrolledToBottom && !acknowledged ? '#c8985e' : '#ccc',
            color: scrolledToBottom && !acknowledged ? '#0f1a2e' : '#888',
            cursor: scrolledToBottom && !acknowledged ? 'pointer' : 'not-allowed',
            opacity: acknowledged ? 0.6 : 1,
          }}>
          {acknowledged ? <span className="flex items-center gap-1.5"><Check className="size-3.5" />Acknowledged</span> : 'I Acknowledge'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl bg-card text-foreground border animate-slide-up">
            <h3 className="text-lg font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Confirm Acknowledgement
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              By confirming, you acknowledge that you have read and understood the complete SACHHSOFT Employee Handbook.
              A confirmation will be sent to HR.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-lg text-sm border border-border text-muted-foreground bg-transparent hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleAcknowledge} disabled={loading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: loading ? '#ccc' : '#c8985e', color: loading ? '#888' : '#0f1a2e', cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Saving...' : 'Confirm & Notify HR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
