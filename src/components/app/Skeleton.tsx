import { cx } from './cx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-xl bg-white/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent',
        className,
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-ds-card p-6">
      <Skeleton className="mb-4 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}
