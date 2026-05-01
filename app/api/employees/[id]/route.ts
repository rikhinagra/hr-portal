import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: admin } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    if (id === admin.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const { data: target } = await serviceClient
      .from('employees').select('id, name, auth_user_id, photo_url').eq('id', id).single();

    if (!target) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    // 1. Delete all document files from storage
    const { data: storageDocs } = await serviceClient.storage
      .from('employee-documents').list(id);

    if (storageDocs && storageDocs.length > 0) {
      const paths = storageDocs.map(f => `${id}/${f.name}`);
      await serviceClient.storage.from('employee-documents').remove(paths);
    }

    // 2. Delete profile photo from storage
    if (target.photo_url) {
      try {
        const cleanUrl = target.photo_url.split('?')[0];
        const parts = cleanUrl.split('/profile-photos/');
        if (parts[1]) {
          await serviceClient.storage.from('profile-photos').remove([decodeURIComponent(parts[1])]);
        }
      } catch {
        // non-fatal — continue even if photo delete fails
      }
    }

    // 3. Delete all related DB records (order matters to avoid FK constraint errors)
    await serviceClient.from('activity_log').delete()
      .or(`target_employee_id.eq.${id},performed_by.eq.${id}`);

    await serviceClient.from('handbook_acknowledgments').delete().eq('employee_id', id);
    await serviceClient.from('employee_documents').delete().eq('employee_id', id);
    await serviceClient.from('leave_requests').delete().eq('employee_id', id);
    await serviceClient.from('equipment_requests').delete().eq('employee_id', id);

    // 4. Delete employee record
    const { error: empError } = await serviceClient.from('employees').delete().eq('id', id);
    if (empError) throw empError;

    // 5. Delete Supabase auth user (login account)
    if (target.auth_user_id) {
      await serviceClient.auth.admin.deleteUser(target.auth_user_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Employee DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
