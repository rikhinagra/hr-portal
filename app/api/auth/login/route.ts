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
        // Check if auth user already exists (e.g. orphaned from a previous attempt)
        const { data: userList } = await serviceClient.auth.admin.listUsers();
        const existingAuthUser = userList?.users?.find(u => u.email === authEmail);

        let authUserId: string | null = existingAuthUser?.id ?? null;

        if (!authUserId) {
          const { data: signUpData, error: signUpError } = await serviceClient.auth.admin.createUser({
            email: authEmail,
            password: authPassword,
            email_confirm: true,
          });

          if (signUpError) {
            console.error('Auth user creation failed:', signUpError.message, signUpError);
            return NextResponse.json({ error: 'Authentication error. Please contact IT.' }, { status: 500 });
          }

          authUserId = signUpData.user.id;
        } else {
          // Auth user exists but password may be out of sync (e.g. DOB was changed) — reset it
          await serviceClient.auth.admin.updateUserById(authUserId, { password: authPassword });
        }

        // Link auth user to employee record
        await serviceClient
          .from('employees')
          .update({ auth_user_id: authUserId })
          .eq('id', employee.id);

        // Now sign in
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (retryError) {
          console.error('Retry sign-in failed:', retryError.message, retryError);
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
