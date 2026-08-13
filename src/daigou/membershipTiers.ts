import type { Customer, MembershipTierId, Order } from './types'
import { normalizeBankLastFiveCodes } from './customerBankLastFive'

export type MembershipTierDef = {
  id: MembershipTierId
  label: string
  /** 達此金額（含）即為該等（更高等以更高門檻為準） */
  minSpendTwd: number
  /** 給買家看：不顯示金額 */
  memberBenefits: string[]
  /** 後台說明 */
  adminNote: string
}

export const MEMBERSHIP_TIERS: MembershipTierDef[] = [
  {
    id: 'regular',
    label: '一般會員',
    minSpendTwd: 0,
    memberBenefits: ['可參與連線／預購與查單', '依公告之付款與取貨方式'],
    adminNote: '累計認列消費 NT$0 起',
  },
  {
    id: 'bronze',
    label: '青銅會員',
    minSpendTwd: 3_000,
    memberBenefits: ['生日／活動禮遇（依公告）', '新到貨提醒優先（依公告）'],
    adminNote: '累計認列消費 ≥ NT$3,000',
  },
  {
    id: 'silver',
    label: '白銀會員',
    minSpendTwd: 12_000,
    memberBenefits: ['青銅福利外，包材／小禮遇加值（依公告）', '客服通道標示優先（依公告）'],
    adminNote: '累計認列消費 ≥ NT$12,000',
  },
  {
    id: 'gold',
    label: '黃金會員',
    minSpendTwd: 35_000,
    memberBenefits: ['白銀福利外，限量品／熱門店保留序位加成（依公告）', '年度感謝小禮（依公告）'],
    adminNote: '累計認列消費 ≥ NT$35,000',
  },
  {
    id: 'platinum',
    label: '白金會員',
    minSpendTwd: 80_000,
    memberBenefits: ['黃金福利外，專屬許願與到貨通知（依公告）', '可談長期配合方案（另案）'],
    adminNote: '累計認列消費 ≥ NT$80,000',
  },
]

const TIER_BY_SPEND_DESC = [...MEMBERSHIP_TIERS].sort((a, b) => b.minSpendTwd - a.minSpendTwd)

export function tierFromSpend(spendTwd: number): MembershipTierId {
  const n = Math.max(0, Math.floor(spendTwd))
  const hit = TIER_BY_SPEND_DESC.find((t) => n >= t.minSpendTwd)
  return hit?.id ?? 'regular'
}

export function tierDef(id: MembershipTierId): MembershipTierDef {
  return MEMBERSHIP_TIERS.find((t) => t.id === id) ?? MEMBERSHIP_TIERS[0]!
}

/**
 * 累計認列消費：該客戶所有訂單「已實收」加總（後台用於升等，不對買家顯示）。
 * 若日後要改為「僅已出貨訂單」可在此調整條件。
 */
export function computeMembershipSpendTwd(customerId: string, orders: Order[]): number {
  return orders
    .filter((o) => o.customerId === customerId)
    .reduce((sum, o) => sum + Math.max(0, Number(o.totalReceived) || 0), 0)
}

export function normalizeCustomerMembership(c: Customer): Customer {
  return {
    ...c,
    membershipTierId: c.membershipTierId ?? 'regular',
    membershipSpendTwd: c.membershipSpendTwd ?? 0,
    membershipTierLocked: c.membershipTierLocked ?? false,
    bankLastFiveCodes: normalizeBankLastFiveCodes(c.bankLastFiveCodes),
  }
}
