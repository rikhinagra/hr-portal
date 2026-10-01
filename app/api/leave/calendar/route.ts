import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { computeMonthlyAccrual } from '@/lib/leaveAccrual';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The old system only ever kept a single annual balance — it never recorded
// month-by-month activity. This feature is what introduced real monthly
// tracking, so nothing before the month it went live can be honestly shown:
// the formula CAN compute a hypothetical "what if zero leave was ever taken"
// number for earlier months, but that number is fictional, not history, and
// showing it next to real figures would be actively misleading.
const DATA_START = new Date(Date.UTC(2026, 9, 1)); // October 2026

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees')
      .select('id, join_date, leave_balance_casual, leave_balance_sick, role, advance_used_casual, advance_used_sick')
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

    // Note: this replay always starts with zero advance, since it reconstructs
    // accrual history from scratch — it can't know about a real-world advance
    // debt that predates this feature. The employee's actual, current advance
    // (read below from the DB) is surfaced separately and is always accurate;
    // only the month-by-month historical breakdown is a best-effort approximation.
    let state = { leave_balance_casual: 0, leave_balance_sick: 0, probation_hold_casual: 0, probation_hold_sick: 0, advance_used_casual: 0, advance_used_sick: 0 };
    const accruedByMonth = new Map<string, { casual: number; sick: number }>();

    while (cursor <= stop) {
      // Jan 1st zeroes the usable balance before accruing — measure this month's
      // delta against that zeroed baseline, not the prior December's value, so the
      // reset itself never shows up as a (misleading, negative) "accrued" amount.
      const isJanReset = cursor.getUTCMonth() === 0 && cursor.getUTCDate() === 1;
      const before = isJanReset ? { ...state, leave_balance_casual: 0, leave_balance_sick: 0 } : state;
      state = computeMonthlyAccrual(employee.join_date, state, cursor);
      const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      accruedByMonth.set(key, {
        casual: Number((state.leave_balance_casual - before.leave_balance_casual).toFixed(2)),
        sick: Number((state.leave_balance_sick - before.leave_balance_sick).toFixed(2)),
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    let runningCasual = 0;
    let runningSick = 0;
    const months = [];

    for (let m = 0; m < 12; m++) {
      const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      const monthDate = new Date(Date.UTC(currentYear, m, 1));
      const isBeforeDataStart = monthDate < DATA_START;
      const isFuture = m > currentMonthIndex;
      const isCurrent = m === currentMonthIndex;
      const showData = !isFuture && !isBeforeDataStart;

      const accrued = accruedByMonth.get(key) ?? { casual: 0, sick: 0 };
      const usedCasual = usedCasualByMonth.get(key) ?? 0;
      const usedSick = usedSickByMonth.get(key) ?? 0;

      if (showData) {
        runningCasual += accrued.casual - usedCasual;
        runningSick += accrued.sick - usedSick;
      }

      months.push({
        month: key,
        label: MONTH_LABELS[m],
        isCurrent,
        isFuture,
        isBeforeDataStart,
        casualAccrued: showData ? accrued.casual : null,
        casualUsed: showData ? usedCasual : null,
        // current month shows the live, authoritative balance; past tracked months show the reconstructed running total
        casualBalance: !showData ? null : (isCurrent ? Number(employee.leave_balance_casual) : Number(runningCasual.toFixed(1))),
        sickAccrued: showData ? accrued.sick : null,
        sickUsed: showData ? usedSick : null,
        sickBalance: !showData ? null : (isCurrent ? Number(employee.leave_balance_sick) : Number(runningSick.toFixed(1))),
      });
    }

    return NextResponse.json({
      months,
      advanceUsedCasual: Number(employee.advance_used_casual ?? 0),
      advanceUsedSick: Number(employee.advance_used_sick ?? 0),
    });
  } catch (err) {
    console.error('Leave calendar error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
