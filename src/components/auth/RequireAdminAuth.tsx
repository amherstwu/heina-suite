import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useDaigouStore } from '../../daigou/store'
import { isAdminSessionValid } from '../../auth/adminSession'

/**
 * 包住 ProShell 後台：未登入導向 /login。
 * 官網（#/lookup、#/portal、#/shop 等）在 App 頂層公開，不經此閘道。
 * 管理路徑清單見 auth/adminRoutes.ts；登入鎖定見 auth/adminFirewall.ts。
 */
export function RequireAdminAuth() {
  const loc = useLocation()
  const settings = useDaigouStore((s) => s.settings)
  const enabled = settings.adminAuthEnabled !== false

  if (!enabled) return <Outlet />

  if (isAdminSessionValid()) return <Outlet />

  const setup = !(settings.adminPasswordHash ?? '').trim()
  const search = setup ? '?setup=1' : ''
  return <Navigate to={`/login${search}`} replace state={{ from: loc.pathname + loc.search }} />
}
