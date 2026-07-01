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
    const isManager = employee.role === 'manager';
    const query = serviceClient
      .from('leave_requests')
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .order('created_at', { ascending: false });

    if (isAdminOrHr) {
      // no filter — see all
    } else if (isManager) {
      const { data: teamMembers } = await serviceClient
        .from('employees')
        .select('id')
        .eq('reporting_manager_email', employee.email)
        .eq('is_active', true);
      const teamIds = (teamMembers ?? []).map((m: { id: string }) => m.id);
      query.in('employee_id', [...teamIds, employee.id]);
    } else {
      query.eq('employee_id', employee.id);
    }

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

    // Admin cannot apply for leave
    if (employee.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot apply for leave.' }, { status: 403 });
    }

    const body = await request.json();
    const { leave_type, start_date, end_date, reason, is_half_day } = body;

    if (!leave_type || !start_date || !end_date || !reason?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!['earned', 'sick', 'compoff'].includes(leave_type)) {
      return NextResponse.json({ error: 'Invalid leave type.' }, { status: 400 });
    }

    const days = is_half_day ? 0.5 : Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000) + 1;
    if (!is_half_day && days < 1) return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });

    // Balance check before allowing submission
    if (leave_type === 'earned' && employee.leave_balance_earned < days) {
      return NextResponse.json({
        error: `Insufficient earned leave balance. You have ${employee.leave_balance_earned} day(s) remaining but requested ${days}.`,
      }, { status: 400 });
    }
    if (leave_type === 'sick' && employee.leave_balance_sick < days) {
      return NextResponse.json({
        error: `Insufficient sick leave balance. You have ${employee.leave_balance_sick} day(s) remaining but requested ${days}.`,
      }, { status: 400 });
    }
    if (leave_type === 'compoff' && employee.leave_balance_compoff < days) {
      return NextResponse.json({
        error: `Insufficient comp-off balance. You have ${employee.leave_balance_compoff} day(s) available but requested ${days}.`,
      }, { status: 400 });
    }

    const { data: leave, error: insertError } = await serviceClient
      .from('leave_requests')
      .insert({ employee_id: employee.id, leave_type, start_date, end_date, days, reason, status: 'pending' })
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .single();

    if (insertError) throw insertError;

    // Log activity
    await serviceClient.from('activity_log').insert({
      action: 'leave_submitted',
      description: `${employee.name} submitted a ${leave_type} leave request (${days === 0.5 ? 'half day' : `${days} day${days > 1 ? 's' : ''}`})`,
      performed_by: employee.id,
      action_type: 'info',
    });

    // Smart email routing
    try {
      const { data: admins } = await serviceClient
        .from('employees')
        .select('email')
        .eq('role', 'admin')
        .eq('is_active', true);

      const adminEmails = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean) as string[];
      const fallbackAdmin = process.env.EMAIL_REPORTING_MANAGER!;
      const toAdmins = adminEmails.length > 0 ? adminEmails : [fallbackAdmin];

      if (employee.role === 'hr') {
        // HR applying → email goes directly to all admins
        await sendLeaveRequestEmail({
          employeeName: employee.name,
          department: employee.department,
          leaveType: leave_type,
          startDate: start_date,
          endDate: end_date,
          days,
          reason,
          toEmails: toAdmins,
          ccEmails: [],
          isHrApplying: true,
        });
      } else if (employee.role === 'manager') {
        // Manager applying → email goes to HR desk, all admins in CC
        const hrDeskEmail = process.env.EMAIL_HR_DESK!;
        await sendLeaveRequestEmail({
          employeeName: employee.name,
          department: employee.department,
          leaveType: leave_type,
          startDate: start_date,
          endDate: end_date,
          days,
          reason,
          toEmails: [hrDeskEmail],
          ccEmails: toAdmins,
          isHrApplying: false,
        });
      } else {
        // Employee / IT applying → email goes to HR desk, admins + reporting manager in CC
        const hrDeskEmail = process.env.EMAIL_HR_DESK!;
        const ccEmails = [...toAdmins];
        if (employee.reporting_manager_email) ccEmails.push(employee.reporting_manager_email);
        await sendLeaveRequestEmail({
          employeeName: employee.name,
          department: employee.department,
          leaveType: leave_type,
          startDate: start_date,
          endDate: end_date,
          days,
          reason,
          toEmails: [hrDeskEmail],
          ccEmails,
          isHrApplying: false,
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, leave });
  } catch (err) {
    console.error('Leave POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
