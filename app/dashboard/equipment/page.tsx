import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import EquipmentClient from './EquipmentClient';

export default async function EquipmentPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  if (!['admin', 'hr', 'it'].includes(employee.role)) return null;

  const supabase = createServiceClient();

  const { data: requests } = await supabase
    .from('equipment_requests')
    .select('*, employee:employee_id(id, name, email, employee_code, department)')
    .order('created_at', { ascending: false });

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, employee_code, department')
    .eq('is_active', true)
    .in('role', ['employee', 'manager', 'it', 'hr'])
    .order('name');

  return <EquipmentClient employee={employee} initialRequests={requests ?? []} employees={employees ?? []} />;
}
