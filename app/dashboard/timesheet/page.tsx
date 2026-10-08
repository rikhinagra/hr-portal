import { redirect } from 'next/navigation';
import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getTimesheetAccess } from '@/lib/timesheetAccess';
import TimesheetClient from './TimesheetClient';

export default async function TimesheetPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  // Only people who file a timesheet (they have an engineer manager), engineer managers and HR use it
  const access = await getTimesheetAccess(employee);
  if (!access.hasAccess) redirect('/dashboard');

  const supabase = createServiceClient();
  const query = supabase
    .from('timesheet_entries')
    .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (!access.isHr) {
    // The people you approve, plus yourself if you also log your own time (HR sees everyone)
    query.in('employee_id', [...access.teamIds, ...(access.canFile ? [employee.id] : [])]);
  }

  const { data: entries } = await query;

  return <TimesheetClient employee={employee} initialEntries={entries ?? []} canFile={access.canFile} canApprove={access.canApprove} />;
}
