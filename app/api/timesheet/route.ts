import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { WORK_TYPES } from '@/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Admin does not use Timesheet at all — only HR and reporting managers
    // handle approvals, and Admin isn't meant to even view entries.
    if (employee.role === 'admin') {
      return NextResponse.json({ error: 'Admins do not have access to Timesheet.' }, { status: 403 });
    }

    const isHr = employee.role === 'hr';
    const isManager = employee.role === 'manager';
    const query = serviceClient
      .from('timesheet_entries')
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (isHr) {
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
    console.error('Timesheet GET error:', err);
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

    // Admin manages the system but doesn't log their own timesheet, same as Leave/Comp-off
    if (employee.role === 'admin') {
      return NextResponse.json({ error: 'Admins do not log timesheet entries.' }, { status: 403 });
    }

    const body = await request.json();
    // One submission can carry several task rows (e.g. multiple projects in a day)
    const rows: Record<string, unknown>[] = Array.isArray(body.entries) ? body.entries : [body];

    if (rows.length === 0 || rows.length > 50) {
      return NextResponse.json({ error: 'Submit between 1 and 50 entries at a time.' }, { status: 400 });
    }

    const toInsert: Record<string, unknown>[] = [];
    let totalHours = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const where = rows.length > 1 ? `Row ${i + 1}: ` : '';
      const date = typeof row.date === 'string' ? row.date : '';
      const projectClient = typeof row.project_client === 'string' ? row.project_client.trim() : '';
      const taskActivity = typeof row.task_activity === 'string' ? row.task_activity.trim() : '';
      const workType = typeof row.work_type === 'string' ? row.work_type : '';
      const ticketLink = typeof row.ticket_link === 'string' ? row.ticket_link.trim() : '';

      if (!date || !projectClient || !taskActivity || !workType) {
        return NextResponse.json({ error: `${where}Date, Project/Client, Task/Activity, and Work Type are required.` }, { status: 400 });
      }

      if (!(WORK_TYPES as readonly string[]).includes(workType)) {
        return NextResponse.json({ error: `${where}Invalid work type.` }, { status: 400 });
      }

      const hours = Number(row.duration_hours);
      if (!row.duration_hours || isNaN(hours) || hours <= 0 || hours > 24) {
        return NextResponse.json({ error: `${where}Duration must be a number between 0 and 24 hours.` }, { status: 400 });
      }

      totalHours += hours;
      toInsert.push({
        employee_id: employee.id,
        date,
        project_client: projectClient,
        task_activity: taskActivity,
        duration_hours: hours,
        ticket_link: ticketLink || null,
        work_type: workType,
        status: 'pending',
      });
    }

    const { data: entries, error: insertError } = await serviceClient
      .from('timesheet_entries')
      .insert(toInsert)
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)');

    if (insertError) throw insertError;

    await serviceClient.from('activity_log').insert({
      action: 'timesheet_submitted',
      description: toInsert.length === 1
        ? `${employee.name} logged a timesheet entry for ${toInsert[0].date} (${toInsert[0].work_type}, ${totalHours}h)`
        : `${employee.name} logged ${toInsert.length} timesheet entries (${Number(totalHours.toFixed(2))}h total)`,
      performed_by: employee.id,
      action_type: 'info',
    });

    return NextResponse.json({ success: true, entries });
  } catch (err) {
    console.error('Timesheet POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
