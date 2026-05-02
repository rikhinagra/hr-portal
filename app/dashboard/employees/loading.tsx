import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-32 ml-10" />
            <Skeleton className="h-3.5 w-24 ml-auto hidden sm:block" />
            <Skeleton className="h-3.5 w-20 hidden md:block" />
            <Skeleton className="h-3.5 w-16 hidden lg:block" />
          </div>

          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-4 px-4 py-3.5 ${i < 7 ? 'border-b border-border' : ''}`}>
              <Skeleton className="size-9 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-4 w-16 hidden lg:block" />
              <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
