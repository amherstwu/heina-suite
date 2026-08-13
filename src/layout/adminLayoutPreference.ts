import { useCallback, useEffect, useState } from 'react'

/** 後台版面：自動依螢幕，或可強制網站版／手機版（與顧客前台分開儲存） */
export type AdminLayoutMode = 'auto' | 'desktop' | 'mobile'

const STORAGE_KEY = 'heina.admin.layoutMode'

function modeFromSearch(): AdminLayoutMode | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('adminView')
  if (v === 'desktop' || v === 'mobile') return v
  return null
}

function readMode(): AdminLayoutMode {
  const fromUrl = modeFromSearch()
  if (fromUrl) return fromUrl
  try {
    const legacy = localStorage.getItem('hm.mobile.preview')
    if (legacy === '1') return 'mobile'
  } catch {
    /* ignore */
  }
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'desktop' || v === 'mobile' || v === 'auto') return v
  } catch {
    /* ignore */
  }
  return 'auto'
}

export function useAdminLayoutMode() {
  const [mode, setModeState] = useState<AdminLayoutMode>(() => readMode())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
      localStorage.setItem('hm.mobile.preview', mode === 'mobile' ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.adminView = mode
    }
  }, [mode])

  const setMode = useCallback((next: AdminLayoutMode) => {
    setModeState(next)
  }, [])

  const layoutClass =
    mode === 'desktop' ? 'admin-view-desktop' : mode === 'mobile' ? 'admin-view-mobile' : 'admin-view-auto'

  const forcePhoneFrame = mode === 'mobile'

  return { mode, setMode, layoutClass, forcePhoneFrame }
}
