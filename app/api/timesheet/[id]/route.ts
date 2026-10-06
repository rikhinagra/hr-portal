import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

    const isHr = approver.role === 'hr';
    const isManager = approver.role === 'manager';

    // Admin can view everything but does not approve/reject timesheet entries —
    // only the Reporting Manager and HR do, unlike Leave/Comp-off where Admin
    // also has approval power.
    if (!isHr && !isManager) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    const { data: entry } = await serviceClient
      .from('timesheet_entries')
      .select('*, employee:employee_id(name, email, reporting_manager_email)')
      .eq('id', id)
      .single();

    if (!entry) return NextResponse.json({ error: 'Timesheet entry not found.' }, { status: 404 });

    // Nobody can approve their own entry
    if (approver.id === entry.employee_id) {
      return NextResponse.json({ error: 'You cannot approve your own timesheet entry.' }, { status: 403 });
    }

    // Manager can only action direct reports' entries
    if (isManager) {
      const emp = entry.employee as { reporting_manager_email?: string } | null;
      if (emp?.reporting_manager_email !== approver.email) {
        return NextResponse.json({ error: 'Access denied. You can only manage your direct reports\' timesheet entries.' }, { status: 403 });
      }
    }

    // Conflict protection — check if already actioned
    if (entry.status !== 'pending') {
      let approverName = 'another admin';
      if (entry.approved_by) {
        const { data: prevApprover } = await serviceClient
          .from('employees')
          .select('name')
          .eq('id', entry.approved_by)
          .single();
        if (prevApprover) approverName = prevApprover.name;
      }
      return NextResponse.json({
        error: `This entry has already been ${entry.status} by ${approverName}.`,
      }, { status: 409 });
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('timesheet_entries')
      .update({ status, approved_by: approver.id, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await serviceClient.from('activity_log').insert({
      action: `timesheet_${status}`,
      description: `${approver.name} ${status} timesheet entry for ${entry.employee?.name ?? 'Unknown'} (${entry.date})`,
      performed_by: approver.id,
      target_employee_id: entry.employee_id,
      action_type: status === 'approved' ? 'success' : 'warning',
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (err) {
    console.error('Timesheet PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { data: entry } = await serviceClient
      .from('timesheet_entries')
      .select('employee_id, status')
      .eq('id', id)
      .single();

    if (!entry) return NextResponse.json({ error: 'Timesheet entry not found.' }, { status: 404 });

    // Admin does not use Timesheet at all — only HR can delete any entry;
    // everyone else can only delete their own, and only while still pending.
    const isHr = employee.role === 'hr';
    if (employee.role === 'admin') {
      return NextResponse.json({ error: 'Admins do not have access to Timesheet.' }, { status: 403 });
    }

    if (!isHr) {
      if (entry.employee_id !== employee.id) {
        return NextResponse.json({ error: 'You can only delete your own entries.' }, { status: 403 });
      }
      if (entry.status !== 'pending') {
        return NextResponse.json({ error: 'You can only delete a pending entry.' }, { status: 403 });
      }
    }

    const { error: deleteError } = await serviceClient.from('timesheet_entries').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Timesheet DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
