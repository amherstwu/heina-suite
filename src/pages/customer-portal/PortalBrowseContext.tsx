import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { smoothScrollTo } from './portalUtils'
import type { PortalBrowseTab } from './portalUtils'
import { PortalBrowseContext } from './portalBrowseContextShared'

const ANCHOR_TO_TAB: Partial<Record<string, PortalBrowseTab>> = {
  'latest-news': 'news',
  membership: 'member',
  'links-sns': 'links',
  'about-us': 'about',
  faq: 'faq',
  support: 'support',
}

export type { PortalBrowseContextValue } from './portalBrowseContextShared'

export function PortalBrowseProvider({ children }: { children: ReactNode }) {
  const [browseTab, setBrowseTab] = useState<PortalBrowseTab>('news')

  const openBrowseTab = useCallback((tab: PortalBrowseTab) => {
    flushSync(() => {
      setBrowseTab(tab)
    })
    smoothScrollTo('kp-browse')
  }, [])

  const navigatePortalAnchor = useCallback((anchorId: string) => {
    const mapped = ANCHOR_TO_TAB[anchorId]
    if (mapped) {
      flushSync(() => {
        setBrowseTab(mapped)
      })
      smoothScrollTo('kp-browse')
      return
    }
    smoothScrollTo(anchorId)
  }, [])

  const value = useMemo(
    () => ({ browseTab, openBrowseTab, navigatePortalAnchor }),
    [browseTab, openBrowseTab, navigatePortalAnchor],
  )

  return <PortalBrowseContext.Provider value={value}>{children}</PortalBrowseContext.Provider>
}
