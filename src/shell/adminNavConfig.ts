import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Package,
  ScrollText,
  ShoppingCart,
  SearchCheck,
  ClipboardCheck,
  Users,
  Truck,
  FileSpreadsheet,
  Megaphone,
  Inbox,
  Settings,
  BookOpen,
  Landmark,
  Radio,
} from 'lucide-react'

/** 後台主導覽（單一來源）：與側欄、手機抽屜、桌面「目前位置」解析共用 */
export type AdminNavItem = {
  to: string
  label: string
  /** 底部導覽用短字 */
  short: string
  icon: LucideIcon
  end?: boolean
  /** 手機底部快捷列是否顯示 */
  mobileQuick?: boolean
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { to: '/dashboard', label: '營運總覽', short: '總覽', icon: LayoutDashboard, end: true, mobileQuick: true },
  { to: '/group-buy-center', label: '開團中心', short: '開團', icon: ScrollText },
  { to: '/groups', label: '團務管理', short: '團務', icon: Package, mobileQuick: true },
  { to: '/open-groups-preview', label: '開團專區', short: '開團', icon: Megaphone },
  { to: '/portal-content', label: '訂單自助後台', short: '自助', icon: BookOpen },
  { to: '/bank-viewer', label: '銀行帳號查詢', short: '匯款', icon: Landmark },
  { to: '/live', label: '連線管理', short: '連線', icon: Radio },
  { to: '/orders', label: '客單管理', short: '客單', icon: ShoppingCart },
  { to: '/nickname-search', label: '暱稱查單', short: '查單', icon: SearchCheck, mobileQuick: true },
  { to: '/payment-review', label: '付款審核', short: '審核', icon: ClipboardCheck, mobileQuick: true },
  { to: '/payment-reports', label: '付款回報', short: '回報', icon: Inbox },
  { to: '/customers', label: '客戶列表', short: '客戶', icon: Users },
  { to: '/shipping', label: '出貨物流', short: '出貨', icon: Truck },
  { to: '/integrations', label: '工具中心', short: '工具', icon: FileSpreadsheet },
  { to: '/settings', label: '系統設定', short: '設定', icon: Settings },
] as const

const SECONDARY_ROUTES: { prefix: string; label: string }[] = [
  { prefix: '/products', label: '商品管理' },
  { prefix: '/spot-shop', label: '現貨商城' },
  { prefix: '/groupbuy', label: '開團 V50' },
  { prefix: '/preorder', label: '預購管理' },
  { prefix: '/shipment-records', label: '出貨紀錄' },
  { prefix: '/myship-records', label: '賣貨便紀錄' },
  { prefix: '/procurement', label: '進貨' },
  { prefix: '/tutorial', label: '操作教學' },
  { prefix: '/group-rules', label: '群規與條款' },
  { prefix: '/message-templates', label: '訊息範本' },
  { prefix: '/portal-content', label: '訂單自助後台' },
  { prefix: '/bank-viewer', label: '銀行帳號查詢' },
  { prefix: '/portal-preview', label: '客戶查詢說明' },
]

export function adminNavLabelForPath(pathname: string): string {
  let best: AdminNavItem | null = null
  for (const n of ADMIN_NAV_ITEMS) {
    const active =
      n.to === '/dashboard' ? pathname === '/dashboard' : pathname === n.to || pathname.startsWith(`${n.to}/`)
    if (!active) continue
    if (!best || n.to.length > best.to.length) best = n
  }
  if (best) return best.label
  let sec: { prefix: string; label: string } | null = null
  for (const s of SECONDARY_ROUTES) {
    if (pathname === s.prefix || pathname.startsWith(`${s.prefix}/`)) {
      if (!sec || s.prefix.length > sec.prefix.length) sec = s
    }
  }
  return sec?.label ?? '營運總覽'
}
