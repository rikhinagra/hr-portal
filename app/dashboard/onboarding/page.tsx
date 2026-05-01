import { getSessionEmployee } from '@/lib/auth';
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  return <OnboardingClient employee={employee} />;
}
