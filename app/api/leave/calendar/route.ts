import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { computeMonthlyAccrual } from '@/lib/leaveAccrual';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees')
      .select('id, join_date, leave_balance_casual, leave_balance_sick, role')
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

    let state = { leave_balance_casual: 0, leave_balance_sick: 0, probation_hold_casual: 0, probation_hold_sick: 0 };
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
      const isFuture = m > currentMonthIndex;
      const isCurrent = m === currentMonthIndex;

      const accrued = accruedByMonth.get(key) ?? { casual: 0, sick: 0 };
      const usedCasual = usedCasualByMonth.get(key) ?? 0;
      const usedSick = usedSickByMonth.get(key) ?? 0;

      runningCasual += accrued.casual - usedCasual;
      runningSick += accrued.sick - usedSick;

      months.push({
        month: key,
        label: MONTH_LABELS[m],
        isCurrent,
        isFuture,
        casualAccrued: isFuture ? null : accrued.casual,
        casualUsed: isFuture ? null : usedCasual,
        // current month shows the live, authoritative balance; past months show the reconstructed running total
        casualBalance: isFuture ? null : (isCurrent ? Number(employee.leave_balance_casual) : Number(runningCasual.toFixed(1))),
        sickAccrued: isFuture ? null : accrued.sick,
        sickUsed: isFuture ? null : usedSick,
        sickBalance: isFuture ? null : (isCurrent ? Number(employee.leave_balance_sick) : Number(runningSick.toFixed(1))),
      });
    }

    return NextResponse.json({ months });
  } catch (err) {
    console.error('Leave calendar error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
