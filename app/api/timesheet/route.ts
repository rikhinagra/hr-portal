import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { WORK_TYPES, TIMESHEET_LIMITS } from '@/types';
import { getTimesheetAccess } from '@/lib/timesheetAccess';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const access = await getTimesheetAccess(employee);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'You do not have access to Timesheet.' }, { status: 403 });
    }

    const query = serviceClient
      .from('timesheet_entries')
      .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!access.isHr) {
      // The people you approve, plus yourself if you also log your own time (HR sees everyone)
      query.in('employee_id', [...access.teamIds, ...(access.canFile ? [employee.id] : [])]);
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

    // Only people who have an engineer manager log timesheet entries
    const access = await getTimesheetAccess(employee);
    if (!access.canFile) {
      return NextResponse.json({ error: 'Only people who have an engineer manager log timesheet entries.' }, { status: 403 });
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

      if (projectClient.length > TIMESHEET_LIMITS.project) {
        return NextResponse.json({ error: `${where}Project/Client must be ${TIMESHEET_LIMITS.project} characters or fewer.` }, { status: 400 });
      }
      if (taskActivity.length > TIMESHEET_LIMITS.task) {
        return NextResponse.json({ error: `${where}Task/Activity must be ${TIMESHEET_LIMITS.task} characters or fewer.` }, { status: 400 });
      }
      if (ticketLink.length > TIMESHEET_LIMITS.link) {
        return NextResponse.json({ error: `${where}Link must be ${TIMESHEET_LIMITS.link} characters or fewer.` }, { status: 400 });
      }

      const hours = Number(row.duration_hours);
      if (!row.duration_hours || isNaN(hours) || hours < TIMESHEET_LIMITS.minHours || hours > 24) {
        return NextResponse.json({ error: `${where}Duration must be between ${TIMESHEET_LIMITS.minHours} (15 minutes) and 24 hours.` }, { status: 400 });
      }

      if (Math.abs(hours * 100 - Math.round(hours * 100)) > 1e-6) {
        return NextResponse.json({ error: `${where}Hours can have at most 2 decimal places, for example 1.25.` }, { status: 400 });
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

    // No more than 24 hours on any one date, counting hours already logged (rejected entries don't count)
    const newByDate = new Map<string, number>();
    for (const r of toInsert) newByDate.set(r.date as string, (newByDate.get(r.date as string) ?? 0) + (r.duration_hours as number));
    const { data: existingRows, error: existingError } = await serviceClient
      .from('timesheet_entries')
      .select('date, duration_hours')
      .eq('employee_id', employee.id)
      .in('date', Array.from(newByDate.keys()))
      .neq('status', 'rejected');
    if (existingError) throw existingError;
    const loggedByDate = new Map<string, number>();
    for (const r of existingRows ?? []) loggedByDate.set(r.date, (loggedByDate.get(r.date) ?? 0) + Number(r.duration_hours));
    for (const [d, added] of newByDate) {
      const total = (loggedByDate.get(d) ?? 0) + added;
      if (total > 24 + 1e-9) {
        return NextResponse.json({ error: `${d}: that would be ${Number(total.toFixed(2))}h logged for one date. The limit is 24h per day.` }, { status: 400 });
      }
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
