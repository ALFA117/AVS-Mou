export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-full" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-6 w-24" />
    </div>
  );
}
