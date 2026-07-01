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

    if (!me || !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Access denied. HR or Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, file_url } = body;

    if (!name?.trim() || !category?.trim() || !file_url?.trim()) {
      return NextResponse.json({ error: 'Policy name, category and link are required.' }, { status: 400 });
    }

    const { data: policy, error } = await serviceClient
      .from('policies')
      .insert({ name: name.trim(), category: category.trim(), file_url: file_url.trim(), is_active: true })
      .select()
      .single();

    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'policy_created',
      description: `Policy "${name.trim()}" added to Policy Library`,
      performed_by: me.id,
      action_type: 'success',
    });

    return NextResponse.json({ success: true, policy });
  } catch (err) {
    console.error('Policies POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
