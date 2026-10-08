import { redirect } from 'next/navigation';
import { getSessionEmployee } from '@/lib/auth';
import { getTimesheetAccess } from '@/lib/timesheetAccess';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const employee = await getSessionEmployee();

  if (!employee) {
    redirect('/login');
  }

  // The Timesheet tab is only for people who file a timesheet, approve one, or are HR
  const { hasAccess } = await getTimesheetAccess(employee);

  return <DashboardShell employee={employee} timesheetAccess={hasAccess}>{children}</DashboardShell>;
}
