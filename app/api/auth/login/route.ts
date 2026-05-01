import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_code, dob } = body;

    if (!employee_code || !dob) {
      return NextResponse.json({ error: 'Employee Code and Date of Birth are required.' }, { status: 400 });
    }

    // Use service client to look up employee (bypasses RLS for lookup)
    const serviceClient = createServiceClient();

    const { data: employee, error: lookupError } = await serviceClient
      .from('employees')
      .select('*')
      .eq('employee_code', employee_code.toUpperCase())
      .eq('dob', dob)
      .eq('is_active', true)
      .single();

    if (lookupError || !employee) {
      return NextResponse.json({ error: 'Invalid Employee Code or Date of Birth.' }, { status: 401 });
    }

    // Internal auth email/password derived from employee credentials
    const authEmail = `${employee_code.toLowerCase()}@portal.internal`;
    const authPassword = dob;

    // Create browser-facing client with cookie support for session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Try signing in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (signInError) {
      // If user doesn't exist yet, create them (first login)
      if (signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await serviceClient.auth.admin.createUser({
          email: authEmail,
          password: authPassword,
          email_confirm: true,
        });

        if (signUpError) {
          return NextResponse.json({ error: 'Authentication error. Please contact IT.' }, { status: 500 });
        }

        // Link auth user to employee record
        await serviceClient
          .from('employees')
          .update({ auth_user_id: signUpData.user.id })
          .eq('id', employee.id);

        // Now sign in
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (retryError) {
          return NextResponse.json({ error: 'Authentication error. Please contact IT.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Invalid Employee Code or Date of Birth.' }, { status: 401 });
      }
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
