import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEquipmentStatusEmail } from '@/lib/resend';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: actor } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!actor) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (!['hr', 'it'].includes(actor.role)) {
      return NextResponse.json({ error: 'Only HR and IT can action equipment requests.' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['approved', 'rejected', 'delivered'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const { data: equipReq, error: fetchError } = await serviceClient
      .from('equipment_requests')
      .select('*, employee:employee_id(id, name, email, employee_code, department)')
      .eq('id', id)
      .single();

    if (fetchError || !equipReq) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    if (status === 'delivered') {
      if (equipReq.status !== 'approved') {
        return NextResponse.json({ error: 'Request must be approved before marking as delivered.' }, { status: 409 });
      }
    } else {
      if (equipReq.status !== 'pending') {
        return NextResponse.json({ error: `Request is already ${equipReq.status}.` }, { status: 409 });
      }
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('equipment_requests')
      .update({
        status,
        approved_by: actor.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, employee:employee_id(id, name, email, employee_code, department)')
      .single();

    if (updateError) throw updateError;

    const actionLabels: Record<string, string> = { approved: 'approved', rejected: 'rejected', delivered: 'marked as delivered' };
    await serviceClient.from('activity_log').insert({
      action: `equipment_${status}`,
      description: `${actor.name} ${actionLabels[status]} equipment request for ${equipReq.employee?.name ?? 'employee'} — ${equipReq.equipment_type}`,
      performed_by: actor.id,
      target_employee_id: equipReq.employee_id,
      action_type: status === 'rejected' ? 'warning' : 'success',
    });

    try {
      const emp = equipReq.employee as { name: string; email: string } | null;
      if (emp?.email) {
        await sendEquipmentStatusEmail({
          employeeEmail: emp.email,
          employeeName: emp.name,
          equipmentType: equipReq.equipment_type,
          status: status as 'approved' | 'rejected' | 'delivered',
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (err) {
    console.error('Equipment PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
