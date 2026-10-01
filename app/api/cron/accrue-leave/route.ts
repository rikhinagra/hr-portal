import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { computeMonthlyAccrual } from '@/lib/leaveAccrual';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Admins never apply for leave; inactive employees don't need ongoing accrual.
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, join_date, leave_balance_casual, leave_balance_sick, probation_hold_casual, probation_hold_sick, advance_used_casual, advance_used_sick')
      .eq('is_active', true)
      .neq('role', 'admin');

    if (fetchError) throw fetchError;

    const today = new Date();
    let updated = 0;

    for (const emp of employees ?? []) {
      const join = new Date(emp.join_date);
      if (join > today) continue; // not yet employed, nothing to accrue

      const result = computeMonthlyAccrual(
        emp.join_date,
        {
          leave_balance_casual: emp.leave_balance_casual ?? 0,
          leave_balance_sick: emp.leave_balance_sick ?? 0,
          probation_hold_casual: emp.probation_hold_casual ?? 0,
          probation_hold_sick: emp.probation_hold_sick ?? 0,
          advance_used_casual: emp.advance_used_casual ?? 0,
          advance_used_sick: emp.advance_used_sick ?? 0,
        },
        today
      );

      const { error: updateError } = await supabase.from('employees').update(result).eq('id', emp.id);
      if (updateError) throw updateError;
      updated += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Monthly leave accrual complete for ${updated} employees.`,
    });
  } catch (err) {
    console.error('Leave accrual error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
