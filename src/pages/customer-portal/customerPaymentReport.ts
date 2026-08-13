import { dueDepositAmount } from '../staffLookup/previewUtils'

export function sumSelectedDeposits(orders: import('../../daigou/types').Order[], selectedIds: Set<string>): number {
  return orders.reduce((sum, o) => {
    if (!selectedIds.has(o.id)) return sum
    return sum + dueDepositAmount(o)
  }, 0)
}

export function isValidPaymentLastFive(value: string): boolean {
  return /^\d{5}$/.test(value.trim())
}

export function parsePaymentTotalAmount(value: string): number {
  const n = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
