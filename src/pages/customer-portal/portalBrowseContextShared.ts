import { createContext } from 'react'
import type { PortalBrowseTab } from './portalUtils'

export type PortalBrowseContextValue = {
  browseTab: PortalBrowseTab
  openBrowseTab: (tab: PortalBrowseTab) => void
  navigatePortalAnchor: (anchorId: string) => void
}

export const PortalBrowseContext = createContext<PortalBrowseContextValue | null>(null)
