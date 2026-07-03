import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface NotificationItem {
  id: string;
  type: 'leave' | 'compoff' | 'equipment';
  employeeName: string;
  summary: string;
  href: string;
  created_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: employee } = await serviceClient
      .from('employees').select('role, email').eq('auth_user_id', user.id).single();

    if (!employee) return NextResponse.json({ notifications: [], total: 0 });

    const role = employee.role;
    const isAdminOrHr = ['admin', 'hr'].includes(role);
    const isIT = role === 'it';
    const isManager = role === 'manager';

    if (!isAdminOrHr && !isIT && !isManager) {
      return NextResponse.json({ notifications: [], total: 0 });
    }

    const items: NotificationItem[] = [];

    // 1. Pending leave requests — admin/hr see all, manager sees team's
    if (isAdminOrHr || isManager) {
      const leaveQuery = serviceClient
        .from('leave_requests')
        .select('id, leave_type, days, created_at, employee:employee_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (isManager) {
        const { data: teamMembers } = await serviceClient
          .from('employees').select('id').eq('reporting_manager_email', employee.email).eq('is_active', true);
        const teamIds = (teamMembers ?? []).map((m: { id: string }) => m.id);
        if (teamIds.length > 0) {
          leaveQuery.in('employee_id', teamIds);
        } else {
          // No team members — skip leave notifications
          leaveQuery.eq('employee_id', 'no-match');
        }
      }

      const { data: leaves } = await leaveQuery;

      for (const l of leaves ?? []) {
        const leaveLabel = l.leave_type === 'earned' ? 'Casual Leave' : l.leave_type === 'sick' ? 'Sick Leave' : 'Comp-Off Leave';
        items.push({
          id: `leave-${l.id}`,
          type: 'leave',
          employeeName: (l.employee as { name?: string })?.name ?? 'Employee',
          summary: `${l.days} day${l.days !== 1 ? 's' : ''} · ${leaveLabel}`,
          href: '/dashboard/leave',
          created_at: l.created_at,
        });
      }
    }

    // 2. Pending comp-off claims — admin/hr see all, manager sees team's
    if (isAdminOrHr || isManager) {
      const compoffQuery = serviceClient
        .from('compoff_claims')
        .select('id, work_date, created_at, employee:employee_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (isManager) {
        const { data: teamMembers } = await serviceClient
          .from('employees').select('id').eq('reporting_manager_email', employee.email).eq('is_active', true);
        const teamIds = (teamMembers ?? []).map((m: { id: string }) => m.id);
        if (teamIds.length > 0) {
          compoffQuery.in('employee_id', teamIds);
        } else {
          compoffQuery.eq('employee_id', 'no-match');
        }
      }

      const { data: compoffs } = await compoffQuery;

      for (const c of compoffs ?? []) {
        const workDate = new Date(c.work_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        items.push({
          id: `compoff-${c.id}`,
          type: 'compoff',
          employeeName: (c.employee as { name?: string })?.name ?? 'Employee',
          summary: `Comp-Off claim · Worked ${workDate}`,
          href: '/dashboard/leave',
          created_at: c.created_at,
        });
      }
    }

    // 3. Pending equipment requests — admin, hr, and IT only
    if (isAdminOrHr || isIT) {
      const { data: equipment } = await serviceClient
        .from('equipment_requests')
        .select('id, equipment_type, urgency, created_at, employee:employee_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      for (const e of equipment ?? []) {
        items.push({
          id: `equipment-${e.id}`,
          type: 'equipment',
          employeeName: (e.employee as { name?: string })?.name ?? 'Employee',
          summary: `${e.equipment_type} · ${e.urgency} urgency`,
          href: '/dashboard/equipment',
          created_at: e.created_at,
        });
      }
    }

    // Sort all by newest first
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ notifications: items, total: items.length });
  } catch (err) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
