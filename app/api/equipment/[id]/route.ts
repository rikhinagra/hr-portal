import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: actor } = await serviceClient
      .from('employees').select('id, name, role').eq('auth_user_id', user.id).single();
    if (!actor) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (!['admin', 'hr'].includes(actor.role)) {
      return NextResponse.json({ error: 'Only HR or Admin can edit equipment records.' }, { status: 403 });
    }

    const body = await request.json();
    const { equipment_type, specifications, date_of_issue, device_info, total_value, status } = body;

    if (!equipment_type || !specifications?.trim()) {
      return NextResponse.json({ error: 'Equipment type and specifications are required.' }, { status: 400 });
    }

    const VALID_STATUSES = ['pending', 'approved', 'assigned', 'delivered', 'rejected'];
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }

    const { data: updated, error } = await serviceClient
      .from('equipment_requests')
      .update({
        equipment_type,
        specifications,
        date_of_issue: date_of_issue || null,
        device_info: device_info?.trim() || null,
        total_value: total_value ? Number(total_value) : null,
        ...(status ? { status } : {}),
      })
      .eq('id', id)
      .select('*, employee:employee_id(id, name, email, employee_code, department)')
      .single();

    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'equipment_updated',
      description: `Equipment record updated: ${equipment_type}`,
      performed_by: actor.id,
      action_type: 'info',
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (err) {
    console.error('Equipment PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: actor } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!actor) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (!['admin', 'hr'].includes(actor.role)) {
      return NextResponse.json({ error: 'Only HR or Admin can delete equipment records.' }, { status: 403 });
    }

    const { data: existing } = await serviceClient
      .from('equipment_requests').select('equipment_type').eq('id', id).single();

    const { error } = await serviceClient.from('equipment_requests').delete().eq('id', id);
    if (error) throw error;

    await serviceClient.from('activity_log').insert({
      action: 'equipment_deleted',
      description: `Equipment record deleted: ${existing?.equipment_type ?? 'Unknown'}`,
      performed_by: actor.id,
      action_type: 'warning',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Equipment DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
