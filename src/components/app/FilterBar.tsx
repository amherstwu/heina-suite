import type { ReactNode } from 'react'
import { cx } from './cx'

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-ds-surface-raised/60 p-3', className)}>
      {children}
    </div>
  )
}
