import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEquipmentRequestEmail } from '@/lib/resend';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: actor } = await serviceClient
      .from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!actor) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (!['admin', 'hr', 'it'].includes(actor.role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { data, error } = await serviceClient
      .from('equipment_requests')
      .select('*, employee:employee_id(id, name, email, employee_code, department)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Equipment GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: actor } = await serviceClient
      .from('employees').select('id, name, role').eq('auth_user_id', user.id).single();
    if (!actor) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (!['admin', 'hr'].includes(actor.role)) {
      return NextResponse.json({ error: 'Only HR or Admin can manage equipment.' }, { status: 403 });
    }

    const body = await request.json();
    const { mode, employee_id, equipment_type, specifications, date_of_issue, device_info, total_value, urgency, notes } = body;

    if (!employee_id || !equipment_type || !specifications?.trim()) {
      return NextResponse.json({ error: 'Employee, equipment type and specifications are required.' }, { status: 400 });
    }

    if (mode === 'request') {
      // HR requesting equipment for an employee — send email to IT
      if (actor.role !== 'hr') {
        return NextResponse.json({ error: 'Only HR can request equipment from IT.' }, { status: 403 });
      }

      const { data: empData } = await serviceClient
        .from('employees').select('name, employee_code, department').eq('id', employee_id).single();
      if (!empData) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

      const { data: req, error: insertError } = await serviceClient
        .from('equipment_requests')
        .insert({
          employee_id,
          equipment_type,
          specifications,
          urgency: urgency ?? 'Normal',
          notes: notes || null,
          status: 'pending',
        })
        .select('*, employee:employee_id(id, name, email, employee_code, department)')
        .single();

      if (insertError) throw insertError;

      try {
        await sendEquipmentRequestEmail({
          employeeName: empData.name,
          employeeCode: empData.employee_code,
          equipmentType: equipment_type,
          specifications,
          urgency: urgency ?? 'Normal',
          notes,
          ccEmails: process.env.EMAIL_HR_DESK ? [process.env.EMAIL_HR_DESK] : [],
        });
      } catch (emailErr) {
        console.error('Email failed (non-fatal):', emailErr);
      }

      await serviceClient.from('activity_log').insert({
        action: 'equipment_requested',
        description: `${actor.name} requested ${equipment_type} for ${empData.name} (${empData.employee_code})`,
        performed_by: actor.id,
        target_employee_id: employee_id,
        action_type: 'info',
      });

      return NextResponse.json({ success: true, request: req });
    } else {
      // HR/Admin adding a direct equipment record
      const { data: req, error: insertError } = await serviceClient
        .from('equipment_requests')
        .insert({
          employee_id,
          equipment_type,
          specifications,
          urgency: 'Normal',
          notes: null,
          status: 'assigned',
          date_of_issue: date_of_issue || null,
          device_info: device_info?.trim() || null,
          total_value: total_value ? Number(total_value) : null,
        })
        .select('*, employee:employee_id(id, name, email, employee_code, department)')
        .single();

      if (insertError) throw insertError;

      await serviceClient.from('activity_log').insert({
        action: 'equipment_assigned',
        description: `${equipment_type} assigned to ${(req.employee as { name?: string } | null)?.name ?? 'employee'}`,
        performed_by: actor.id,
        target_employee_id: employee_id,
        action_type: 'success',
      });

      return NextResponse.json({ success: true, request: req });
    }
  } catch (err) {
    console.error('Equipment POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
