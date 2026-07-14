import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Only HR/Admin can upload documents' }, { status: 403 });
    }

    const { employee_id, path, file_name, file_size, document_type, document_label } =
      await request.json();

    if (!employee_id || !path || !file_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: docTargetEmp } = await serviceClient.from('employees').select('name').eq('id', employee_id).single();

    const { data: { publicUrl } } = serviceClient.storage
      .from('employee-documents')
      .getPublicUrl(path);

    const { data: doc, error: dbError } = await serviceClient
      .from('employee_documents')
      .insert({
        employee_id,
        document_type: document_type ?? 'ZIP Archive',
        document_label: document_label ?? file_name,
        file_url: publicUrl,
        file_name,
        file_size: file_size ?? null,
        uploaded_by: me.id,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    await serviceClient.from('activity_log').insert({
      action: 'document_uploaded',
      description: `${document_label ?? document_type ?? file_name} uploaded for ${docTargetEmp?.name ?? 'employee'}`,
      performed_by: me.id,
      target_employee_id: employee_id,
      action_type: 'success',
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Document register error:', err);
    return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
  }
}
