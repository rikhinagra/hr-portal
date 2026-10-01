'use client';

import { useState } from 'react';
import { CalendarDays, X, Lock, MinusCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface MonthData {
  month: string;
  label: string;
  isCurrent: boolean;
  isFuture: boolean;
  isBeforeDataStart: boolean;
  casualAccrued: number | null;
  casualUsed: number | null;
  casualBalance: number | null;
  sickAccrued: number | null;
  sickUsed: number | null;
  sickBalance: number | null;
}

export default function LeaveCalendarWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState<MonthData[]>([]);
  const [selected, setSelected] = useState<MonthData | null>(null);
  const [advanceCasual, setAdvanceCasual] = useState(0);
  const [advanceSick, setAdvanceSick] = useState(0);

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/leave/calendar');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMonths(data.months ?? []);
      setAdvanceCasual(data.advanceUsedCasual ?? 0);
      setAdvanceSick(data.advanceUsedSick ?? 0);
      const current = (data.months ?? []).find((m: MonthData) => m.isCurrent);
      setSelected(current ?? null);
    } catch (err: unknown) {
      toast.error('Failed to load leave calendar', { description: err instanceof Error ? err.message : 'Try again.' });
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
        style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e', border: '1px solid rgba(200,152,94,0.25)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,152,94,0.2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,152,94,0.1)'; }}
      >
        <CalendarDays className="size-4" />
        Leave Calendar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f1a2e] border border-[#1c2d4a] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d4a] flex-shrink-0">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5" style={{ color: '#c8985e' }} />
                <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                  Leave Calendar — {months[0]?.month.slice(0, 4) ?? new Date().getFullYear()}
                </h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {(advanceCasual > 0 || advanceSick > 0) && (
                    <div className="flex items-start gap-2.5 rounded-lg border p-3.5 mb-5"
                      style={{ borderColor: 'rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.08)' }}>
                      <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" style={{ color: '#eab308' }} />
                      <div className="text-xs leading-relaxed" style={{ color: '#fde68a' }}>
                        <span className="font-semibold">Outstanding advance: </span>
                        {advanceCasual > 0 && <>{advanceCasual} Casual day{advanceCasual !== 1 ? 's' : ''}{advanceSick > 0 ? ', ' : ''}</>}
                        {advanceSick > 0 && <>{advanceSick} Sick day{advanceSick !== 1 ? 's' : ''}</>}
                        {' '}— you took this leave before it was earned. It will be automatically deducted from your future accrual before any new leave becomes usable, no action needed. (This means some of the &quot;Accrued&quot; amount shown below for the current month has already gone toward paying this down, rather than adding to your balance.)
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
                    {months.map(m => {
                      const isSelected = selected?.month === m.month;
                      const disabled = m.isFuture || m.isBeforeDataStart;
                      return (
                        <button
                          key={m.month}
                          disabled={disabled}
                          onClick={() => !disabled && setSelected(m)}
                          title={m.isBeforeDataStart ? 'Before monthly tracking started — no data' : m.isFuture ? 'Not accrued yet' : undefined}
                          className="relative flex flex-col items-center justify-center gap-1 rounded-lg py-3 px-2 text-xs font-semibold transition-all"
                          style={{
                            background: disabled ? 'rgba(255,255,255,0.03)' : isSelected ? 'rgba(200,152,94,0.18)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isSelected ? '#c8985e' : m.isCurrent ? 'rgba(200,152,94,0.4)' : '#1c2d4a'}`,
                            color: disabled ? '#4b5563' : isSelected ? '#c8985e' : '#e5e7eb',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {m.isFuture && <Lock className="size-3 absolute top-1.5 right-1.5" />}
                          {m.isBeforeDataStart && <MinusCircle className="size-3 absolute top-1.5 right-1.5" />}
                          {m.label.slice(0, 3)}
                          {m.isCurrent && <span style={{ fontSize: '0.55rem', color: '#c8985e' }}>Current</span>}
                        </button>
                      );
                    })}
                  </div>

                  {selected ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4" style={{ borderColor: '#1c2d4a', background: 'rgba(37,99,235,0.06)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#60a5fa' }}>
                          Casual Leave — {selected.label}
                        </p>
                        <div className="space-y-1.5 text-sm text-gray-300">
                          <div className="flex justify-between"><span>Accrued this month</span><span className="font-semibold text-white">+{selected.casualAccrued}</span></div>
                          <div className="flex justify-between"><span>Used this month</span><span className="font-semibold text-white">-{selected.casualUsed}</span></div>
                          <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: '#1c2d4a' }}>
                            <span>Balance {selected.isCurrent ? '(live)' : 'at month end'}</span>
                            <span className="font-bold" style={{ color: '#60a5fa' }}>{selected.casualBalance}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4" style={{ borderColor: '#1c2d4a', background: 'rgba(234,88,12,0.06)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#fb923c' }}>
                          Sick Leave — {selected.label}
                        </p>
                        <div className="space-y-1.5 text-sm text-gray-300">
                          <div className="flex justify-between"><span>Accrued this month</span><span className="font-semibold text-white">+{selected.sickAccrued}</span></div>
                          <div className="flex justify-between"><span>Used this month</span><span className="font-semibold text-white">-{selected.sickUsed}</span></div>
                          <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: '#1c2d4a' }}>
                            <span>Balance {selected.isCurrent ? '(live)' : 'at month end'}</span>
                            <span className="font-bold" style={{ color: '#fb923c' }}>{selected.sickBalance}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">Select a month to view details.</p>
                  )}

                  <p className="text-xs text-gray-500 mt-5 leading-relaxed">
                    Monthly tracking started in October 2026 — months before that (marked <MinusCircle className="inline size-3 -mt-0.5" />) were never recorded month-by-month under the old system, so no breakdown is shown for them. From October onward, the current month always shows your live, up-to-date balance, and earlier tracked months show what happened that month.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
