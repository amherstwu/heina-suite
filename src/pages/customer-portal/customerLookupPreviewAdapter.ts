import type { CustomerLookupMatch, PreorderLookupMatch } from '../../api/types'
import type { Group, GroupStatus, Order, OrderItem, OrderStatus, PaymentStatus } from '../../daigou/types'
import {
  calcOrderBalance,
  isDaigouOrderShipped,
  isV50GroupReadyToShip,
  normalizeGroupStatus,
  resolveV50Deposit,
} from '../../modules/groupbuy/v50Utils'

function buildV50GroupInternalNotes(groupId: string, status?: string) {
  return `v50GroupId:${groupId} v50Status:${normalizeGroupStatus(status)}`
}

function v50PaymentToDaigou(status: string): PaymentStatus {
  if (status === '已付訂金') return 'deposit_paid'
  if (status === '已結清' || status === '已付款') return 'fully_paid'
  // 貨到付款：無訂金，歸入已處理（尾款待收），不當待付訂金
  if (status === '貨到付款') return 'balance_due'
  return 'unpaid'
}

function v50OrderStatus(groupStatus: string, payment: PaymentStatus): OrderStatus {
  const gs = normalizeGroupStatus(groupStatus)
  if (gs === '已結束') return 'completed'
  if (gs === '已抵台' && payment !== 'unpaid') return 'ready_to_ship'
  if (payment === 'deposit_paid') return 'deposit_paid'
  if (payment === 'fully_paid') return 'fully_paid'
  if (payment === 'balance_due') return 'waiting_balance'
  return 'waiting_deposit'
}

function mapItems(
  orderId: string,
  items: { name: string; qty: number; jpy?: number; twd: number }[],
): OrderItem[] {
  return (items || []).map((it, i) => ({
    productId: `portal_${orderId}_${i}`,
    name: it.name,
    qty: Number(it.qty) || 1,
    jpyUnit: Number(it.jpy) || 0,
    twdUnit: Number(it.twd) || 0,
  }))
}

function portalGroupId(sourceId: string) {
  return `g_portal_${sourceId}`
}

function buildGroup(
  sourceId: string,
  name: string,
  status: string,
  meta: {
    closingDate: string
    saleEndDate: string
    officialShipDate: string
    purchaseLink: string
    orderId?: string
    logisticsId?: string
    remarks?: string
  },
): Group {
  return {
    id: portalGroupId(sourceId),
    name,
    status: (normalizeGroupStatus(status) === '已結束' ? 'completed' : 'open') as GroupStatus,
    closingDate: meta.closingDate || '',
    saleEndDate: meta.saleEndDate || meta.closingDate || '',
    officialShipDate: meta.officialShipDate || '',
    exchangeRate: 0.22,
    jpyAmountTotal: 0,
    orderNumber: meta.orderId || '',
    logisticsNumber: meta.logisticsId || '',
    purchaseLink: meta.purchaseLink || '',
    notes: meta.remarks || '',
    internalNotes: buildV50GroupInternalNotes(sourceId, status),
    createdAt: 0,
  }
}

function buildOrder(
  sourceGroupId: string,
  groupId: string,
  groupStatus: string,
  order: {
    id: string
    customerName: string
    totalTwd: number
    deposit: number
    domesticShip: number
    intlShip: number
    balance: number
    paymentStatus: string
    paymentInfo: string
    items: { name: string; qty: number; jpy?: number; twd: number }[]
  },
): Order {
  const paymentStatus = v50PaymentToDaigou(order.paymentStatus)
  const items = mapItems(order.id, order.items)
  const totalAmount = Number(order.totalTwd) || 0
  const domesticShipping = Number(order.domesticShip) || 0
  const internationalShipping = Number(order.intlShip) || 0
  const deposit = resolveV50Deposit(order.paymentStatus, totalAmount, order.deposit)
  const balance = calcOrderBalance(totalAmount, deposit, domesticShipping, internationalShipping)
  const totalReceived =
    paymentStatus === 'fully_paid' ? totalAmount : paymentStatus === 'deposit_paid' ? deposit : 0
  const isCod = order.paymentStatus === '貨到付款'

  return {
    id: order.id,
    lookupCode: order.id,
    customerId: order.customerName.trim(),
    groupId,
    items,
    deposit,
    balance,
    domesticShipping,
    internationalShipping,
    totalAmount,
    totalReceived,
    outstandingAmount: Math.max(0, totalAmount - totalReceived),
    paymentStatus,
    orderStatus: v50OrderStatus(groupStatus, paymentStatus),
    notes: order.paymentInfo || '',
    internalNote: `v50OrderId:${order.id} v50GroupId:${sourceGroupId}${isCod ? ' v50Payment:貨到付款' : ''}`,
    customerNote: '',
    createdAt: 0,
  }
}

export function customerLookupMatchesToPreview(
  groupbuy: CustomerLookupMatch[],
  preorder: PreorderLookupMatch[],
): { orders: Order[]; groupsById: Map<string, Group> } {
  const groupsById = new Map<string, Group>()
  const orders: Order[] = []

  for (const m of groupbuy) {
    const group = buildGroup(m.groupId, m.groupName, m.groupStatus, {
      closingDate: m.closingDate,
      saleEndDate: m.saleEndDate,
      officialShipDate: m.officialShipDate,
      purchaseLink: m.purchaseLink,
      orderId: m.groupOrderId,
      logisticsId: m.logisticsId,
      remarks: m.remarks,
    })
    groupsById.set(group.id, group)
    orders.push(buildOrder(m.groupId, group.id, m.groupStatus, m.order))
  }

  for (const m of preorder) {
    const group = buildGroup(m.groupId, m.groupName, m.groupStatus, {
      closingDate: m.closingDate,
      saleEndDate: m.saleEndDate,
      officialShipDate: m.officialShipDate,
      purchaseLink: m.purchaseLink,
      orderId: m.groupOrderId,
      logisticsId: m.logisticsId,
    })
    groupsById.set(group.id, group)
    orders.push(buildOrder(m.groupId, group.id, m.groupStatus, m.order))
  }

  return { orders, groupsById }
}

export function countPortalPendingShipOrders(orders: Order[], groupsById: Map<string, Group>): number {
  return orders.filter((o) => {
    const g = groupsById.get(o.groupId)
    if (!isV50GroupReadyToShip(g?.internalNotes)) return false
    return !isDaigouOrderShipped(o.orderStatus)
  }).length
}
