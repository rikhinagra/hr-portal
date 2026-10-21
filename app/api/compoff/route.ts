import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendCompOffClaimEmail } from '@/lib/resend';
import { getTeamMemberIds } from '@/lib/teamAccess';

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
    const isManager = employee.role === 'manager';
    const query = serviceClient
      .from('compoff_claims')
      .select('*, employee:employee_id(id, name, employee_code, department, email)')
      .order('created_at', { ascending: false });

    if (isAdminOrHr) {
      // no filter — see all
    } else if (isManager) {
      const teamIds = await getTeamMemberIds(serviceClient, employee.email);
      query.in('employee_id', [...teamIds, employee.id]);
    } else {
      query.eq('employee_id', employee.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error('Compoff GET error:', err);
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

    if (employee.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot submit comp-off claims.' }, { status: 403 });
    }

    // People marked leave_exempt (e.g. a Director) never submit their own comp-off claims
    if (employee.leave_exempt === true) {
      return NextResponse.json({ error: 'Your account does not submit comp-off claims.' }, { status: 403 });
    }

    const body = await request.json();
    const { work_date, intended_leave_date, reason } = body;

    if (!work_date || !intended_leave_date || !reason?.trim()) {
      return NextResponse.json({ error: 'Work date, intended leave date, and reason are required.' }, { status: 400 });
    }

    if (new Date(work_date) > new Date()) {
      return NextResponse.json({ error: 'Work date cannot be in the future.' }, { status: 400 });
    }

    const { data: claim, error: insertError } = await serviceClient
      .from('compoff_claims')
      .insert({ employee_id: employee.id, work_date, intended_leave_date, reason, status: 'pending' })
      .select('*, employee:employee_id(id, name, employee_code, department, email)')
      .single();

    if (insertError) throw insertError;

    await serviceClient.from('activity_log').insert({
      action: 'compoff_claimed',
      description: `${employee.name} submitted a comp-off claim for ${work_date}`,
      performed_by: employee.id,
      action_type: 'info',
    });

    // Email routing — TO: HR Desk, CC: employee's reporting manager
    try {
      const hrDeskEmail = process.env.EMAIL_HR_DESK!;
      const ccEmails: string[] = [];
      if (employee.reporting_manager_email) ccEmails.push(employee.reporting_manager_email);

      await sendCompOffClaimEmail({
        employeeName: employee.name,
        department: employee.department,
        workDate: work_date,
        intendedLeaveDate: intended_leave_date,
        reason,
        toEmails: [hrDeskEmail],
        ccEmails,
        isHrClaiming: employee.role === 'hr',
      });
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, claim });
  } catch (err) {
    console.error('Compoff POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
