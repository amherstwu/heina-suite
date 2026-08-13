import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { motion } from 'framer-motion'
import { AppCard } from './AppCard'
import { cx } from './cx'

type Props = {
  title: string
  description?: string
  /** 舊版 Empty 的 `hint` 文案 */
  hint?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, hint, icon: Icon = Inbox, action, className }: Props) {
  const body = description ?? hint
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cx('text-center', className)}>
      <AppCard hover={false} className="border-dashed border-white/[0.1] bg-ds-surface/50 !py-16">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ds-primary/20 to-transparent ring-1 ring-ds-primary/20">
          <Icon className="h-7 w-7 text-ds-primary" strokeWidth={1.5} />
        </div>
        <p className="mt-6 text-section font-semibold text-ds-text">{title}</p>
        {body ? <p className="mx-auto mt-2 max-w-md text-body text-ds-text-secondary">{body}</p> : null}
        {action ? <div className="mt-8 flex justify-center gap-3">{action}</div> : null}
      </AppCard>
    </motion.div>
  )
}
