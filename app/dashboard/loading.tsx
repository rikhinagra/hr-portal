import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <Skeleton className="size-14 rounded-xl flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="size-9 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions + Activity */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-32 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="size-10 rounded-lg flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="size-4 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="size-2 rounded-full mt-1.5 flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
