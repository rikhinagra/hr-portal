import { createServiceClient } from '@/lib/supabase/server';
import type { Employee } from '@/types';

export interface TimesheetAccess {
  /** Has an engineer manager, so logs their own timesheet entries. */
  canFile: boolean;
  /** HR (everyone), or the engineer manager of at least one person. */
  canApprove: boolean;
  isHr: boolean;
  /** The people this person approves (not used for HR, who sees everyone). */
  teamIds: string[];
  /** Whether the Timesheet is shown to this person at all. */
  hasAccess: boolean;
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Who can use the Timesheet, from each person's "engineer manager" (a separate setting from the
 * reporting manager, which keeps deciding leave):
 * - files timesheets: has an engineer manager (admins and HR never log their own time)
 * - approves: is somebody's engineer manager; HR approves everyone
 * - everybody else: no access
 * If the lookup fails (for example the column is not there yet) nobody but HR gets access, and the rest
 * of the portal keeps working.
 */
export async function getTimesheetAccess(employee: Employee): Promise<TimesheetAccess> {
  const isHr = employee.role === 'hr';
  const canFile = !isHr && employee.role !== 'admin' && !!employee.engineer_manager_email?.trim();

  let teamIds: string[] = [];
  if (!isHr) {
    try {
      const { data, error } = await createServiceClient()
        .from('employees')
        .select('id, engineer_manager_email')
        .eq('is_active', true)
        .not('engineer_manager_email', 'is', null);
      if (!error && data) {
        teamIds = (data as { id: string; engineer_manager_email: string | null }[])
          .filter(r => r.id !== employee.id && same(r.engineer_manager_email, employee.email))
          .map(r => r.id);
      }
    } catch {
      teamIds = [];
    }
  }

  const canApprove = isHr || teamIds.length > 0;
  return { canFile, canApprove, isHr, teamIds, hasAccess: canFile || canApprove };
}

/** Whether `approver` may approve or reject an entry written by `entryOwner`. */
export function canActOnEntry(
  approver: Pick<Employee, 'id' | 'email' | 'role'>,
  entryOwner: { id?: string; engineer_manager_email?: string | null } | null,
): boolean {
  if (!entryOwner) return false;
  if (entryOwner.id && entryOwner.id === approver.id) return false;
  if (approver.role === 'hr') return true;
  return same(entryOwner.engineer_manager_email, approver.email);
}
