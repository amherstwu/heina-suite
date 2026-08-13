import type { DaigouState } from './types'

export function dashboardStats(s: DaigouState) {
  const orders = Array.isArray(s.orders) ? s.orders : []
  const transactions = Array.isArray(s.transactions) ? s.transactions : []
  const customers = Array.isArray(s.customers) ? s.customers : []
  const unpaidBalance = orders
    .filter((o) => o.paymentStatus !== 'fully_paid' && o.paymentStatus !== 'refunded')
    .reduce((a, o) => a + Math.max(0, o.balance), 0)
  const depositReceived = transactions
    .filter((t) => t.type === 'income' && t.category === 'deposit')
    .reduce((a, t) => a + t.amount, 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyRevenue = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(thisMonth))
    .reduce((a, t) => a + t.amount, 0)
  const monthlyExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(thisMonth))
    .reduce((a, t) => a + t.amount, 0)
  const estProfit = monthlyRevenue - monthlyExpense
  const groups = Array.isArray(s.groups) ? s.groups : []
  const activeGroups = groups.filter((g) => g.status === 'open' || g.status === 'waiting_arrival').length
  const waitPay = orders.filter((o) => o.paymentStatus === 'unpaid' || o.paymentStatus === 'balance_due').length
  const waitShip = orders.filter((o) => o.orderStatus === 'ready_to_ship' || o.orderStatus === 'fully_paid').length
  const riskCustomers = customers.filter((c) => c.riskScore >= 45 || c.tags.includes('risk')).length
  return {
    unpaidBalance,
    depositReceived,
    monthlyRevenue,
    monthlyExpense,
    estProfit,
    activeGroups,
    waitPay,
    waitShip,
    riskCustomers,
  }
}

export function recentTransactions(s: DaigouState, n = 12) {
  const transactions = Array.isArray(s.transactions) ? s.transactions : []
  return [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, n)
}

export function groupProfit(s: DaigouState, groupId: string) {
  const transactions = Array.isArray(s.transactions) ? s.transactions : []
  const income = transactions
    .filter((t) => t.groupId === groupId && t.type === 'income')
    .reduce((a, t) => a + t.amount, 0)
  const expense = transactions
    .filter((t) => t.groupId === groupId && t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0)
  return income - expense
}

type ProcurementSlice = DaigouState & {
  purchaseOrders?: { orderDate?: string; totalAmount?: number; poNo?: string; supplierName?: string; id?: string }[]
  accountsPayables?: {
    remainingAmount?: number
    purchaseOrderId?: string
    amount?: number
    paidAmount?: number
  }[]
  goodsReceipts?: { purchaseOrderId?: string; qty?: number }[]
  purchaseReturns?: { purchaseOrderId?: string; amount?: number }[]
  suppliers?: { id?: string; name?: string }[]
}

export function procurementStats(s: DaigouState) {
  const st = s as ProcurementSlice
  const purchaseOrders = Array.isArray(st.purchaseOrders) ? st.purchaseOrders : []
  const payables = Array.isArray(st.accountsPayables) ? st.accountsPayables : []
  const receipts = Array.isArray(st.goodsReceipts) ? st.goodsReceipts : []
  const returns = Array.isArray(st.purchaseReturns) ? st.purchaseReturns : []
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyPurchaseAmount = purchaseOrders
    .filter((x) => (x.orderDate ?? '').startsWith(thisMonth))
    .reduce((a, x) => a + Number(x.totalAmount ?? 0), 0)
  const unpaidPayable = payables.reduce((a, x) => a + Number(x.remainingAmount ?? 0), 0)
  const poCount = purchaseOrders.length || 1
  const receiptRate = Math.round((receipts.length / poCount) * 100)
  const returnRate = Math.round((returns.length / poCount) * 100)
  return { monthlyPurchaseAmount, unpaidPayable, receiptRate, returnRate }
}

export function procurementReconciliationRows(s: DaigouState) {
  const purchaseOrders = s.purchaseOrders ?? []
  const payables = s.accountsPayables ?? []
  const suppliers = s.suppliers ?? []
  return purchaseOrders.map((po) => {
    const ap = payables.find((x) => x.poId === po.id)
    const poAmount = Number(po.totalAmount ?? 0)
    const payableAmount = Number(ap?.originalAmount ?? poAmount)
    const paidAmount = Number(ap?.paidAmount ?? 0)
    const gapAmount = payableAmount - paidAmount
    const supplierName = suppliers.find((sup) => sup.id === po.supplierId)?.name ?? '—'
    return {
      poNo: po.poNo ?? po.id ?? '—',
      supplierName,
      poAmount,
      payableAmount,
      paidAmount,
      gapAmount,
      status: gapAmount === 0 ? '已對平' : gapAmount > 0 ? '未付清' : '溢付',
    }
  })
}
