import { Lock } from 'lucide-react';
import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import EmployeesClient from './EmployeesClient';

export default async function EmployeesPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  if (!['admin', 'hr'].includes(employee.role)) {
    return (
      <div className="text-center py-16">
        <Lock className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Employee directory is available to Admin and HR only.</p>
      </div>
    );
  }

  const supabase = createServiceClient();
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, name, department, designation, role, email, join_date, is_active, created_at, photo_url')
    .order('employee_code');

  return <EmployeesClient employees={employees ?? []} viewerRole={employee.role} />;
}
