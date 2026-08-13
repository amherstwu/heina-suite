import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { StatusBadge, type BadgeTone } from './StatusBadge'
import { cx } from './cx'

type Props = {
  label: string
  value: string
  icon: LucideIcon
  tone?: BadgeTone
  badgeLabel?: string
  /** 例如 ↑ +5.2% 或 ↓ −1.1% */
  trendLabel?: string
  trendUp?: boolean
  /** 0–1 迷你進度條 */
  trendBar?: number
  delay?: number
  /** 點擊導向（總覽 KPI 穿透篩選） */
  to?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'info',
  badgeLabel = '即時',
  trendLabel,
  trendUp = true,
  trendBar,
  delay = 0,
  to,
}: Props) {
  const TrendIcon = trendUp === false ? TrendingDown : TrendingUp

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.1rem] p-px shadow-[0_0_28px_rgba(91,140,255,0.12)]"
      style={{
        background: 'linear-gradient(135deg, rgba(91,140,255,0.55), rgba(139,92,246,0.35), rgba(34,211,238,0.25))',
      }}
    >
      <div
        className={cx(
          'relative overflow-hidden rounded-2xl border border-white/[0.04] bg-ds-card p-4 sm:p-6',
          'backdrop-blur-xl',
        )}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-ds-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-0 h-24 w-40 rounded-full bg-ds-secondary/10 blur-3xl" />

        <div className="relative flex gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ds-primary/35 via-ds-secondary/20 to-ds-highlight/15 ring-1 ring-white/[0.1] sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 text-ds-highlight sm:h-6 sm:w-6" strokeWidth={1.65} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-meta font-medium uppercase tracking-wide text-ds-text-muted">{label}</p>
            <p className="mt-1 truncate font-mono text-lg font-semibold tracking-tight text-ds-text sm:text-2xl">{value}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={tone}>{badgeLabel}</StatusBadge>
              {trendLabel ? (
                <span
                  className={cx(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-meta font-semibold ring-1',
                    trendUp
                      ? 'text-ds-success ring-ds-success/25 bg-ds-success/10'
                      : 'text-ds-danger ring-ds-danger/25 bg-ds-danger/10',
                  )}
                >
                  <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {trendLabel}
                </span>
              ) : null}
            </div>
            {trendBar != null && trendBar > 0 ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.04]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-ds-primary via-ds-secondary to-ds-highlight"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, trendBar * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22, delay: delay + 0.08 }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )

  if (to) {
    return (
      <Link to={to} className="block rounded-[1.15rem] outline-none ring-offset-0 transition hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-ds-primary/50">
        {inner}
      </Link>
    )
  }
  return inner
}

export function MetricCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('grid grid-cols-12 gap-3 sm:gap-4 md:gap-6', className)}>{children}</div>
}

/** 置於 MetricCardGrid 內：每張佔 12 欄裡的 3 欄（桌面四張一排） */
export function MetricCardCell({ children }: { children: React.ReactNode }) {
  return <div className="col-span-12 sm:col-span-6 xl:col-span-3">{children}</div>
}
