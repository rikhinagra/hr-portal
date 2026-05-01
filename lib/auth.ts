import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Employee } from '@/types';

export async function getSessionEmployee(): Promise<Employee | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    return employee ?? null;
  } catch {
    return null;
  }
}
