import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeEmployees = supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
  let teamCountQuery;
  if (employee.role === 'admin' || employee.role === 'hr') {
    teamCountQuery = activeEmployees;
  } else if (employee.role === 'manager') {
    teamCountQuery = activeEmployees.eq('reporting_manager_email', employee.email);
  } else {
    // employee or IT — count teammates under same reporting manager, excluding self
    teamCountQuery = employee.reporting_manager_email
      ? activeEmployees.eq('reporting_manager_email', employee.reporting_manager_email).neq('id', employee.id)
      : activeEmployees.eq('id', employee.id);
  }

  const [{ count: policiesCount }, { count: teamCount }, { data: ackData }, { data: activityData }] = await Promise.all([
    supabase.from('policies').select('*', { count: 'exact', head: true }).eq('is_active', true),
    teamCountQuery,
    supabase.from('handbook_acknowledgements').select('acknowledged_at').eq('employee_id', employee.id).maybeSingle(),
    (employee.role === 'admin' || employee.role === 'hr')
      ? supabase.from('activity_log')
          .select('*, performer:performed_by(name, employee_code)')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <DashboardClient
      employee={employee}
      policiesCount={policiesCount ?? 0}
      teamCount={teamCount ?? 0}
      handbookAck={ackData}
      activityLog={activityData ?? []}
    />
  );
}
