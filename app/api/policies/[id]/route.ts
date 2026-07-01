import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();

    if (!me || !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, file_url } = body;

    if (!name?.trim() || !category?.trim() || !file_url?.trim()) {
      return NextResponse.json({ error: 'Policy name, category and link are required.' }, { status: 400 });
    }

    const { data: policy, error } = await serviceClient
      .from('policies')
      .update({ name: name.trim(), category: category.trim(), file_url: file_url.trim() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'policy_updated',
      description: `Policy "${name.trim()}" updated in Policy Library`,
      performed_by: me.id,
      action_type: 'info',
    });

    return NextResponse.json({ success: true, policy });
  } catch (err) {
    console.error('Policy PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();

    if (!me || !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { data: existing } = await serviceClient
      .from('policies').select('name').eq('id', id).single();

    const { error } = await serviceClient.from('policies').delete().eq('id', id);
    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'policy_deleted',
      description: `Policy "${existing?.name ?? 'Unknown'}" removed from Policy Library`,
      performed_by: me.id,
      action_type: 'warning',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Policy DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
