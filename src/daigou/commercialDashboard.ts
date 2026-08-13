import type { DaigouState, Order, OrderStatus } from './types'
import { isV50GroupEnded, suggestDeposit } from '../modules/groupbuy/v50Utils'
import { normalizeCustomerNameKey, resolveOrderCustomerDisplayName } from '../modules/groupbuy/customerNameKey'

export type DashboardDeepLink = { to: string; search?: string }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthPrefix() {
  return new Date().toISOString().slice(0, 7)
}

function addDaysISO(base: string, days: number) {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function orderOutstanding(o: Order) {
  const recv = o.totalReceived ?? 0
  if (o.outstandingAmount != null) return Math.max(0, o.outstandingAmount)
  return Math.max(0, o.totalAmount - recv)
}

/** 進行中客單（未取消／未完成） */
export function isActiveCollectableOrder(o: Order) {
  return !['cancelled', 'completed'].includes(o.orderStatus)
}

/** 團務貨到付款鏡像：不收訂金，亦不計入「待收尾款」KPI */
export function isV50CodSyncedOrder(o: Pick<Order, 'internalNote' | 'notes'>): boolean {
  const hay = `${o.internalNote || ''} ${o.notes || ''}`
  return hay.includes('v50Payment:貨到付款')
}

/** 營運總覽／開團中心共用：訂金已付或尾款待補（貨到付款除外） */
export function isPendingBalancePayment(o: Order) {
  if (isV50CodSyncedOrder(o)) return false
  return o.paymentStatus === 'balance_due' || o.paymentStatus === 'deposit_paid'
}

export type PendingDepositCustomerRow = {
  name: string
  orderCount: number
  depositTotal: number
}

/** 單筆未付訂金應收（催款用：排除貨到付款、已結束、已取消／已完成） */
export function dueDepositForUnpaidOrder(
  o: Order,
  groupInternalNotes?: string,
): number {
  if (o.paymentStatus !== 'unpaid' || isV50CodSyncedOrder(o)) return 0
  if (!isActiveCollectableOrder(o)) return 0
  if (isV50GroupEnded(groupInternalNotes)) return 0
  const d = Number(o.deposit) || 0
  return d > 0 ? d : suggestDeposit(o.totalAmount)
}

/** 尚未付訂金：依客人彙總應收訂金（催款名單） */
export function summarizePendingDepositByCustomer(
  orders: Order[],
  customers: { id: string; name: string; lineDisplayName?: string }[],
  groupsById?: Map<string, { internalNotes?: string }>,
): PendingDepositCustomerRow[] {
  const custById = new Map(customers.map((c) => [c.id, c]))
  const map = new Map<string, PendingDepositCustomerRow>()
  for (const o of orders) {
    const g = groupsById?.get(o.groupId)
    const due = dueDepositForUnpaidOrder(o, g?.internalNotes)
    if (due <= 0) continue
    const c = custById.get(o.customerId)
    const name = resolveOrderCustomerDisplayName(o, c, o.customerId || '（未知客人）')
    const key = normalizeCustomerNameKey(name) || name.toLowerCase()
    const row = map.get(key) ?? { name, orderCount: 0, depositTotal: 0 }
    row.orderCount += 1
    row.depositTotal += due
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.depositTotal - a.depositTotal || a.name.localeCompare(b.name, 'zh-Hant'))
}

/** 待收尾款加總（與營運總覽 KPI 同一公式） */
export function summarizePendingBalance(orders: Order[]) {
  const rows = orders.filter((o) => isActiveCollectableOrder(o) && isPendingBalancePayment(o))
  const withBalance = rows.filter((o) => Math.max(0, o.balance) > 0)
  const customerIds = new Set(withBalance.map((o) => o.customerId))
  return {
    pendingBalanceTotal: rows.reduce((a, o) => a + Math.max(0, o.balance), 0),
    pendingBalanceOrderCount: withBalance.length,
    pendingBalanceCustomerCount: customerIds.size,
  }
}

/** 近 N 個月 yyyy-MM 清單（含當月） */
function recentMonths(n: number) {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(x.toISOString().slice(0, 7))
  }
  return out
}

