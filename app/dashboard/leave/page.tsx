import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import LeaveClient from './LeaveClient';

export default async function LeavePage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();

  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';

  const query = supabase
    .from('leave_requests')
    .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
    .order('created_at', { ascending: false });

  if (!isAdminOrHr) {
    query.eq('employee_id', employee.id);
  }

  const { data: leaves } = await query;

  return <LeaveClient employee={employee} initialLeaves={leaves ?? []} />;
}
