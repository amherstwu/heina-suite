import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'
import { cx } from './cx'

export type StepItem = {
  id: string
  label: string
}

export function StepTimeline({ steps, activeIndex }: { steps: StepItem[]; activeIndex: number }) {
  return (
    <div className="relative pl-1">
      <div className="absolute bottom-3 left-[0.65rem] top-3 w-px bg-gradient-to-b from-ds-primary/50 via-ds-secondary/30 to-white/[0.06]" aria-hidden />
      <ul className="space-y-4">
        {steps.map((s, i) => {
          const done = i < activeIndex
          const current = i === activeIndex
          return (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="relative flex items-start gap-3"
            >
              <div
                className={cx(
                  'relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ring-2 ring-ds-card',
                  done && 'border-ds-success/50 bg-ds-success/20 text-ds-success',
                  current && !done && 'border-ds-primary/60 bg-ds-primary/15 text-ds-primary shadow-[0_0_16px_rgba(91,140,255,0.35)]',
                  !done && !current && 'border-white/[0.1] bg-ds-surface text-ds-text-muted',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Circle className="h-3 w-3" strokeWidth={2} />}
              </div>
              <div className="pt-0.5">
                <p
                  className={cx(
                    'text-body font-medium',
                    current ? 'text-ds-text' : done ? 'text-ds-text-secondary' : 'text-ds-text-muted',
                  )}
                >
                  {s.label}
                </p>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
