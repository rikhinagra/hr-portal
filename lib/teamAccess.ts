import type { createServiceClient } from '@/lib/supabase/server'

// A person can have two managers over them:
//   reporting_manager_email  the day to day manager
//   project_manager_email    an optional second manager (for example a project manager across teams)
// Both links give a manager the same powers: see the person in My Team, review them,
// and approve or reject their leave and comp-off. HR and Admin are never limited by these links.

type Managed = {
  reporting_manager_email?: string | null
  project_manager_email?: string | null
} | null | undefined

export function isManagedBy(person: Managed, managerEmail: string | null | undefined): boolean {
  if (!person || !managerEmail) return false
  return person.reporting_manager_email === managerEmail || person.project_manager_email === managerEmail
}

// The managers to CC when this person sends a request email: the reporting manager and the project manager,
// without blanks and without the same address twice
export function managerCcEmails(person: Managed): string[] {
  if (!person) return []
  const out: string[] = []
  for (const email of [person.reporting_manager_email, person.project_manager_email]) {
    if (email && !out.some((e) => e.toLowerCase() === email.toLowerCase())) out.push(email)
  }
  return out
}

// Ids of the active people this manager looks after, through either link
export async function getTeamMemberIds(
  serviceClient: ReturnType<typeof createServiceClient>,
  managerEmail: string
): Promise<string[]> {
  const [reporting, project] = await Promise.all([
    serviceClient.from('employees').select('id').eq('reporting_manager_email', managerEmail).eq('is_active', true),
    serviceClient.from('employees').select('id').eq('project_manager_email', managerEmail).eq('is_active', true),
  ])
  if (reporting.error) throw reporting.error
  if (project.error) throw project.error
  const ids = [...(reporting.data ?? []), ...(project.data ?? [])].map((m: { id: string }) => m.id)
  return Array.from(new Set(ids))
}
