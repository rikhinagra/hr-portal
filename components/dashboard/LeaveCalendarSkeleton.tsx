import { Skeleton } from '@/components/ui/skeleton';

// Placeholder shaped exactly like the calendar body in LeaveCalendarPanel (same grids and
// breakpoints), so nothing jumps when the real data arrives.
export default function LeaveCalendarSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6" aria-hidden="true">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-2.5 h-3 w-28" />
        <Skeleton className="mt-4 h-9 w-44 rounded-lg" />
      </div>

      <div className="min-w-0">
        <Skeleton className="mb-2 h-3 w-24" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map(i => (
            <div key={i} className="rounded-xl border p-4">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="mt-4 h-3 w-16" />
              <Skeleton className="mt-2 h-8 w-14" />
              <div className="mt-4 space-y-2.5 border-t pt-3">
                {[0, 1, 2].map(j => (
                  <div key={j} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3.5 w-8" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
