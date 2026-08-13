import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cx } from './cx'

type AppCardProps = {
  children: ReactNode
  className?: string
  hover?: boolean
  animateEnter?: boolean
  /** 選中態：較強光暈 */
  selected?: boolean
}

export function AppCard({ children, className, hover = true, animateEnter = true, selected }: AppCardProps) {
  return (
    <motion.div
      initial={animateEnter ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        hover
          ? {
              y: -6,
              scale: 1.01,
              transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            }
          : undefined
      }
      className={cx(
        'relative rounded-2xl border bg-ds-card/95 p-4 backdrop-blur-xl transition-[box-shadow,border-color] duration-200 md:p-6',
        'border-[color:var(--ds-chrome-border-faint)] ds-card-elevated',
        hover && 'hover:border-ds-primary/30 hover:ds-card-elevated-hover',
        selected && 'border-ds-primary/40 ds-glow-primary',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent, var(--ds-chrome-card-top), transparent)',
        }}
      />
      {children}
    </motion.div>
  )
}
