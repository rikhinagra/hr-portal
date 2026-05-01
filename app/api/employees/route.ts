import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('role').eq('auth_user_id', user.id).single();

    if (!employee || employee.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const { data, error } = await serviceClient
      .from('employees')
      .select('id, employee_code, name, department, designation, role, email, join_date, is_active, created_at')
      .order('employee_code');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Employees GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: admin } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_active } = body;

    const { data, error } = await serviceClient
      .from('employees')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'employee_status_updated',
      description: `Employee account marked as ${is_active ? 'Active' : 'Inactive'}`,
      performed_by: admin.id,
      target_employee_id: id,
      action_type: is_active ? 'success' : 'warning',
    });

    return NextResponse.json({ success: true, employee: data });
  } catch (err) {
    console.error('Employees PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
