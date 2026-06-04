import { Lock } from 'lucide-react';
import { getSessionEmployee } from '@/lib/auth';
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  if (!['admin', 'hr'].includes(employee.role)) {
    return (
      <div className="text-center py-16">
        <Lock className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Onboarding management is available to HR and Admin users only.</p>
      </div>
    );
  }

  return <OnboardingClient employee={employee} />;
}
