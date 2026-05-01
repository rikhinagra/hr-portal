import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendLeaveRequestEmail } from '@/lib/resend';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';
    const query = serviceClient
      .from('leave_requests')
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .order('created_at', { ascending: false });

    if (!isAdminOrHr) query.eq('employee_id', employee.id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error('Leave GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    if (!leave_type || !start_date || !end_date || !reason?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000) + 1;
    if (days < 1) return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });

    const { data: leave, error: insertError } = await serviceClient
      .from('leave_requests')
      .insert({ employee_id: employee.id, leave_type, start_date, end_date, days, reason, status: 'pending' })
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .single();

    if (insertError) throw insertError;

    // Log activity
    await serviceClient.from('activity_log').insert({
      action: 'leave_submitted',
      description: `${employee.name} submitted a ${leave_type} leave request (${days} day${days > 1 ? 's' : ''})`,
      performed_by: employee.id,
      action_type: 'info',
    });

    // Send email
    try {
      const managerEmail = employee.reporting_manager_email ?? process.env.EMAIL_REPORTING_MANAGER!;
      await sendLeaveRequestEmail({
        employeeName: employee.name,
        department: employee.department,
        leaveType: leave_type,
        startDate: start_date,
        endDate: end_date,
        days,
        reason,
        managerEmail,
      });
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, leave });
  } catch (err) {
    console.error('Leave POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
