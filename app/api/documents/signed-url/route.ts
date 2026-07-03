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

    const { employee_id, file_name } = await request.json();
    if (!employee_id || !file_name) {
      return NextResponse.json({ error: 'Missing employee_id or file_name' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = (file_name as string).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${employee_id}/${timestamp}_${safeName}`;

    const { data, error } = await serviceClient.storage
      .from('employee-documents')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
  } catch (err) {
    console.error('Signed URL error:', err);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
