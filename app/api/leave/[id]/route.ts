import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendLeaveStatusEmail } from '@/lib/resend';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: approver } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!approver) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (approver.role !== 'admin' && approver.role !== 'hr') {
      return NextResponse.json({ error: 'Access denied. Admin or HR only.' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    // Fetch the leave request with employee details
    const { data: leave } = await serviceClient
      .from('leave_requests')
      .select('*, employee:employee_id(name, email, employee_code, leave_balance_earned, leave_balance_sick)')
      .eq('id', id)
      .single();

    if (!leave) return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });

    // Conflict protection — check if already actioned
    if (leave.status !== 'pending') {
      let approverName = 'another admin';
      if (leave.approved_by) {
        const { data: prevApprover } = await serviceClient
          .from('employees')
          .select('name')
          .eq('id', leave.approved_by)
          .single();
        if (prevApprover) approverName = prevApprover.name;
      }
      return NextResponse.json({
        error: `This leave has already been ${leave.status} by ${approverName}.`,
      }, { status: 409 });
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('leave_requests')
      .update({ status, approved_by: approver.id, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Deduct leave balance on approval
    if (status === 'approved') {
      const balanceField = leave.leave_type === 'earned' ? 'leave_balance_earned' : 'leave_balance_sick';
      const { data: empData } = await serviceClient
        .from('employees')
        .select('leave_balance_earned, leave_balance_sick')
        .eq('id', leave.employee_id)
        .single();

      if (empData) {
        const currentBalance = balanceField === 'leave_balance_earned'
          ? empData.leave_balance_earned
          : empData.leave_balance_sick;
        const newBalance = Math.max(0, currentBalance - leave.days);
        await serviceClient
          .from('employees')
          .update({ [balanceField]: newBalance })
          .eq('id', leave.employee_id);
      }
    }

    // Log activity
    await serviceClient.from('activity_log').insert({
      action: `leave_${status}`,
      description: `${approver.name} ${status} leave request for ${leave.employee?.name ?? 'Unknown'}`,
      performed_by: approver.id,
      target_employee_id: leave.employee_id,
      action_type: status === 'approved' ? 'success' : 'warning',
    });

    // Send email to employee
    try {
      if (leave.employee?.email) {
        await sendLeaveStatusEmail({
          employeeEmail: leave.employee.email,
          employeeName: leave.employee.name,
          status,
          startDate: leave.start_date,
          endDate: leave.end_date,
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, leave: updated });
  } catch (err) {
    console.error('Leave PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
