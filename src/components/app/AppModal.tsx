import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppButton } from './AppButton'
import { cx } from './cx'

type Props = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'md' | 'lg'
}

export function AppModal({ open, title, children, onClose, size = 'md' }: Props) {
  const maxW = size === 'lg' ? 'max-w-2xl' : 'max-w-md'
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal"
          className="fixed inset-0 z-[120] flex touch-manipulation items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.button
            type="button"
            aria-label="關閉"
            className="absolute inset-0 cursor-default bg-[#050608]/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className={cx(
              'relative z-10 w-full overflow-y-auto border border-white/[0.1] bg-ds-card/95 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_24px_80px_rgba(0,0,0,0.65),0_0_40px_rgba(91,140,255,0.12)] backdrop-blur-2xl',
              'max-h-[min(88dvh,880px)] rounded-t-3xl rounded-b-none p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:max-h-[min(90vh,880px)] sm:rounded-2xl sm:p-6 sm:pb-6',
              maxW,
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ds-highlight/30 to-transparent" />
            <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
              <h2 className="text-section font-semibold tracking-[-0.02em] text-ds-text">{title}</h2>
              <AppButton variant="ghost" className="!min-h-0 !px-2 !py-1 text-ds-text-muted" onClick={onClose}>
                ✕
              </AppButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
