import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Reset casual (12) and sick (7) leave for ALL employees — active and inactive
    // Comp-off is NOT reset (earned individually)
    const { error } = await supabase
      .from('employees')
      .update({
        leave_balance_casual: 12,
        leave_balance_sick: 7,
      })
      .not('id', 'is', null);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Annual leave balance reset complete. All employees reset to Casual=12, Sick=7.',
    });
  } catch (err) {
    console.error('Annual leave reset error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
