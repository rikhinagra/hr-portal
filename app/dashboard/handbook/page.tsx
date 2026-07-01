import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import HandbookClient from './HandbookClient';
import type { ComplianceRecord } from './HandbookClient';

export default async function HandbookPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';

  const { data: ackData } = await supabase
    .from('handbook_acknowledgements')
    .select('acknowledged_at')
    .eq('employee_id', employee.id)
    .maybeSingle();

  let complianceData: ComplianceRecord[] = [];

  if (isAdminOrHr) {
    const [{ data: employees }, { data: allAcks }] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, employee_code, department, designation')
        .eq('is_active', true)
        .in('role', ['employee', 'it', 'manager'])
        .order('name'),
      supabase
        .from('handbook_acknowledgements')
        .select('employee_id, acknowledged_at'),
    ]);

    const ackMap = new Map((allAcks ?? []).map(a => [a.employee_id, a.acknowledged_at]));
    complianceData = (employees ?? []).map(emp => ({
      ...emp,
      acknowledged_at: ackMap.get(emp.id) ?? null,
    }));
  }

  return <HandbookClient employee={employee} existingAck={ackData} complianceData={complianceData} />;
}
