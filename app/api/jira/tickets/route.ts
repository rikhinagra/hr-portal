import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getTimesheetAccess } from '@/lib/timesheetAccess';
import { getAssignedTickets, JiraError, JIRA_MAX_TICKETS } from '@/lib/jira';

// The logged-in person's own Jira tickets, for the Timesheet "Add from Jira" picker.
// Read-only, and only for people who file timesheets and have a Jira account id set.
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const access = await getTimesheetAccess(employee);
    if (!access.canFile || !employee.jira_account_id) {
      return NextResponse.json({ error: 'Jira is not set up for your account.' }, { status: 403 });
    }

    // ?days=90 asks for older tickets too; anything else means the default 30 days
    const days = new URL(request.url).searchParams.get('days') === '90' ? 90 : 30;
    const tickets = await getAssignedTickets(employee.jira_account_id, days);
    return NextResponse.json({ tickets, days, limit: JIRA_MAX_TICKETS }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof JiraError) {
      // Never forward anything but our own safe message
      const status = err.code === 'auth' ? 502 : err.code === 'failed' ? 502 : 503;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('Jira tickets GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
