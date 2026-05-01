import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: me } = await serviceClient.from('employees').select('id, role').eq('auth_user_id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const body = await request.json();
    const { employee_id } = body;

    // Access control: employees can only edit themselves; admin/hr can edit anyone
    if (employee_id !== me.id && !['admin', 'hr'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fields anyone with edit access can change
    const updateData: Record<string, unknown> = {
      phone: body.phone || null,
      personal_email: body.personal_email || null,
      current_address: body.current_address || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      ...(body.dob !== undefined && body.dob !== '' ? { dob: body.dob } : {}),
    };

    // Admin and HR fields — full control over all employee details
    if (['admin', 'hr'].includes(me.role)) {
      if (body.name !== undefined && body.name !== '') updateData.name = body.name;
      if (body.email !== undefined && body.email !== '') updateData.email = body.email;
      if (body.employee_code !== undefined && body.employee_code !== '') updateData.employee_code = body.employee_code.toUpperCase();
      if (body.designation !== undefined && body.designation !== '') updateData.designation = body.designation;
      if (body.department !== undefined && body.department !== '') updateData.department = body.department;
      if (body.role !== undefined && body.role !== '') updateData.role = body.role;
      if (body.join_date !== undefined && body.join_date !== '') updateData.join_date = body.join_date;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;
      if (body.reporting_manager_email !== undefined) updateData.reporting_manager_email = body.reporting_manager_email || null;
    }

    const { data: targetEmployee } = await serviceClient
      .from('employees')
      .select('auth_user_id')
      .eq('id', employee_id)
      .single();

    const { error } = await serviceClient.from('employees').update(updateData).eq('id', employee_id);
    if (error) throw error;

    // Keep auth password in sync when DOB changes (DOB is the login password)
    if (body.dob && body.dob !== '' && targetEmployee?.auth_user_id) {
      await serviceClient.auth.admin.updateUserById(targetEmployee.auth_user_id, {
        password: body.dob,
      });
    }

    await serviceClient.from('activity_log').insert({
      action: 'profile_updated',
      description: employee_id === me.id ? 'Updated personal profile' : 'Updated employee profile',
      performed_by: me.id,
      target_employee_id: employee_id,
      action_type: 'info',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
