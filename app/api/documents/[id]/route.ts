import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient.from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!me || !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: doc } = await serviceClient.from('employee_documents').select('file_url, employee_id, document_label').eq('id', id).single();
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Extract storage path from URL
    const url = new URL(doc.file_url);
    const pathParts = url.pathname.split('/employee-documents/');
    if (pathParts[1]) {
      await serviceClient.storage.from('employee-documents').remove([decodeURIComponent(pathParts[1])]);
    }

    await serviceClient.from('employee_documents').delete().eq('id', id);

    await serviceClient.from('activity_log').insert({
      action: 'document_deleted',
      description: `Deleted document: ${doc.document_label || 'Unknown'}`,
      performed_by: me.id,
      target_employee_id: doc.employee_id,
      action_type: 'warning',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Doc DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
