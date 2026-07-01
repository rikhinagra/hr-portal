import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import LeaveClient from './LeaveClient';

export default async function LeavePage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';
  const isManager = employee.role === 'manager';

  // For manager: fetch direct reports' IDs first
  let teamMemberIds: string[] = [];
  if (isManager) {
    const { data: teamMembers } = await supabase
      .from('employees')
      .select('id')
      .eq('reporting_manager_email', employee.email)
      .eq('is_active', true);
    teamMemberIds = (teamMembers ?? []).map((m: { id: string }) => m.id);
  }

  const leaveQuery = supabase
    .from('leave_requests')
    .select('*, employee:employee_id(id, name, employee_code, department, email, reporting_manager_email)')
    .order('created_at', { ascending: false });

  if (isAdminOrHr) {
    // no filter — see all
  } else if (isManager) {
    leaveQuery.in('employee_id', [...teamMemberIds, employee.id]);
  } else {
    leaveQuery.eq('employee_id', employee.id);
  }

  const claimsQuery = supabase
    .from('compoff_claims')
    .select('*, employee:employee_id(id, name, employee_code, department, email)')
    .order('created_at', { ascending: false });

  if (isAdminOrHr) {
    // no filter — see all
  } else if (isManager) {
    claimsQuery.in('employee_id', [...teamMemberIds, employee.id]);
  } else {
    claimsQuery.eq('employee_id', employee.id);
  }

  const [{ data: leaves }, { data: claims }] = await Promise.all([leaveQuery, claimsQuery]);

  return <LeaveClient employee={employee} initialLeaves={leaves ?? []} initialClaims={claims ?? []} />;
}
