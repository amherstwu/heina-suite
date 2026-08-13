import type { ReactNode } from 'react'
import { cx } from './cx'

/** 全寬、左對齊；大螢幕上限寬避免無限拉長（Stripe / Linear 做法） */
export function PageLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('admin-page-layout w-full pr-0 text-left', className)}>{children}</div>
}

/** 12 欄網格；網站版／手機版間距由 admin.layout.css 調整 */
export function PageGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('admin-page-grid grid w-full grid-cols-12 gap-3 sm:gap-4', className)}>{children}</div>
}

export function Col({
  span,
  children,
  className,
}: {
  span: 12 | 8 | 7 | 6 | 5 | 4 | 3
  children: ReactNode
  className?: string
}) {
  const map = {
    12: 'col-span-12',
    8: 'col-span-12 lg:col-span-8',
    7: 'col-span-12 lg:col-span-7',
    6: 'col-span-12 lg:col-span-6',
    5: 'col-span-12 lg:col-span-5',
    4: 'admin-col-half col-span-12 md:col-span-6 xl:col-span-4',
    3: 'admin-col-third col-span-12 sm:col-span-6 xl:col-span-3',
  }
  return <div className={cx(map[span], className)}>{children}</div>
}
