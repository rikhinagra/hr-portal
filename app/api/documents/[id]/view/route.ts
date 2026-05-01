import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient.from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch the document record
    const { data: doc } = await serviceClient
      .from('employee_documents')
      .select('*')
      .eq('id', id)
      .single();
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Only the owner or admin/hr can view
    if (doc.employee_id !== me.id && !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract the storage path from the stored public URL
    const cleanUrl = doc.file_url.split('?')[0];
    const pathParts = cleanUrl.split('/employee-documents/');
    if (!pathParts[1]) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }
    const storagePath = decodeURIComponent(pathParts[1]);

    // Generate a signed URL valid for 60 seconds
    const { data: signedData, error: signedError } = await serviceClient.storage
      .from('employee-documents')
      .createSignedUrl(storagePath, 60);

    if (signedError || !signedData?.signedUrl) {
      throw signedError ?? new Error('Failed to generate signed URL');
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl });
  } catch (err) {
    console.error('Doc view error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
