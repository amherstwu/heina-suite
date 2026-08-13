import type { GroupStatus } from '../../daigou/types'
import { ALL_GROUP_STATUSES } from '../../daigou/constants'

export const CUSTOMER_TIMELINE_LABELS = [
  '已登記',
  '已確認付款',
  '已向日本下單',
  '等待官方出貨',
  '國際運送中',
  '已到貨',
  '已出貨／完成',
] as const

function isKnownGroupStatus(s: string): s is GroupStatus {
  return ALL_GROUP_STATUSES.includes(s as GroupStatus)
}

function groupTimelineIndex(groupStatus: string): number {
  if (!isKnownGroupStatus(groupStatus)) {
    const g = String(groupStatus || '')
    if (/取消|退/.test(g)) return -1
    if (/完成|出貨|寄出/.test(g)) return 6
    if (/到貨|抵台|理貨/.test(g)) return 5
    if (/運送|通關|空運/.test(g)) return 4
    if (/官方出貨|等官方/.test(g)) return 3
    if (/下單|採購|已訂/.test(g)) return 2
    return 0
  }
  const st = groupStatus as GroupStatus
  const map: Record<GroupStatus, number> = {
    draft: 0,
    open: 0,
    closing_soon: 0,
    closed: 1,
    ordered: 2,
    waiting_official_ship: 3,
    international_transit: 4,
    waiting_arrival: 4,
    arrived: 5,
    sorting: 5,
    balance_collection: 5,
    shipping: 6,
    completed: 6,
    cancelled: -1,
  }
  return map[st] ?? 0
}

function paymentTimelineIndex(paymentStatus: string): number {
  const p = String(paymentStatus || '').toLowerCase()
  if (/未付|unpaid|待付訂/.test(p)) return 0
  if (/訂金|deposit|已付訂/.test(p)) return 1
  if (/尾款|balance|待補/.test(p)) return 4
  if (/付清|fully|已付清|對帳/.test(p)) return 5
  return 1
}

/** 0–6 對應 CUSTOMER_TIMELINE_LABELS；-1 表示取消／異常 */
export function customerOrderTimelineStep(groupStatus: string, paymentStatus: string): number {
  const g = groupTimelineIndex(groupStatus)
  if (g < 0) return -1
  const pay = paymentTimelineIndex(paymentStatus)
  return Math.min(6, Math.max(g, pay))
}
