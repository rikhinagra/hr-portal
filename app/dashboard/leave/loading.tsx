import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import LeaveCalendarSkeleton from '@/components/dashboard/LeaveCalendarSkeleton';

// Mirrors the real Leave page: header, slim summary row, calendar, then the two request lists.
export default function LeaveLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading leave page">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Slim summary row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map(i => (
          <Card key={i} className="gap-0 py-0">
            <CardContent className="px-3 py-3 sm:px-4">
              <Skeleton className="h-3 w-16 sm:w-24" />
              <Skeleton className="mt-2 h-6 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card className="gap-0 py-0">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-40" />
          </div>
          <LeaveCalendarSkeleton />
        </CardContent>
      </Card>

      {/* Leave requests and comp-off claims */}
      {[0, 1].map(section => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-5 w-36" />

          <Card className="hidden gap-0 py-0 md:block">
            <CardContent className="p-0">
              <Skeleton className="h-11 w-full rounded-none" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 border-t px-4 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="gap-0 py-0">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
