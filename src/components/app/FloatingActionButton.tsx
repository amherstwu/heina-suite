import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export function FloatingActionButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cx(
        'fixed bottom-24 right-5 z-[90] flex h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-ds-primary via-[#6a7dff] to-ds-secondary text-white shadow-[0_8px_36px_rgba(91,140,255,0.45),0_0_24px_rgba(139,92,246,0.2)] transition-[transform,box-shadow] duration-200 hover:scale-[1.04] hover:shadow-[0_12px_40px_rgba(91,140,255,0.55)] active:scale-[0.96] md:bottom-8',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
