import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEquipmentRequestEmail } from '@/lib/resend';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isPrivileged = ['admin', 'hr', 'it'].includes(employee.role);
    const query = serviceClient
      .from('equipment_requests')
      .select('*, employee:employee_id(name, employee_code, department)')
      .order('created_at', { ascending: false });

    if (!isPrivileged) query.eq('employee_id', employee.id);

    const { data, error } = await query;
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
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (employee.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot submit equipment requests.' }, { status: 403 });
    }

    const body = await request.json();
    const { equipment_type, specifications, urgency, notes } = body;

    if (!equipment_type || !specifications?.trim()) {
      return NextResponse.json({ error: 'Equipment type and specifications are required.' }, { status: 400 });
    }

    const { data: req, error: insertError } = await serviceClient
      .from('equipment_requests')
      .insert({
        employee_id: employee.id,
        equipment_type,
        specifications,
        urgency: urgency ?? 'Normal',
        notes: notes ?? null,
        status: 'pending',
      })
      .select('*, employee:employee_id(name, employee_code, department)')
      .single();

    if (insertError) throw insertError;

    await serviceClient.from('activity_log').insert({
      action: 'equipment_requested',
      description: `${employee.name} submitted an equipment request — ${equipment_type} (${urgency ?? 'Normal'})`,
      performed_by: employee.id,
      action_type: 'info',
    });

    try {
      const ccEmails: string[] = [];
      if (process.env.EMAIL_HR_DESK) ccEmails.push(process.env.EMAIL_HR_DESK);
      await sendEquipmentRequestEmail({
        employeeName: employee.name,
        employeeCode: employee.employee_code,
        equipmentType: equipment_type,
        specifications,
        urgency: urgency ?? 'Normal',
        notes,
        ccEmails,
      });
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, request: req });
  } catch (err) {
    console.error('Equipment POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
