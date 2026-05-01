import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!me || !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden — only Admin/HR can clear activity log' }, { status: 403 });
    }

    // Delete all activity log entries
    const { error } = await serviceClient
      .from('activity_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // neq trick to delete all rows

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Activity clear error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
