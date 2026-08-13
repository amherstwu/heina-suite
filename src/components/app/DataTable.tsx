import type { ReactNode } from 'react'
import { cx } from './cx'

type Col<T> = {
  key: string
  title: string
  className?: string
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  rows,
  columns,
  emptyText = '尚無資料',
  className,
}: {
  rows: T[]
  columns: Col<T>[]
  emptyText?: string
  className?: string
}) {
  return (
    <div className={cx('overflow-x-auto rounded-2xl border border-white/[0.08] bg-ds-surface-raised/70', className)}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs font-semibold text-ds-text-muted">
            {columns.map((c) => (
              <th key={c.key} className={cx('px-3 py-2.5', c.className)}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-ds-text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-white/[0.04] last:border-b-0">
                {columns.map((c) => (
                  <td key={c.key} className={cx('px-3 py-2.5 text-ds-text-secondary', c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
