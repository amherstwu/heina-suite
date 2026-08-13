import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
  /** 若設定則以 Router `<Link>`（語意為錨點）呈現，勿再外包 `<Link>`，避免錨點包按鈕導致點兩次才導頁 */
  to?: string
  replace?: boolean
  /** 外部連結：原生 `<a>`，勿再外包 `<a><Btn/></a>`（無效巢狀） */
  href?: string
  target?: string
}

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-body font-semibold tracking-tight transition-[transform,box-shadow,filter,background-color,border-color] duration-200 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 sm:min-h-11'

const variants: Record<Variant, string> = {
  primary:
    'border border-white/[0.08] bg-gradient-to-br from-ds-primary via-[#6b7cff] to-ds-secondary text-white shadow-[0_4px_24px_rgba(91,140,255,0.35)] hover:shadow-[0_8px_36px_rgba(91,140,255,0.5),0_0_28px_rgba(34,211,238,0.12)] hover:brightness-[1.06] active:brightness-95',
  secondary:
    'border border-white/[0.1] bg-white/[0.04] text-ds-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md hover:border-ds-primary/25 hover:bg-white/[0.07] hover:shadow-[0_0_24px_rgba(91,140,255,0.1)]',
  ghost:
    'border border-transparent text-ds-text-secondary hover:border-white/[0.06] hover:bg-white/[0.05] hover:text-ds-text',
  danger:
    'border border-red-500/30 bg-gradient-to-br from-red-600 to-red-700 text-white shadow-[0_4px_24px_rgba(239,68,68,0.35)] hover:shadow-[0_8px_32px_rgba(239,68,68,0.45)]',
}

export function AppButton({
  children,
  variant = 'primary',
  className,
  type = 'button',
  to,
  replace,
  href,
  target,
  disabled,
  onClick,
  ...rest
}: AppButtonProps) {
  const cls = cx(base, variants[variant], className)

  if (to) {
    return (
      <Link
        to={to}
        replace={replace}
        className={cx(cls, disabled && 'pointer-events-none opacity-40')}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          onClick?.(e as unknown as MouseEvent<HTMLButtonElement>)
        }}
      >
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noreferrer' : undefined}
        className={cx(cls, disabled && 'pointer-events-none opacity-40')}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          onClick?.(e as unknown as MouseEvent<HTMLButtonElement>)
        }}
      >
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}
