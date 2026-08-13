import type { ReactNode } from 'react'
import { cx } from './cx'

export function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="text-meta font-semibold text-ds-text-muted">{label}</span>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-ds-text-muted">{hint}</div> : null}
    </label>
  )
}
