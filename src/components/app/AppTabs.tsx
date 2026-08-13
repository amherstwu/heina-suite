import { cx } from './cx'

export function AppTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
  className?: string
}) {
  return (
    <div className={cx('inline-flex rounded-xl border border-white/[0.08] bg-ds-surface p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx(
            'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
            value === o.value ? 'bg-ds-primary/20 text-ds-primary' : 'text-ds-text-secondary hover:bg-white/[0.05]',
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
