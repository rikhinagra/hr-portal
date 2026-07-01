import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import EmployeesClient from './EmployeesClient';

export default async function EmployeesPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, name, department, designation, role, email, join_date, is_active, created_at, photo_url, reporting_manager_email')
    .order('employee_code');

  return (
    <EmployeesClient
      employees={employees ?? []}
      viewerRole={employee.role}
      viewerId={employee.id}
      viewerReportingManagerEmail={employee.reporting_manager_email ?? null}
      viewerEmail={employee.email ?? null}
    />
  );
}
