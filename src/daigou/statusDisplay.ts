/**
 * 後台／顧客介面共用的狀態顯示文案與徽章語意（與資料 enum 對齊，不變更儲存值）。
 */
import type { OrderStatus, PaymentStatus, ShipmentStatus } from './types'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, SHIPMENT_STATUS_LABEL } from './constants'

export type StatusBadgeTone = 'neutral' | 'info' | 'ok' | 'warn' | 'bad'

/** 後台與顧客端建議的付款狀態中文（商業級用語） */
const PAYMENT_ADMIN: Record<PaymentStatus, string> = {
  unpaid: '待付訂金',
  deposit_paid: '訂金已確認',
  balance_due: '尾款待補',
  fully_paid: '已結清',
  refunded: '已退款',
  overpaid: '溢付待處理',
  partial_refund: '付款待審核',
  bad_debt: '呆帳',
}

/** 後台訂單狀態中文（對齊營運流程） */
const ORDER_ADMIN: Partial<Record<OrderStatus, string>> = {
  pending_confirmation: '已登記',
  confirmed: '已確認',
  waiting_deposit: '已登記',
  deposit_paid: '已確認',
  ordered: '已向官方下單',
  waiting_arrival: '國際運送中',
  arrived: '已抵達台灣',
  sorting: '已抵達台灣',
  waiting_balance: '尾款待補',
  fully_paid: '可安排出貨',
  ready_to_ship: '可安排出貨',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
  risk_flagged: '異常處理',
  stockout_refund: '已取消',
  exception: '異常處理',
}

/** 出貨（Shipment）狀態 — 對照既有 enum */
const SHIPMENT_ADMIN: Record<ShipmentStatus, string> = {
  not_packed: '整理出貨中',
  packed: '整理出貨中',
  shipped: '已出貨',
  delivered: '已送達',
  returned: '配送異常',
}

export function getPaymentStatusLabel(p: PaymentStatus, variant: 'admin' | 'legacy' = 'admin'): string {
  if (variant === 'legacy') return PAYMENT_STATUS_LABEL[p]
  return PAYMENT_ADMIN[p] ?? PAYMENT_STATUS_LABEL[p]
}

export function getOrderStatusLabel(s: OrderStatus, variant: 'admin' | 'legacy' = 'admin'): string {
  if (variant === 'legacy') return ORDER_STATUS_LABEL[s]
  return ORDER_ADMIN[s] ?? ORDER_STATUS_LABEL[s]
}

/** 付款標籤已涵蓋同一階段時，不重複顯示訂單進度標籤 */
export function isOrderStatusRedundantWithPayment(payment: PaymentStatus, order: OrderStatus): boolean {
  if (payment === 'deposit_paid' && (order === 'deposit_paid' || order === 'confirmed')) return true
  if (payment === 'balance_due' && order === 'waiting_balance') return true
  if (payment === 'fully_paid' && (order === 'fully_paid' || order === 'ready_to_ship')) return true
  return false
}

export function getShippingStatusLabel(s: ShipmentStatus, variant: 'admin' | 'legacy' = 'admin'): string {
  if (variant === 'legacy') return SHIPMENT_STATUS_LABEL[s]
  return SHIPMENT_ADMIN[s] ?? SHIPMENT_STATUS_LABEL[s]
}

export function getPaymentBadgeTone(p: PaymentStatus): StatusBadgeTone {
  if (p === 'fully_paid') return 'ok'
  if (p === 'overpaid') return 'warn'
  if (p === 'refunded' || p === 'bad_debt') return 'bad'
  if (p === 'unpaid') return 'neutral'
  if (p === 'balance_due' || p === 'deposit_paid' || p === 'partial_refund') return 'warn'
  return 'info'
}

/** 色塊徽章 class 後綴（order-pay-status--*） */
export function getPaymentStatusBadgeVariant(
  p: PaymentStatus,
): 'pending' | 'warn' | 'ok' | 'neutral' {
  if (p === 'unpaid') return 'pending'
  if (p === 'fully_paid' || p === 'overpaid') return 'ok'
  if (p === 'balance_due' || p === 'deposit_paid' || p === 'partial_refund') return 'warn'
  return 'neutral'
}

export function getOrderBadgeTone(s: OrderStatus): StatusBadgeTone {
  if (s === 'completed' || s === 'shipped') return 'ok'
  if (s === 'cancelled' || s === 'risk_flagged' || s === 'stockout_refund') return 'bad'
  if (s === 'waiting_balance' || s === 'waiting_deposit' || s === 'exception') return 'warn'
  if (s === 'pending_confirmation') return 'neutral'
  return 'info'
}

export function getShippingBadgeTone(s: ShipmentStatus): StatusBadgeTone {
  if (s === 'delivered') return 'ok'
  if (s === 'returned') return 'bad'
  if (s === 'shipped') return 'info'
  return 'neutral'
}

/** 與 UI Chip `tone` 對齊的統一入口 */
export function getStatusBadgeStyle(
  kind: 'payment' | 'order' | 'shipping',
  value: PaymentStatus | OrderStatus | ShipmentStatus,
): StatusBadgeTone {
  if (kind === 'payment') return getPaymentBadgeTone(value as PaymentStatus)
  if (kind === 'order') return getOrderBadgeTone(value as OrderStatus)
  return getShippingBadgeTone(value as ShipmentStatus)
}

/** 與 `StatusBadge` / `Chip` 外觀對齊的 class（inline badge 用） */
export function getStatusBadgeClass(tone: StatusBadgeTone): string {
  const map: Record<StatusBadgeTone, string> = {
    neutral: 'bg-white/[0.07] text-ds-text-secondary ring-1 ring-white/[0.08]',
    ok: 'bg-ds-success/12 text-ds-success ring-1 ring-ds-success/35',
    warn: 'bg-ds-warning/14 text-ds-warning ring-1 ring-ds-warning/40',
    bad: 'bg-ds-danger/14 text-ds-danger ring-1 ring-ds-danger/40',
    info: 'bg-ds-primary/12 text-ds-primary ring-1 ring-ds-primary/35',
  }
  return map[tone] ?? map.neutral
}

export function getStatusBadgeClassFor(
  kind: 'payment' | 'order' | 'shipping',
  value: PaymentStatus | OrderStatus | ShipmentStatus,
): string {
  return getStatusBadgeClass(getStatusBadgeStyle(kind, value))
}
