import type { Customer, MyShipRecord, Order } from '../types'

/** 商業版風險加權（可對接審計／CRM） */
export function computeRiskScore(c: Customer, orders: Order[], myShipRecords?: MyShipRecord[]): number {
  let score = c.riskScore

  const cancelled = orders.filter((o) => o.customerId === c.id && o.orderStatus === 'cancelled').length
  if (cancelled > 0) score += 20 * Math.min(cancelled, 3)

  const overduePay = orders.filter(
    (o) => o.customerId === c.id && (o.paymentStatus === 'balance_due' || o.paymentStatus === 'unpaid') && o.balance > 0,
  ).length
  if (overduePay > 0) score += 30

  if (c.totalUnpaidBalance > 5000) score += 30

  if (myShipRecords) {
    const badMy = myShipRecords.filter(
      (r) => r.customerId === c.id && ['逾期未取', '已退回', '退回中', '異常'].includes(r.status),
    ).length
    if (badMy > 0) score += 30 * Math.min(badMy, 3)
    const returned = myShipRecords.filter((r) => r.customerId === c.id && (r.status === '已退回' || r.status === '退回中')).length
    if (returned > 0) score += 50
  }

  if (c.tags.includes('blacklist')) score += 40
  if (c.tags.includes('new_customer')) score += 10
  if (c.tags.includes('overdue_pickup')) score += 30
  if (c.tags.includes('frequent_changes')) score += 20
  if (c.tags.includes('vip')) score -= 20
  if (c.tags.includes('frequent_buyer')) score -= 10
  if (c.tags.includes('good_payment')) score -= 10

  return Math.max(0, Math.min(100, score))
}

export function riskLevelLabel(score: number): 'low' | 'medium' | 'high' | 'blocked' {
  if (score >= 85) return 'blocked'
  if (score >= 55) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}
