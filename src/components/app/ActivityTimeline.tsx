import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'

export type ActivityTone = 'in' | 'out' | 'neutral'

export type ActivityItem = {
  id: string
  title: string
  subtitle: string
  meta: string
  tone: ActivityTone
}

const iconMap: Record<ActivityTone, LucideIcon> = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
  neutral: Minus,
}

const toneCls: Record<ActivityTone, string> = {
  in: 'border-ds-success/35 bg-ds-success/10 text-ds-success',
  out: 'border-ds-warning/35 bg-ds-warning/10 text-ds-warning',
  neutral: 'border-white/[0.1] bg-white/[0.05] text-ds-text-secondary',
}

export function ActivityTimeline({ items, title = '最近動態' }: { items: ActivityItem[]; title?: string }) {
  return (
    <div>
      <h3 className="mb-4 text-section font-semibold tracking-tight text-ds-text">{title}</h3>
      <ul className="relative space-y-0 pl-2">
        <div className="absolute bottom-2 left-[1.15rem] top-2 w-px bg-gradient-to-b from-ds-primary/40 via-ds-secondary/25 to-transparent" aria-hidden />
        {items.map((it, i) => {
          const Icon = iconMap[it.tone]
          return (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              <div
                className={cx(
                  'relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ring-1 ring-black/20',
                  toneCls[it.tone],
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-ds-surface-raised/50 px-3 py-2.5 backdrop-blur-sm">
                <p className="text-body font-semibold text-ds-text">{it.title}</p>
                <p className="text-meta text-ds-text-secondary">{it.subtitle}</p>
                <p className="mt-1 font-mono text-meta text-ds-text-muted">{it.meta}</p>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
