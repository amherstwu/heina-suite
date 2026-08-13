import { useContext } from 'react'
import { PortalBrowseContext, type PortalBrowseContextValue } from './portalBrowseContextShared'

export function usePortalBrowse(): PortalBrowseContextValue {
  const ctx = useContext(PortalBrowseContext)
  if (!ctx) {
    throw new Error('usePortalBrowse must be used within PortalBrowseProvider')
  }
  return ctx
}
