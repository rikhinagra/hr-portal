import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient.from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id') ?? me.id;

    if (employeeId !== me.id && !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data } = await serviceClient.from('employee_documents').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Docs GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient.from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Only HR/Admin can upload documents' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const employeeId = formData.get('employee_id') as string;
    const documentType = formData.get('document_type') as string;
    const documentLabel = formData.get('document_label') as string;

    if (!file || !employeeId || !documentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 50MB.` }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${employeeId}/${timestamp}_${safeName}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from('employee-documents')
      .upload(path, bytes, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = serviceClient.storage.from('employee-documents').getPublicUrl(path);

    const { data: doc, error: dbError } = await serviceClient.from('employee_documents').insert({
      employee_id: employeeId,
      document_type: documentType,
      document_label: documentLabel || documentType,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: me.id,
    }).select().single();

    if (dbError) throw dbError;

    await serviceClient.from('activity_log').insert({
      action: 'document_uploaded',
      description: `${documentLabel || documentType} uploaded for employee`,
      performed_by: me.id,
      target_employee_id: employeeId,
      action_type: 'success',
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Doc upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