export function commercialDashboard(s: DaigouState) {
  const today = todayISO()
  const month = monthPrefix()

  const incomeThisMonth = s.transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(month))
    .reduce((a, t) => a + t.amount, 0)
  const expenseThisMonth = s.transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(month))
    .reduce((a, t) => a + t.amount, 0)
  const estProfitMonth = incomeThisMonth - expenseThisMonth

  const activeOrder = (o: Order) => !['cancelled', 'completed'].includes(o.orderStatus)

  const groupNotesById = new Map(s.groups.map((g) => [g.id, g]))

  const pendingDepositTwd = s.orders
    .filter((o) => activeOrder(o) && o.paymentStatus === 'unpaid' && !isV50CodSyncedOrder(o))
    .reduce((a, o) => {
      const due = dueDepositForUnpaidOrder(o, groupNotesById.get(o.groupId)?.internalNotes)
      return a + due
    }, 0)

  const pendingDepositByCustomer = summarizePendingDepositByCustomer(
    s.orders,
    s.customers,
    groupNotesById,
  )

  const pendingBalanceTwd = summarizePendingBalance(s.orders).pendingBalanceTotal

  const todayTodos =
    s.orders.filter((o) => o.orderStatus === 'pending_confirmation').length +
    s.groups.filter((g) => !g.archived && (g.status === 'closing_soon' || g.status === 'open')).filter((g) => {
      const close = g.closingDate
      return close >= today && close <= addDaysISO(today, 3)
    }).length +
    s.myShipRecords.filter((r) => r.pickupDeadline && r.pickupDeadline < today && ['待取貨', '已到店', '運送中'].includes(r.status))
      .length

  const unshippedOrderCount = s.orders.filter(
    (o) =>
      activeOrder(o) &&
      ['fully_paid', 'ready_to_ship'].includes(o.orderStatus) &&
      !['shipped', 'completed'].includes(o.orderStatus),
  ).length

  const overdueMyShip = s.myShipRecords.filter(
    (r) => r.status === '逾期未取' || (r.pickupDeadline && r.pickupDeadline < today && ['待取貨', '已到店'].includes(r.status)),
  )

  const closingSoonGroups = s.groups.filter((g) => {
    if (g.archived) return false
    if (!['open', 'closing_soon'].includes(g.status)) return false
    return g.closingDate >= today && g.closingDate <= addDaysISO(today, 7)
  })

  const saleEndingSoonGroups = s.groups.filter((g) => {
    if (g.archived) return false
    if (!['open', 'closing_soon', 'draft'].includes(g.status)) return false
    const end = String(g.saleEndDate || '').trim()
    if (!end) return false
    return end >= today && end <= addDaysISO(today, 7)
  })

  const pickupSoonMyShip = s.myShipRecords.filter((r) => {
    if (!r.pickupDeadline || !['待取貨', '已到店', '運送中'].includes(r.status)) return false
    return r.pickupDeadline >= today && r.pickupDeadline <= addDaysISO(today, 4)
  })

  const recentIncomeTx = [...s.transactions]
    .filter((t) => t.type === 'income' && ['deposit', 'balance', 'shipping_income', 'exchange_gain'].includes(t.category))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)

  const recentShipments = [...s.shipmentRecords].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)

  const months = recentMonths(6)
  const revenueTrend = months.map((m) => ({
    month: m,
    revenue: s.transactions.filter((t) => t.type === 'income' && t.date.startsWith(m)).reduce((a, t) => a + t.amount, 0),
    expense: s.transactions.filter((t) => t.type === 'expense' && t.date.startsWith(m)).reduce((a, t) => a + t.amount, 0),
  }))
  const profitTrend = revenueTrend.map((x) => ({ month: x.month, profit: x.revenue - x.expense }))

  const orderStatusDist: { status: OrderStatus; count: number }[] = []
  const orderStatusSet = new Map<OrderStatus, number>()
  for (const o of s.orders) {
    orderStatusSet.set(o.orderStatus, (orderStatusSet.get(o.orderStatus) ?? 0) + 1)
  }
  for (const [status, count] of orderStatusSet) orderStatusDist.push({ status, count })
  orderStatusDist.sort((a, b) => b.count - a.count)

  const shipStatusDist = new Map<string, number>()
  for (const r of s.shipmentRecords) {
    shipStatusDist.set(r.status, (shipStatusDist.get(r.status) ?? 0) + 1)
  }
  const shipmentStatusDistribution = [...shipStatusDist.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count)

  const customerSpend = s.customers
    .map((c) => ({
      customer: c,
      spent: c.totalSpent ?? s.orders.filter((o) => o.customerId === c.id).reduce((a, o) => a + (o.totalReceived ?? 0), 0),
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6)

  const groupProfits = s.groups
    .filter((g) => !g.archived)
    .map((g) => {
      const income = s.transactions.filter((t) => t.groupId === g.id && t.type === 'income').reduce((a, t) => a + t.amount, 0)
      const expense = s.transactions.filter((t) => t.groupId === g.id && t.type === 'expense').reduce((a, t) => a + t.amount, 0)
      return { group: g, profit: income - expense }
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)

  const overdueRiskAlerts = [
    ...overdueMyShip.slice(0, 5).map((r) => ({
      id: r.id,
      title: `賣貨便逾期未取／將逾期`,
      detail: `${r.receiverStoreName || '門市'} · ${r.pickupDeadline ?? ''}`,
      link: { to: '/myship-records', search: `?focus=${encodeURIComponent(r.id)}` } satisfies DashboardDeepLink,
    })),
    ...s.orders
      .filter((o) => activeOrder(o) && o.balance > 0 && (o.paymentStatus === 'balance_due' || o.paymentStatus === 'unpaid'))
      .slice(0, 4)
      .map((o) => ({
        id: o.id,
        title: `訂單待收款`,
        detail: o.lookupCode,
        link: { to: '/orders', search: `?dash=collect&oid=${o.id}` } satisfies DashboardDeepLink,
      })),
  ].slice(0, 8)

  const receivableOutstanding = s.orders.filter(activeOrder).reduce((a, o) => a + orderOutstanding(o), 0)

  return {
    today,
    month,
    todayTodos,
    pendingDepositTwd,
    pendingDepositByCustomer,
    pendingBalanceTwd,
    incomeThisMonth,
    expenseThisMonth,
    estProfitMonth,
    unshippedOrderCount,
    overdueMyShipCount: overdueMyShip.length,
    closingSoonGroupCount: closingSoonGroups.length,
    saleEndingSoonGroupCount: saleEndingSoonGroups.length,
    pickupSoonMyShipCount: pickupSoonMyShip.length,
    receivableOutstanding,
    recentIncomeTx,
    recentShipments,
    revenueTrend,
    profitTrend,
    orderStatusDistribution: orderStatusDist,
    shipmentStatusDistribution,
    topCustomers: customerSpend,
    topProfitableGroups: groupProfits,
    overdueRiskAlerts,
    links: {
      todayTodos: { to: '/orders', search: '?dash=pending' } satisfies DashboardDeepLink,
      pendingDeposit: { to: '/orders', search: '?dash=wait-deposit' } satisfies DashboardDeepLink,
      pendingBalance: { to: '/orders', search: '?dash=wait-balance' } satisfies DashboardDeepLink,
      unshipped: { to: '/orders', search: '?dash=unshipped' } satisfies DashboardDeepLink,
      overdueMyShip: { to: '/myship-records', search: '?dash=overdue' } satisfies DashboardDeepLink,
      closingGroups: { to: '/groups', search: '?dash=closing' } satisfies DashboardDeepLink,
      saleEndingGroups: { to: '/groups', search: '?dash=sale-end' } satisfies DashboardDeepLink,
      pickupSoon: { to: '/myship-records', search: '?dash=pickup-soon' } satisfies DashboardDeepLink,
      receivable: { to: '/orders', search: '?dash=outstanding' } satisfies DashboardDeepLink,
    } as const,
  }
}
