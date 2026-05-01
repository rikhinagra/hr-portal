import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient.from('employees').select('id, role, photo_url').eq('auth_user_id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const employeeId = formData.get('employee_id') as string;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > 500 * 1024) {
      return NextResponse.json({ error: `Photo too large (${(file.size / 1024).toFixed(0)}KB). Maximum allowed is 500KB.` }, { status: 400 });
    }
    if (employeeId !== me.id && !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- Step 1: Delete the OLD photo from storage (any extension) ---
    // Fetch the target employee's current photo_url (may differ from me if admin editing someone else)
    let existingPhotoUrl = me.photo_url;
    if (employeeId !== me.id) {
      const { data: target } = await serviceClient.from('employees').select('photo_url').eq('id', employeeId).single();
      existingPhotoUrl = target?.photo_url ?? null;
    }

    if (existingPhotoUrl) {
      try {
        // Extract the storage path from the public URL (strip query params first)
        const cleanUrl = existingPhotoUrl.split('?')[0];
        const pathParts = cleanUrl.split('/profile-photos/');
        if (pathParts[1]) {
          await serviceClient.storage.from('profile-photos').remove([decodeURIComponent(pathParts[1])]);
        }
      } catch {
        // Non-fatal — continue with upload even if old file delete fails
      }
    }

    // --- Step 2: Upload the new photo ---
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${employeeId}/avatar.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from('profile-photos')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = serviceClient.storage.from('profile-photos').getPublicUrl(path);
    const photoUrl = `${publicUrl}?t=${Date.now()}`;

    await serviceClient.from('employees').update({ photo_url: photoUrl }).eq('id', employeeId);

    await serviceClient.from('activity_log').insert({
      action: 'photo_updated',
      description: employeeId === me.id ? 'Updated profile photo' : 'Updated employee photo',
      performed_by: me.id,
      target_employee_id: employeeId,
      action_type: 'info',
    });

    return NextResponse.json({ success: true, photo_url: photoUrl });
  } catch (err) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
