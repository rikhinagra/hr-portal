import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { computeMonthlyAccrual } from '@/lib/leaveAccrual';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The old system only ever kept a single annual balance — it never recorded
// day-by-day usage before this feature went live. "Accrued" is always safe to
// show for any past month (it's pure formula, independent of usage). "Used"
// is NOT safe before this date, since it depends on real leave records we
// don't have for earlier months — showing a formula-guessed USED figure
// there was the exact bug this constant originally fixed (it assumed zero
// usage, which is fictional for anyone migrated from the old system).
const DATA_START = new Date(Date.UTC(2026, 9, 1)); // October 2026

// HR's one-time CSV migration gives us one genuinely real, verified balance
// snapshot for the month immediately before DATA_START (September 2026) — so
// unlike "used," balance CAN be shown honestly one month earlier than that,
// by working backward from the current live balance through the real
// (accrued − used) deltas for every month from DATA_START through today.
const BALANCE_KNOWN_START = new Date(Date.UTC(2026, 8, 1)); // September 2026

const MONTHLY_SICK_ACCRUAL = 7 / 12;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees')
      .select(`
        id, join_date, role,
        leave_balance_casual, leave_balance_sick,
        advance_used_casual, advance_used_sick,
        probation_hold_casual, probation_hold_sick,
        accrued_till_date_casual, accrued_till_date_sick,
        used_till_date_casual, used_till_date_sick,
        annual_entitlement_casual, annual_entitlement_sick
      `)
      .eq('auth_user_id', user.id)
      .single();

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (employee.role === 'admin') {
      return NextResponse.json({ months: [] });
    }

    const { data: leaveRequests } = await serviceClient
      .from('leave_requests')
      .select('leave_type, start_date, days')
      .eq('employee_id', employee.id)
      .eq('status', 'approved');

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonthIndex = now.getUTCMonth(); // 0-11

    // Sum approved usage per calendar month (attributed by start_date's month)
    const usedCasualByMonth = new Map<string, number>();
    const usedSickByMonth = new Map<string, number>();
    for (const lr of leaveRequests ?? []) {
      const d = new Date(lr.start_date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const map = lr.leave_type === 'sick' ? usedSickByMonth : usedCasualByMonth;
      map.set(key, (map.get(key) ?? 0) + Number(lr.days));
    }

    // Replay the accrual formula from join month through current month to get
    // each month's accrued delta and correct running probation-hold state.
    const join = new Date(employee.join_date);
    let cursor = new Date(Date.UTC(join.getUTCFullYear(), join.getUTCMonth(), 1));
    const stop = new Date(Date.UTC(currentYear, currentMonthIndex, 1));
    const probationEnd = new Date(Date.UTC(join.getUTCFullYear(), join.getUTCMonth() + 3, join.getUTCDate()));

    // Note: this replay always starts with zero advance, since it reconstructs
    // accrual history from scratch — it can't know about a real-world advance
    // debt that predates this feature. The employee's actual, current advance
    // (read below from the DB) is surfaced separately and is always accurate;
    // only the month-by-month historical breakdown is a best-effort approximation.
    let state = { leave_balance_casual: 0, leave_balance_sick: 0, probation_hold_casual: 0, probation_hold_sick: 0, advance_used_casual: 0, advance_used_sick: 0, accrued_till_date_casual: 0, accrued_till_date_sick: 0 };
    const accruedByMonth = new Map<string, { casual: number; sick: number }>();

    // The full monthly accrual amount BEFORE any advance payoff is taken out —
    // 0 while still on probation (nothing is paid out yet), otherwise the
    // standard monthly rate. Used below to replay both the advance balance AND
    // Accrued Till Date backward from the current live figures, month by month.
    const monthlyDeltaByMonth = new Map<string, { casual: number; sick: number }>();

    while (cursor <= stop) {
      // Jan 1st zeroes the usable balance before accruing — measure this month's
      // delta against that zeroed baseline, not the prior December's value, so the
      // reset itself never shows up as a (misleading, negative) "accrued" amount.
      const isJanReset = cursor.getUTCMonth() === 0 && cursor.getUTCDate() === 1;
      const before = isJanReset ? { ...state, leave_balance_casual: 0, leave_balance_sick: 0 } : state;
      state = computeMonthlyAccrual(employee.join_date, state, cursor, { casual: Number(employee.annual_entitlement_casual ?? 12), sick: Number(employee.annual_entitlement_sick ?? 7) });
      const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      // Keep each month's delta at full floating-point precision here — do NOT
      // round yet. Rounding every single month before summing 9+ of them
      // compounds into a real, visible error (e.g. 9 × round(7/12, 2) = 5.22,
      // not the correct 5.25). Round only the final totals, below.
      accruedByMonth.set(key, {
        casual: state.leave_balance_casual - before.leave_balance_casual,
        sick: state.leave_balance_sick - before.leave_balance_sick,
      });
      monthlyDeltaByMonth.set(key, cursor < probationEnd ? { casual: 0, sick: 0 } : { casual: 1, sick: MONTHLY_SICK_ACCRUAL });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    // Reconstruct each month's real balance using balance = max(0, Accrued
    // Till Date − Used Till Date) — NOT by differencing accrued-minus-used
    // deltas month to month. The two Till Date counters are tracked
    // completely independently of any outstanding advance, so this relationship
    // holds exactly regardless of advance-payoff timing (verified: it matches
    // every real employee's live balance exactly). A naive delta-based
    // reconstruction breaks for anyone with an advance, since part of their
    // monthly accrual goes to paying that down rather than becoming balance —
    // this caught a real bug during testing (showed a negative balance for an
    // employee with an outstanding advance).
    const balanceAtMonth = new Map<string, { casual: number; sick: number }>();
    const usedTillDateAtMonth = new Map<string, { casual: number; sick: number }>();
    // Accrued Till Date, reconstructed the SAME way as balance/used/advance —
    // anchored to the current live (correct, CSV-seeded) total and walked
    // backward, NOT computed forward from a clean-slate join-date replay.
    // That forward replay was the actual bug this fixes: for anyone whose real
    // history came from HR's one-time CSV migration (effectively everyone),
    // it silently assumed a textbook probation-hold timeline from scratch,
    // which doesn't necessarily match what HR actually recorded — caught when
    // a user compared Jaspreet Singh's September figure (4.08 from the old
    // forward replay) against his real CSV value (3.5), and noticed it also
    // didn't even agree with this same popup's own Balance figure for the
    // same month, which already used the correct backward-anchored method.
    const accruedTillDateAtMonth = new Map<string, { casual: number; sick: number }>();
    // Advance Used only ever decreases (it's debt being paid down) — never
    // reset, never added to, after the one-time migration. So unlike balance,
    // it's reconstructed by ADDING each month's standard payoff amount back
    // on as we walk backward from the current live figure — valid as long as
    // the advance hasn't already hit zero somewhere in between (true for every
    // employee currently carrying one; if it ever does hit zero first, the
    // months before that point simply aren't reconstructable, so this isn't
    // extended further back than BALANCE_KNOWN_START regardless).
    const advanceAtMonth = new Map<string, { casual: number; sick: number }>();
    const currentAdvanceCasual = Number(employee.advance_used_casual ?? 0);
    const currentAdvanceSick = Number(employee.advance_used_sick ?? 0);
    {
      let sumAccruedAfterCasual = 0, sumAccruedAfterSick = 0;
      let sumUsedAfterCasual = 0, sumUsedAfterSick = 0;
      let sumDeltaAfterCasual = 0, sumDeltaAfterSick = 0;
      const yearStart = new Date(Date.UTC(currentYear, 0, 1));
      let c = new Date(Date.UTC(currentYear, currentMonthIndex, 1));
      while (c >= yearStart) {
        const key = `${c.getUTCFullYear()}-${String(c.getUTCMonth() + 1).padStart(2, '0')}`;

        // Accrued Till Date — anchored to the live current total, walked
        // backward using the FULL monthly delta (never reduced by advance
        // payoff, matching the field's own definition). Forced to 0 for any
        // month that was still within probation, or before this employee
        // even joined — backward subtraction alone can't know that on its
        // own, since the delta is also 0 for those months for a different
        // reason (nothing accrues yet), which would otherwise just carry the
        // release-month's value backward unchanged instead of showing 0.
        const monthStart = c;
        const stillHeldOrNotYetJoined = monthStart < probationEnd || monthStart < new Date(Date.UTC(join.getUTCFullYear(), join.getUTCMonth(), 1));
        accruedTillDateAtMonth.set(key, stillHeldOrNotYetJoined ? { casual: 0, sick: 0 } : {
          casual: Math.max(0, Number((Number(employee.accrued_till_date_casual) - sumDeltaAfterCasual).toFixed(2))),
          sick: Math.max(0, Number((Number(employee.accrued_till_date_sick) - sumDeltaAfterSick).toFixed(2))),
        });

        if (c >= BALANCE_KNOWN_START) {
          const accruedTillDateAtX_casual = Number(employee.accrued_till_date_casual) - sumAccruedAfterCasual;
          const accruedTillDateAtX_sick = Number(employee.accrued_till_date_sick) - sumAccruedAfterSick;
          const usedTillDateAtX_casual = Number(employee.used_till_date_casual) - sumUsedAfterCasual;
          const usedTillDateAtX_sick = Number(employee.used_till_date_sick) - sumUsedAfterSick;
          balanceAtMonth.set(key, {
            casual: Math.max(0, Number((accruedTillDateAtX_casual - usedTillDateAtX_casual).toFixed(2))),
            sick: Math.max(0, Number((accruedTillDateAtX_sick - usedTillDateAtX_sick).toFixed(2))),
          });
          usedTillDateAtMonth.set(key, {
            casual: Number(usedTillDateAtX_casual.toFixed(2)),
            sick: Number(usedTillDateAtX_sick.toFixed(2)),
          });
          // Only reconstruct a nonzero past value when there's a live advance
          // right now — if it's 0 today, that means this employee never had one
          // (true for everyone currently tracked: nobody has fully paid one off
          // yet), so every past month is 0 too, not "0 plus whatever would have
          // been paid off" — that was fabricating a debt that never existed.
          advanceAtMonth.set(key, {
            casual: currentAdvanceCasual > 0 ? Math.max(0, Number((currentAdvanceCasual + sumDeltaAfterCasual).toFixed(2))) : 0,
            sick: currentAdvanceSick > 0 ? Math.max(0, Number((currentAdvanceSick + sumDeltaAfterSick).toFixed(2))) : 0,
          });
        }

        const accrued = accruedByMonth.get(key) ?? { casual: 0, sick: 0 };
        sumAccruedAfterCasual += accrued.casual;
        sumAccruedAfterSick += accrued.sick;
        sumUsedAfterCasual += (usedCasualByMonth.get(key) ?? 0);
        sumUsedAfterSick += (usedSickByMonth.get(key) ?? 0);
        const delta = monthlyDeltaByMonth.get(key) ?? { casual: 0, sick: 0 };
        sumDeltaAfterCasual += delta.casual;
        sumDeltaAfterSick += delta.sick;
        c = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1));
      }
    }

    const months = [];

    for (let m = 0; m < 12; m++) {
      const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      const monthDate = new Date(Date.UTC(currentYear, m, 1));
      // Balance and Used Till Date share the same real-data threshold now —
      // both are only knowable from September 2026 onward (HR's verified
      // snapshot). Accrued Till Date is always knowable, any month.
      const hasRealData = monthDate >= BALANCE_KNOWN_START;
      const isFuture = m > currentMonthIndex;
      const isCurrent = m === currentMonthIndex;
      const showAccrued = !isFuture;
      const showRealData = !isFuture && hasRealData;

      const accruedTillDate = accruedTillDateAtMonth.get(key);
      const monthBalance = balanceAtMonth.get(key);
      const monthUsedTillDate = usedTillDateAtMonth.get(key);
      const monthAdvance = advanceAtMonth.get(key);

      months.push({
        month: key,
        label: MONTH_LABELS[m],
        isCurrent,
        isFuture,
        hasRealData,
        // current month always shows the live, authoritative values directly;
        // other tracked months use the reconstructed Till Date figures — these
        // always agree exactly, verified, since they're the same formula.
        casualAccruedTillDate: !showAccrued ? null : (isCurrent ? Number(Number(employee.accrued_till_date_casual).toFixed(2)) : (accruedTillDate?.casual ?? 0)),
        sickAccruedTillDate: !showAccrued ? null : (isCurrent ? Number(Number(employee.accrued_till_date_sick).toFixed(2)) : (accruedTillDate?.sick ?? 0)),
        casualUsedTillDate: !showRealData ? null : (isCurrent ? Number(Number(employee.used_till_date_casual).toFixed(2)) : (monthUsedTillDate?.casual ?? null)),
        sickUsedTillDate: !showRealData ? null : (isCurrent ? Number(Number(employee.used_till_date_sick).toFixed(2)) : (monthUsedTillDate?.sick ?? null)),
        casualBalance: !showRealData ? null : (isCurrent ? Number(Number(employee.leave_balance_casual).toFixed(2)) : (monthBalance?.casual ?? null)),
        sickBalance: !showRealData ? null : (isCurrent ? Number(Number(employee.leave_balance_sick).toFixed(2)) : (monthBalance?.sick ?? null)),
        casualAdvanceUsed: !showRealData ? null : (isCurrent ? Number(Number(employee.advance_used_casual ?? 0).toFixed(2)) : (monthAdvance?.casual ?? null)),
        sickAdvanceUsed: !showRealData ? null : (isCurrent ? Number(Number(employee.advance_used_sick ?? 0).toFixed(2)) : (monthAdvance?.sick ?? null)),
      });
    }

    const isInProbation = Number(employee.probation_hold_casual) > 0 || Number(employee.probation_hold_sick) > 0;

    return NextResponse.json({
      months,
      probation: {
        status: isInProbation ? 'in_probation' : 'na',
        endDate: isInProbation ? probationEnd.toISOString().split('T')[0] : null,
      },
    });
  } catch (err) {
    console.error('Leave calendar error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
