import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import LeaveClient from './LeaveClient';

export default async function LeavePage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';

  const leaveQuery = supabase
    .from('leave_requests')
    .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
    .order('created_at', { ascending: false });

  if (!isAdminOrHr) leaveQuery.eq('employee_id', employee.id);

  const claimsQuery = supabase
    .from('compoff_claims')
    .select('*, employee:employee_id(id, name, employee_code, department, email)')
    .order('created_at', { ascending: false });

  if (!isAdminOrHr) claimsQuery.eq('employee_id', employee.id);

  const [{ data: leaves }, { data: claims }] = await Promise.all([leaveQuery, claimsQuery]);

  return <LeaveClient employee={employee} initialLeaves={leaves ?? []} initialClaims={claims ?? []} />;
}
