import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function HandbookLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[65vh] overflow-hidden px-8 py-7 space-y-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`pb-7 ${i < 4 ? 'border-b border-border' : ''}`}>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-5 w-56 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgement bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border">
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-10 w-32 rounded-lg flex-shrink-0" />
      </div>
    </div>
  );
}
