import { Lock } from 'lucide-react';
import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import ProfileClient from '@/app/dashboard/profile/ProfileClient';

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionEmployee();
  if (!me) return null;

  if (!['admin', 'hr'].includes(me.role)) {
    return (
      <div className="text-center py-16">
        <Lock className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Admin and HR access only.</p>
      </div>
    );
  }

  const supabase = createServiceClient();
  const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single();
  if (!employee) return <div style={{ padding: 40, color: '#888' }}>Employee not found.</div>;

  const { data: documents } = await supabase.from('employee_documents').select('*').eq('employee_id', id).order('created_at', { ascending: false });
  const { data: equipment } = await supabase.from('equipment_requests').select('*').eq('employee_id', id).order('created_at', { ascending: false });

  return (
    <ProfileClient
      employee={employee}
      documents={documents ?? []}
      equipment={equipment ?? []}
      canEdit={true}
      isOwnProfile={me.id === id}
      viewerRole={me.role}
    />
  );
}
