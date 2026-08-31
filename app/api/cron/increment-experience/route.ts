import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, experience_years, experience_months');

    if (fetchError) throw fetchError;

    for (const emp of employees ?? []) {
      let years = emp.experience_years;
      let months = emp.experience_months + 1;
      if (months >= 12) {
        years += 1;
        months = 0;
      }
      await supabase
        .from('employees')
        .update({ experience_years: years, experience_months: months })
        .eq('id', emp.id);
    }

    return NextResponse.json({
      success: true,
      message: `Experience incremented for ${employees?.length ?? 0} employees.`,
    });
  } catch (err) {
    console.error('Experience increment error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
