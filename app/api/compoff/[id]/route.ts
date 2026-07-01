import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendCompOffClaimStatusEmail } from '@/lib/resend';

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

    const isAdminOrHr = approver.role === 'admin' || approver.role === 'hr';
    const isManager = approver.role === 'manager';

    if (!isAdminOrHr && !isManager) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    const { data: claim } = await serviceClient
      .from('compoff_claims')
      .select('*, employee:employee_id(id, name, email, leave_balance_compoff, reporting_manager_email)')
      .eq('id', id)
      .single();

    if (!claim) return NextResponse.json({ error: 'Comp-off claim not found.' }, { status: 404 });

    // Nobody can approve their own comp-off claim
    if (approver.id === claim.employee_id) {
      return NextResponse.json({ error: 'You cannot approve your own comp-off claim.' }, { status: 403 });
    }

    // Manager can only action direct reports' comp-off claims
    if (isManager) {
      const emp = claim.employee as { reporting_manager_email?: string } | null;
      if (emp?.reporting_manager_email !== approver.email) {
        return NextResponse.json({ error: 'Access denied. You can only manage your direct reports\' comp-off claims.' }, { status: 403 });
      }
    }

    // Conflict protection
    if (claim.status !== 'pending') {
      let approverName = 'another admin';
      if (claim.approved_by) {
        const { data: prevApprover } = await serviceClient
          .from('employees').select('name').eq('id', claim.approved_by).single();
        if (prevApprover) approverName = prevApprover.name;
      }
      return NextResponse.json({
        error: `This claim has already been ${claim.status} by ${approverName}.`,
      }, { status: 409 });
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('compoff_claims')
      .update({ status, approved_by: approver.id, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Add +1 comp-off balance on approval
    if (status === 'approved') {
      const { data: empData } = await serviceClient
        .from('employees').select('leave_balance_compoff').eq('id', claim.employee_id).single();

      if (empData) {
        await serviceClient
          .from('employees')
          .update({ leave_balance_compoff: empData.leave_balance_compoff + 1 })
          .eq('id', claim.employee_id);
      }
    }

    await serviceClient.from('activity_log').insert({
      action: `compoff_${status}`,
      description: `${approver.name} ${status} comp-off claim for ${claim.employee?.name ?? 'Unknown'} (worked on ${claim.work_date})`,
      performed_by: approver.id,
      target_employee_id: claim.employee_id,
      action_type: status === 'approved' ? 'success' : 'warning',
    });

    try {
      if (claim.employee?.email) {
        await sendCompOffClaimStatusEmail({
          employeeEmail: claim.employee.email,
          employeeName: claim.employee.name,
          status,
          workDate: claim.work_date,
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, claim: updated });
  } catch (err) {
    console.error('Compoff PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
