import { redirect } from 'next/navigation';
import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import TimesheetClient from './TimesheetClient';

export default async function TimesheetPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  // Admin does not use Timesheet at all — only HR and reporting managers
  // handle approvals, and Admin isn't meant to even view entries.
  if (employee.role === 'admin') redirect('/dashboard');

  const supabase = createServiceClient();
  const isHr = employee.role === 'hr';
  const isManager = employee.role === 'manager';

  let teamMemberIds: string[] = [];
  if (isManager) {
    const { data: teamMembers } = await supabase
      .from('employees')
      .select('id')
      .eq('reporting_manager_email', employee.email)
      .eq('is_active', true);
    teamMemberIds = (teamMembers ?? []).map((m: { id: string }) => m.id);
  }

  const query = supabase
    .from('timesheet_entries')
    .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (isHr) {
    // no filter — see all
  } else if (isManager) {
    // Managers only review their team; they don't log their own time
    if (teamMemberIds.length === 0) return <TimesheetClient employee={employee} initialEntries={[]} />;
    query.in('employee_id', teamMemberIds);
  } else {
    query.eq('employee_id', employee.id);
  }

  const { data: entries } = await query;

  return <TimesheetClient employee={employee} initialEntries={entries ?? []} />;
}
