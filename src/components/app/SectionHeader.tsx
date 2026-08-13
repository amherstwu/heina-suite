import type { ReactNode } from 'react'
import { cx } from './cx'

type Props = {
  title: string
  subtitle?: string
  action?: ReactNode
  /** page = 28px title, section = 20px */
  variant?: 'page' | 'section'
  className?: string
}

export function SectionHeader({ title, subtitle, action, variant = 'section', className }: Props) {
  const titleCls =
    variant === 'page'
      ? 'admin-page-header-title text-xl font-bold leading-tight tracking-[-0.02em] text-ds-text sm:text-page sm:leading-[var(--text-page--line-height)]'
      : 'admin-page-header-title text-base font-semibold leading-snug tracking-[-0.015em] text-ds-text sm:text-section sm:leading-[var(--text-section--line-height)]'

  return (
    <header
      className={cx(
        'admin-page-header mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-3',
        className,
      )}
    >
      <div className="admin-page-header-text min-w-0">
        <h1 className={titleCls}>{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ds-text-secondary sm:text-body">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <div className="admin-page-header-actions flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {action}
        </div>
      ) : null}
    </header>
  )
}

/** 與舊 PageHeader API 相同 */
export function PageHeader(props: Omit<Props, 'variant'>) {
  return <SectionHeader variant="page" {...props} />
}
