import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import HandbookClient from './HandbookClient';

export default async function HandbookPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const { data: ackData } = await supabase
    .from('handbook_acknowledgements')
    .select('acknowledged_at')
    .eq('employee_id', employee.id)
    .maybeSingle();

  return <HandbookClient employee={employee} existingAck={ackData} />;
}
