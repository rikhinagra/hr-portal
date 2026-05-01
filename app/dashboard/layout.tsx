import { redirect } from 'next/navigation';
import { getSessionEmployee } from '@/lib/auth';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const employee = await getSessionEmployee();

  if (!employee) {
    redirect('/login');
  }

  return <DashboardShell employee={employee}>{children}</DashboardShell>;
}
