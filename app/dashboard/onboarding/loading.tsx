import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function OnboardingLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          <Skeleton className="h-5 w-44 mb-1" />

          {/* Form grid */}
          <div className="grid grid-cols-2 gap-4 onboarding-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>

          {/* Info box */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(200,152,94,0.08)' }}>
            <Skeleton className="h-3.5 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-44" />
              ))}
            </div>
          </div>

          <Skeleton className="h-11 w-44 rounded-lg" />
        </CardContent>
      </Card>

      <style>{`@media(max-width:600px){.onboarding-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
