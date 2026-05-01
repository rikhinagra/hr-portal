import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendOnboardingWelcomeEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();

    if (!employee || !['admin', 'hr'].includes(employee.role)) {
      return NextResponse.json({ error: 'Access denied. Admin or HR only.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email: personalEmail, workEmail, designation, department, dob } = body;

    if (!name?.trim() || !personalEmail?.trim() || !workEmail?.trim() || !designation?.trim() || !department?.trim()) {
      return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 });
    }

    // Generate next employee code
    const { data: lastEmp } = await serviceClient
      .from('employees')
      .select('employee_code')
      .like('employee_code', 'AC%')
      .order('employee_code', { ascending: false })
      .limit(1)
      .single();

    let nextNum = 10;
    if (lastEmp?.employee_code) {
      const match = lastEmp.employee_code.match(/AC(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newCode = `AC${String(nextNum).padStart(3, '0')}`;
    const empDob = dob || '2000-01-01';

    // Portal login uses employee code as the auth identifier
    const authEmail = `${newCode.toLowerCase()}@portal.internal`;
    const authPassword = empDob;

    // Create auth user
    const { data: authUser, error: authErr } = await serviceClient.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
    });

    if (authErr) {
      return NextResponse.json({ error: `Auth user creation failed: ${authErr.message}` }, { status: 500 });
    }

    // Create employee record — store the work email in the 'email' field
    const { data: newEmployee, error: empErr } = await serviceClient
      .from('employees')
      .insert({
        employee_code: newCode,
        dob: empDob,
        name: name.trim(),
        email: workEmail.trim().toLowerCase(),      // work email stored here
        personal_email: personalEmail.trim().toLowerCase(), // personal email stored here
        role: 'employee',
        department: department.trim(),
        designation: designation.trim(),
        join_date: new Date().toISOString().split('T')[0],
        leave_balance_earned: 12,
        leave_balance_sick: 7,
        is_active: true,
        auth_user_id: authUser.user.id,
      })
      .select()
      .single();

    if (empErr) {
      return NextResponse.json({ error: `Employee record creation failed: ${empErr.message}` }, { status: 500 });
    }

    // Log activity
    await serviceClient.from('activity_log').insert({
      action: 'employee_onboarded',
      description: `${employee.name} onboarded ${name} (${newCode}) — ${designation}, ${department}`,
      performed_by: employee.id,
      target_employee_id: newEmployee.id,
      action_type: 'success',
    });

    // Send welcome email to personal email (best effort)
    try {
      await sendOnboardingWelcomeEmail({
        newHireName: name,
        designation,
        department,
        personalEmail: personalEmail.trim(),
        workEmail: workEmail.trim(),
        employeeCode: newCode,
        dob: empDob,
      });
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({
      success: true,
      employee_code: newCode,
      employee: newEmployee,
    });
  } catch (err) {
    console.error('Onboarding error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
