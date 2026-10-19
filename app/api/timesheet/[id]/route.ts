import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { WORK_TYPES, OTHER_WORK_TYPE, TIMESHEET_LIMITS } from '@/types';
import { getTimesheetAccess, canActOnEntry } from '@/lib/timesheetAccess';

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

    // Only HR and the engineer manager of the person can approve or reject (the reporting manager and
    // Admin have no say here, unlike Leave/Comp-off)
    const access = await getTimesheetAccess(approver);
    if (!access.canApprove) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    // A rejection must say why, so the employee knows what to fix
    const reason = typeof body.rejection_reason === 'string' ? body.rejection_reason.trim() : '';
    if (status === 'rejected') {
      if (!reason) return NextResponse.json({ error: 'Please give a reason for rejecting this entry.' }, { status: 400 });
      if (reason.length > 300) return NextResponse.json({ error: 'The reason must be 300 characters or fewer.' }, { status: 400 });
    }

    const { data: entry } = await serviceClient
      .from('timesheet_entries')
      .select('*, employee:employee_id(id, name, email, reporting_manager_email, engineer_manager_email)')
      .eq('id', id)
      .single();

    if (!entry) return NextResponse.json({ error: 'Timesheet entry not found.' }, { status: 404 });

    // Nobody can approve their own entry
    if (approver.id === entry.employee_id) {
      return NextResponse.json({ error: 'You cannot approve your own timesheet entry.' }, { status: 403 });
    }

    // An engineer manager can only action the entries of the people they are the engineer manager for
    const emp = entry.employee as { id?: string; engineer_manager_email?: string | null } | null;
    if (!canActOnEntry(approver, { id: entry.employee_id, engineer_manager_email: emp?.engineer_manager_email })) {
      return NextResponse.json({ error: 'Access denied. You can only manage the entries of the people you are the engineer manager for.' }, { status: 403 });
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
      .update({
        status,
        rejection_reason: status === 'rejected' ? reason : null,
        approved_by: approver.id,
        approved_at: new Date().toISOString(),
      })
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

// Edit your own entry while it is still pending. Approving/rejecting is handled by PATCH above.
export async function PUT(
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

    const access = await getTimesheetAccess(employee);
    if (!access.canFile) {
      return NextResponse.json({ error: 'Only people who have an engineer manager log timesheet entries.' }, { status: 403 });
    }

    const { data: entry } = await serviceClient
      .from('timesheet_entries')
      .select('id, employee_id, status')
      .eq('id', id)
      .single();

    if (!entry) return NextResponse.json({ error: 'Timesheet entry not found.' }, { status: 404 });

    if (entry.employee_id !== employee.id) {
      return NextResponse.json({ error: 'You can only edit your own entries.' }, { status: 403 });
    }
    if (entry.status !== 'pending') {
      return NextResponse.json({
        error: `This entry has already been ${entry.status} and can no longer be edited. Please refresh the page.`,
      }, { status: 409 });
    }

    const body = await request.json();
    const date = typeof body.date === 'string' ? body.date : '';
    const projectClient = typeof body.project_client === 'string' ? body.project_client.trim() : '';
    const taskActivity = typeof body.task_activity === 'string' ? body.task_activity.trim() : '';
    const workType = typeof body.work_type === 'string' ? body.work_type : '';
    const ticketLink = typeof body.ticket_link === 'string' ? body.ticket_link.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const workTypeOther = typeof body.work_type_other === 'string' ? body.work_type_other.trim() : '';

    if (!date || !projectClient || !taskActivity || !workType) {
      return NextResponse.json({ error: 'Date, Project/Client, Task/Activity, and Work Type are required.' }, { status: 400 });
    }
    if (!(WORK_TYPES as readonly string[]).includes(workType)) {
      return NextResponse.json({ error: 'Invalid work type.' }, { status: 400 });
    }
    // "Others" must say what the work was. For every other work type the text is ignored.
    if (workType === OTHER_WORK_TYPE && !workTypeOther) {
      return NextResponse.json({ error: 'Please say what kind of work this was (work type Others).' }, { status: 400 });
    }
    if (workTypeOther.length > TIMESHEET_LIMITS.workTypeOther) {
      return NextResponse.json({ error: `The work type description must be ${TIMESHEET_LIMITS.workTypeOther} characters or fewer.` }, { status: 400 });
    }
    if (projectClient.length > TIMESHEET_LIMITS.project) {
      return NextResponse.json({ error: `Project/Client must be ${TIMESHEET_LIMITS.project} characters or fewer.` }, { status: 400 });
    }
    if (taskActivity.length > TIMESHEET_LIMITS.task) {
      return NextResponse.json({ error: `Task/Activity must be ${TIMESHEET_LIMITS.task} characters or fewer.` }, { status: 400 });
    }
    if (ticketLink.length > TIMESHEET_LIMITS.link) {
      return NextResponse.json({ error: `Link must be ${TIMESHEET_LIMITS.link} characters or fewer.` }, { status: 400 });
    }
    if (comment.length > TIMESHEET_LIMITS.comment) {
      return NextResponse.json({ error: `Comment must be ${TIMESHEET_LIMITS.comment} characters or fewer.` }, { status: 400 });
    }
    const hours = Number(body.duration_hours);
    if (!body.duration_hours || isNaN(hours) || hours < TIMESHEET_LIMITS.minHours || hours > 24) {
      return NextResponse.json({ error: `Duration must be between ${TIMESHEET_LIMITS.minHours} (15 minutes) and 24 hours.` }, { status: 400 });
    }

    if (Math.abs(hours * 100 - Math.round(hours * 100)) > 1e-6) {
      return NextResponse.json({ error: 'Hours can have at most 2 decimal places, for example 1.25.' }, { status: 400 });
    }

    // No more than 24 hours on one date, counting your other entries (rejected ones don't count)
    const { data: others, error: othersError } = await serviceClient
      .from('timesheet_entries')
      .select('duration_hours')
      .eq('employee_id', employee.id)
      .eq('date', date)
      .neq('status', 'rejected')
      .neq('id', id);
    if (othersError) throw othersError;
    const total = (others ?? []).reduce((sum, r) => sum + Number(r.duration_hours), 0) + hours;
    if (total > 24 + 1e-9) {
      return NextResponse.json({ error: `${date}: that would be ${Number(total.toFixed(2))}h logged for one date. The limit is 24h per day.` }, { status: 400 });
    }

    // The status check in the update means a manager's decision made a moment ago can never be overwritten
    const { data: updated, error: updateError } = await serviceClient
      .from('timesheet_entries')
      .update({
        date,
        project_client: projectClient,
        task_activity: taskActivity,
        duration_hours: hours,
        ticket_link: ticketLink || null,
        comment: comment || null,
        work_type: workType,
        work_type_other: workType === OTHER_WORK_TYPE ? workTypeOther : null,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return NextResponse.json({ error: 'This entry was just actioned and can no longer be edited. Please refresh the page.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (err) {
    console.error('Timesheet PUT error:', err);
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
