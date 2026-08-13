import { useCallback, useEffect, useState } from 'react'

export type PortalLayoutMode = 'auto' | 'desktop' | 'mobile'
export type PortalEffectiveLayout = 'desktop' | 'mobile'

/** 與 CustomerPortal.layout.css 斷點一致 */
export const PORTAL_DESKTOP_MIN_PX = 1200

const STORAGE_KEY = 'heina.portal.layoutMode'

function modeFromSearch(): PortalLayoutMode | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('view')
  if (v === 'desktop' || v === 'mobile') return v
  return null
}

function readMode(): PortalLayoutMode {
  const fromUrl = modeFromSearch()
  if (fromUrl) return fromUrl
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'desktop' || v === 'mobile' || v === 'auto') return v
  } catch {
    /* ignore */
  }
  return 'auto'
}

export function resolvePortalEffectiveLayout(mode: PortalLayoutMode): PortalEffectiveLayout {
  if (mode === 'desktop') return 'desktop'
  if (mode === 'mobile') return 'mobile'
  if (typeof window === 'undefined') return 'mobile'
  return window.matchMedia(`(min-width: ${PORTAL_DESKTOP_MIN_PX}px)`).matches ? 'desktop' : 'mobile'
}

/** 顧客專區／官網：auto 依螢幕寬度；可手動切換網站版或手機版 */
export function usePortalLayoutMode() {
  const [mode, setModeState] = useState<PortalLayoutMode>(() => readMode())
  const [effectiveLayout, setEffectiveLayout] = useState<PortalEffectiveLayout>(() =>
    resolvePortalEffectiveLayout(readMode()),
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    setEffectiveLayout(resolvePortalEffectiveLayout(mode))
    if (mode !== 'auto') return
    const mq = window.matchMedia(`(min-width: ${PORTAL_DESKTOP_MIN_PX}px)`)
    const onChange = () => setEffectiveLayout(resolvePortalEffectiveLayout('auto'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const setMode = useCallback((next: PortalLayoutMode) => {
    setModeState(next)
    setEffectiveLayout(resolvePortalEffectiveLayout(next))
  }, [])

  const layoutClass =
    mode === 'desktop' ? 'kp-view-desktop' : mode === 'mobile' ? 'kp-view-mobile' : 'kp-view-auto'

  return { mode, setMode, layoutClass, effectiveLayout }
}
