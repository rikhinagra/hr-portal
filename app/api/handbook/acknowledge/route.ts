import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendHandbookAckEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Check if already acknowledged
    const { data: existing } = await serviceClient
      .from('handbook_acknowledgements')
      .select('id')
      .eq('employee_id', employee.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already acknowledged' }, { status: 409 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    const now = new Date().toISOString();

    const { error: insertError } = await serviceClient
      .from('handbook_acknowledgements')
      .insert({ employee_id: employee.id, acknowledged_at: now, ip_address: ip });

    if (insertError) throw insertError;

    // Log activity
    await serviceClient.from('activity_log').insert({
      action: 'handbook_acknowledged',
      description: `${employee.name} acknowledged the Employee Handbook`,
      performed_by: employee.id,
      action_type: 'success',
    });

    // Send email to HR (best effort — don't fail if email fails)
    try {
      await sendHandbookAckEmail({
        employeeName: employee.name,
        employeeCode: employee.employee_code,
        acknowledgedAt: now,
      });
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, acknowledged_at: now });
  } catch (err) {
    console.error('Handbook ack error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
