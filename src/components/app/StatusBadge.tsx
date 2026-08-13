import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cx } from './cx'

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info'

const map: Record<BadgeTone, string> = {
  neutral: 'bg-white/[0.07] text-ds-text-secondary ring-1 ring-white/[0.08]',
  ok: 'bg-ds-success/12 text-ds-success ring-1 ring-ds-success/35',
  warn: 'bg-ds-warning/14 text-ds-warning ring-1 ring-ds-warning/40',
  bad: 'bg-ds-danger/14 text-ds-danger ring-1 ring-ds-danger/40',
  info: 'bg-ds-primary/12 text-ds-primary ring-1 ring-ds-primary/35',
}

export function StatusBadge({
  children,
  tone = 'neutral',
  icon: Icon,
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  icon?: LucideIcon
  className?: string
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta font-semibold',
        map[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2.25} /> : null}
      {children}
    </motion.span>
  )
}
