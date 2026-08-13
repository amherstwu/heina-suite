import type { OrderItem } from '../types'

export function itemTotalTwd(items: OrderItem[]) {
  return items.reduce((s, it) => s + it.twdUnit * it.qty, 0)
}

export function defaultDeposit(itemTotal: number) {
  return itemTotal > 20 ? itemTotal - 20 : itemTotal
}

/** 尾款 = 品項淨額 − 訂金 + 運費 + 包材 + 其他 */
export function computeBalance(
  netItemTotal: number,
  deposit: number,
  domesticShipping: number,
  internationalShipping: number,
  packagingFee: number,
  otherFee: number,
) {
  return netItemTotal - deposit + domesticShipping + internationalShipping + packagingFee + otherFee
}

export function totalDue(
  netItemTotal: number,
  domesticShipping: number,
  internationalShipping: number,
  packagingFee: number,
  otherFee: number,
) {
  return netItemTotal + domesticShipping + internationalShipping + packagingFee + otherFee
}

export function buildOrderFinancials(
  items: OrderItem[],
  domesticShipping: number,
  internationalShipping: number,
  depositOverride?: number,
  packagingFee = 0,
  otherFee = 0,
  discount = 0,
) {
  const itemTotal = itemTotalTwd(items)
  const netItem = Math.max(0, itemTotal - Math.max(0, discount))
  const deposit = depositOverride ?? defaultDeposit(netItem)
  const balance = computeBalance(netItem, deposit, domesticShipping, internationalShipping, packagingFee, otherFee)
  const totalAmount = totalDue(netItem, domesticShipping, internationalShipping, packagingFee, otherFee)
  return { itemTotal, deposit, balance, totalAmount }
}
