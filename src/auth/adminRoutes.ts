/**
 * 後台管理路徑前綴（須通過 RequireAdminAuth + 有效 session）。
 * 顧客公開區（lookup / portal / shop 等）不在此清單。
 */
export const ADMIN_ROUTE_PREFIXES = [
  '/dashboard',
  '/groups',
  '/open-groups-preview',
  '/portal-content',
  '/bank-viewer',
  '/products',
  '/spot-shop',
  '/orders',
  '/customers',
  '/tutorial',
  '/group-rules',
  '/message-templates',
  '/live',
  '/shipping',
  '/procurement',
  '/shipment-records',
  '/myship-records',
  '/portal-preview',
  '/nickname-search',
  '/payment-review',
  '/payment-reports',
  '/customer-preview',
  '/settings',
  '/integrations',
  '/group-buy-center',
  '/groupbuy',
  '/preorder',
] as const

export function isAdminPath(pathname: string): boolean {
  const p = pathname.split('?')[0] || '/'
  if (p === '/login') return false
  return ADMIN_ROUTE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}
