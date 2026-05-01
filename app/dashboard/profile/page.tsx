import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const { data: fullEmployee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employee.id)
    .single();

  const { data: documents } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employee.id)
    .order('created_at', { ascending: false });

  const { data: equipment } = await supabase
    .from('equipment_requests')
    .select('*')
    .eq('employee_id', employee.id)
    .order('created_at', { ascending: false });

  return <ProfileClient employee={fullEmployee ?? employee} documents={documents ?? []} equipment={equipment ?? []} canEdit={true} isOwnProfile={true} viewerRole={employee.role} />;
}
