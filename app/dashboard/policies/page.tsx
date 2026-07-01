import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import PoliciesClient from './PoliciesClient';

export default async function PoliciesPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const { data: policies } = await supabase
    .from('policies')
    .select('*')
    .eq('is_active', true)
    .order('created_at');

  return <PoliciesClient policies={policies ?? []} employee={employee} />;
}
