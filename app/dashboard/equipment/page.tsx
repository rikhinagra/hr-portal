import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import EquipmentClient from './EquipmentClient';

export default async function EquipmentPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const isPrivileged = ['admin', 'hr', 'it'].includes(employee.role);

  const query = supabase
    .from('equipment_requests')
    .select('*, employee:employee_id(name, employee_code, department)')
    .order('created_at', { ascending: false });

  if (!isPrivileged) query.eq('employee_id', employee.id);

  const { data: requests } = await query;

  return <EquipmentClient employee={employee} initialRequests={requests ?? []} />;
}
