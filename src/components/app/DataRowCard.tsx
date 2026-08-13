import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cx } from './cx'

type Glow = 'none' | 'success' | 'warning' | 'danger'

const glowRing: Record<Glow, string> = {
  none: '',
  success: 'ring-1 ring-ds-success/45 shadow-[0_0_28px_rgba(34,197,94,0.14)]',
  warning: 'ring-1 ring-ds-warning/45 shadow-[0_0_32px_rgba(245,158,11,0.16)]',
  danger: 'ring-1 ring-ds-danger/55 shadow-[0_0_36px_rgba(239,68,68,0.22)]',
}

type Props = {
  children: ReactNode
  className?: string
  clickable?: boolean
  selected?: boolean
  glow?: Glow
  /** 逾期／警示：紅光脈動 */
  pulse?: boolean
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  role?: 'button' | 'presentation'
  tabIndex?: number
}

export function DataRowCard({
  children,
  className,
  clickable = true,
  selected,
  glow = 'none',
  pulse,
  onClick,
  role,
  tabIndex,
}: Props) {
  const interactive = Boolean(onClick && clickable)
  const r = role ?? (onClick ? 'button' : undefined)
  const ti = tabIndex ?? (onClick ? 0 : undefined)

  return (
    <motion.div
      role={r}
      tabIndex={ti}
      onClick={onClick}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick(e as unknown as MouseEvent<HTMLDivElement>)
        }
      }}
      whileHover={clickable ? { y: -4, scale: 1.005, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } } : undefined}
      whileTap={clickable && onClick ? { scale: 0.99 } : undefined}
      className={cx(
        'rounded-2xl border border-white/[0.07] bg-ds-surface-raised/85 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-200 sm:p-4',
        interactive && 'cursor-pointer hover:border-ds-primary/30 hover:bg-ds-card/80 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(91,140,255,0.12)]',
        selected && 'border-ds-primary/45 bg-ds-primary/[0.07]',
        glowRing[glow],
        pulse && glow === 'danger' && 'animate-ds-pulse-danger',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
