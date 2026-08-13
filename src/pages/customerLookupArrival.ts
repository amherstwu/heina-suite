import type { GroupStatus } from '../daigou/types'
import { GROUP_STATUS_LABEL } from '../daigou/constants'

const GB_MILESTONE: Record<GroupStatus, number> = {
  draft: 0,
  open: 0,
  closing_soon: 0,
  closed: 1,
  ordered: 1,
  waiting_official_ship: 1,
  international_transit: 2,
  waiting_arrival: 2,
  arrived: 3,
  sorting: 3,
  balance_collection: 3,
  shipping: 4,
  completed: 4,
  cancelled: -1,
}

const GB_LABELS = ['喊單／結單', '已向官方下單', '跨國運送中', '抵台理貨', '出貨／完成'] as const

/** 預購表單常用狀態（自由文字）→ 進度 0–4 */
const PREORDER_KEYWORDS: { re: RegExp; step: number }[] = [
  { re: /取消|退|作廢/, step: -1 },
  { re: /完成|已出|取貨|結案/, step: 4 },
  { re: /出貨|寄出|配送/, step: 4 },
  { re: /到貨|抵台|入庫|理貨/, step: 3 },
  { re: /運送|空運|海運|通關|報關/, step: 2 },
  { re: /採購|下單|已訂|官方|處理中|進行/, step: 1 },
  { re: /開團|收單|結單|預購|待處理|報名/, step: 0 },
]

export function labelGroupStatus(status: string): string {
  if (status in GROUP_STATUS_LABEL) return GROUP_STATUS_LABEL[status as GroupStatus]
  return status || '—'
}

export function groupbuyArrivalTrack(status: string): {
  step: number
  labels: readonly string[]
  statusLabel: string
  cancelled: boolean
} {
  const st = status as GroupStatus
  const cancelled = st === 'cancelled'
  const step = cancelled ? -1 : GB_MILESTONE[st] ?? 0
  return { step, labels: GB_LABELS, statusLabel: labelGroupStatus(status), cancelled }
}

export function preorderArrivalTrack(status: string): {
  step: number
  labels: readonly string[]
  statusLabel: string
  cancelled: boolean
} {
  const s = String(status || '')
  for (const { re, step } of PREORDER_KEYWORDS) {
    if (re.test(s)) {
      if (step === -1) return { step: -1, labels: GB_LABELS, statusLabel: s || '—', cancelled: true }
      return { step, labels: GB_LABELS, statusLabel: s || '—', cancelled: false }
    }
  }
  return { step: 0, labels: GB_LABELS, statusLabel: s || '—', cancelled: false }
}


