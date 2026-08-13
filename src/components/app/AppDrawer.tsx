import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppButton } from './AppButton'

type Props = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  side?: 'left' | 'right'
}

export function AppDrawer({ open, title, children, onClose, side = 'right' }: Props) {
  const x = side === 'right' ? 320 : -320
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="關閉選單"
            className="fixed inset-0 z-[130] bg-[#050608]/75 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x }}
            animate={{ x: 0 }}
            exit={{ x }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className={`fixed top-0 z-[131] flex h-dvh w-full max-w-sm touch-manipulation flex-col border-white/[0.08] bg-ds-surface/95 pt-[env(safe-area-inset-top)] shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl ${
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-section font-semibold tracking-tight text-ds-text">{title}</p>
              <AppButton variant="ghost" className="!min-h-11 !min-w-11 !px-0" onClick={onClose} aria-label="關閉選單">
                ✕
              </AppButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
