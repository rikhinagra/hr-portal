import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendOffboardingEmail } from '@/lib/resend';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('role').eq('auth_user_id', user.id).single();

    if (!employee || !['admin', 'hr'].includes(employee.role)) {
      return NextResponse.json({ error: 'Access denied. Admin or HR only.' }, { status: 403 });
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

    if (!admin || !['admin', 'hr'].includes(admin.role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_active } = body;

    const { data: empData } = await serviceClient
      .from('employees')
      .select('name, employee_code, department, designation')
      .eq('id', id)
      .single();

    const { data, error } = await serviceClient
      .from('employees')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'employee_status_updated',
      description: `${empData?.name ?? 'Employee'} marked as ${is_active ? 'Active' : 'Offboarded'}`,
      performed_by: admin.id,
      target_employee_id: id,
      action_type: is_active ? 'success' : 'warning',
    });

    // Send offboarding email to IT when employee is deactivated (best effort)
    if (!is_active && empData) {
      try {
        await sendOffboardingEmail({
          employeeName: empData.name,
          employeeCode: empData.employee_code,
          department: empData.department,
          designation: empData.designation,
        });
      } catch (emailErr) {
        console.error('Offboarding email failed (non-fatal):', emailErr);
      }
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (err) {
    console.error('Employees PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
