'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock, Lock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LeaveCalendarSkeleton from './LeaveCalendarSkeleton';

export interface MonthData {
  month: string;
  label: string;
  isCurrent: boolean;
  isFuture: boolean;
  hasRealData: boolean;
  casualAccruedTillDate: number | null;
  casualUsedTillDate: number | null;
  casualBalance: number | null;
  casualAdvanceUsed: number | null;
  sickAccruedTillDate: number | null;
  sickUsedTillDate: number | null;
  sickBalance: number | null;
  sickAdvanceUsed: number | null;
}

export interface CalendarData {
  months: MonthData[];
  probation: { status: 'in_probation' | 'na'; endDate: string | null };
}

const EARNED_COLOR = '#3a7bd5';
const SICK_COLOR = '#e67e22';
const GOLD = '#c8985e';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const show = (n: number | null | undefined) => (n === null || n === undefined ? '–' : String(n));

// Loads the employee's own calendar and shows it directly on the Leave page.
export default function LeaveCalendarPanel() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leave/calendar');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load the calendar.');
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const year = data?.months[0]?.month.slice(0, 4);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: 'rgba(200,152,94,0.12)' }}>
            <CalendarDays className="size-4" style={{ color: GOLD }} />
          </span>
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Leave Calendar{year ? ` ${year}` : ''}
          </h2>
        </div>

        {loading && (
          <div role="status" aria-busy="true" aria-label="Loading your leave calendar">
            <LeaveCalendarSkeleton />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Could not load your leave calendar. {error}</p>
            <button onClick={load}
              className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold"
              style={{ color: GOLD, borderColor: 'rgba(200,152,94,0.4)', background: 'rgba(200,152,94,0.08)' }}>
              <RefreshCw className="size-3.5" /> Try again
            </button>
          </div>
        )}

        {!loading && !error && data && data.months.length > 0 && <CalendarView data={data} />}
      </CardContent>
    </Card>
  );
}

export function CalendarView({ data }: { data: CalendarData }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => data.months.find(m => m.isCurrent)?.month ?? null,
  );
  const selected = data.months.find(m => m.month === selectedKey) ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
      {/* Month picker + probation */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Select month</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
          {data.months.map(m => {
            const isSelected = selected?.month === m.month;
            return (
              <button
                key={m.month}
                type="button"
                disabled={m.isFuture}
                aria-pressed={isSelected}
                aria-label={`${m.label}${m.isCurrent ? ' (current month)' : ''}${m.isFuture ? ', not available yet' : ''}`}
                title={m.isFuture ? 'Not accrued yet' : undefined}
                onClick={() => !m.isFuture && setSelectedKey(m.month)}
                className={`relative flex h-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                  m.isFuture
                    ? 'cursor-not-allowed border-border/50 text-muted-foreground/40'
                    : isSelected
                      ? ''
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted/70'
                }`}
                style={isSelected ? { background: 'rgba(200,152,94,0.16)', borderColor: GOLD, color: GOLD } : undefined}
              >
                {m.label.slice(0, 3)}
                {m.isFuture && <Lock className="absolute right-1 top-1 size-2.5" />}
                {m.isCurrent && <span className="absolute bottom-1 size-1 rounded-full" style={{ background: GOLD }} />}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full" style={{ background: GOLD }} /> Current month
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Clock className="size-3.5 flex-shrink-0" style={{ color: GOLD }} />
          <span className="text-xs text-muted-foreground">Probation</span>
          <span className="text-xs font-semibold text-foreground">
            {data.probation.status === 'in_probation' && data.probation.endDate
              ? `Until ${formatDate(data.probation.endDate)}`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Details for the selected month */}
      <div className="min-w-0">
        {selected ? (
          <>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              As of {selected.label}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <LeaveDetailCard
                title="Annual Earned Leave"
                color={EARNED_COLOR}
                tint="rgba(37,99,235,0.06)"
                live={selected.isCurrent}
                hasData={selected.hasRealData}
                accrued={selected.casualAccruedTillDate}
                used={selected.casualUsedTillDate}
                balance={selected.casualBalance}
                advance={selected.casualAdvanceUsed}
              />
              <LeaveDetailCard
                title="Annual Sick Leave"
                color={SICK_COLOR}
                tint="rgba(234,88,12,0.06)"
                live={selected.isCurrent}
                hasData={selected.hasRealData}
                accrued={selected.sickAccruedTillDate}
                used={selected.sickUsedTillDate}
                balance={selected.sickBalance}
                advance={selected.sickAdvanceUsed}
              />
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Select a month to view details.</p>
        )}
      </div>
    </div>
  );
}

function LeaveDetailCard({
  title, color, tint, live, hasData, accrued, used, balance, advance,
}: {
  title: string; color: string; tint: string; live: boolean; hasData: boolean;
  accrued: number | null; used: number | null; balance: number | null; advance: number | null;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: tint }}>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{title}</span>
      </div>

      <div className="mt-3">
        <div className="text-[11px] text-muted-foreground">Balance{live ? ' (live)' : ''}</div>
        <div className="mt-1 text-3xl font-bold leading-none" style={{ color }}>{hasData ? show(balance) : '–'}</div>
      </div>

      <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Accrued Till Date</dt>
          <dd className="font-semibold text-foreground">{show(accrued)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Used Till Date</dt>
          <dd className="font-semibold text-foreground">{hasData ? show(used) : '–'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Advance Used</dt>
          <dd className="font-semibold text-foreground">{hasData && advance ? advance.toFixed(2) : '–'}</dd>
        </div>
      </dl>
    </div>
  );
}
