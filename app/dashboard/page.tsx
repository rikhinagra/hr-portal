import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [{ count: policiesCount }, { count: teamCount }, { data: ackData }, { data: activityData }] = await Promise.all([
    supabase.from('policies').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
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
