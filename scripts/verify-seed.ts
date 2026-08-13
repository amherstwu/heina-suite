/**
 * 驗證 createSeedState 足以支撐各列表／儀表頁非空示範（本機與 Mock 預設體驗）。
 */
import { createSeedState } from '../src/daigou/seed'
import { procurementReconciliationRows } from '../src/daigou/selectors'
import type { Order } from '../src/daigou/types'

function needsPaymentAttention(o: Order): boolean {
  if (['partial_refund', 'balance_due', 'unpaid', 'overpaid'].includes(o.paymentStatus)) return true
  if (
    o.paymentStatus === 'deposit_paid' &&
    (o.orderStatus === 'waiting_balance' || o.orderStatus === 'waiting_arrival')
  )
    return true
  return false
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const s = createSeedState()

assert(s.groups.length > 0, 'seed: groups 不可為空')
assert(s.products.length > 0, 'seed: products 不可為空')
assert(s.customers.length > 0, 'seed: customers 不可為空')
assert(s.orders.length > 0, 'seed: orders 不可為空')
assert(s.orders.some(needsPaymentAttention), 'seed: 至少一筆訂單應列入付款審核範例')
assert(s.transactions.length > 0, 'seed: transactions 不可為空')
assert(s.shipmentRecords.length > 0, 'seed: shipmentRecords 不可為空')
assert(s.myShipRecords.length > 0, 'seed: myShipRecords 不可為空')
assert(s.notificationTemplates.length > 0, 'seed: notificationTemplates 不可為空')
assert(s.tutorialArticles.length > 0, 'seed: tutorialArticles 不可為空')
assert(s.suppliers.length > 0, 'seed: suppliers 不可為空')
assert(s.purchaseOrders.length > 0, 'seed: purchaseOrders 不可為空')
assert(s.goodsReceipts.length > 0, 'seed: goodsReceipts 不可為空')
assert(s.accountsPayables.length > 0, 'seed: accountsPayables 不可為空')

const recon = procurementReconciliationRows(s)
assert(recon.length > 0, 'seed: 採購對帳應至少一列')

const firstOrder = s.orders[0]
const cust = s.customers.find((c) => c.id === firstOrder.customerId)
assert(!!cust, 'seed: 訂單應能對應到客戶')

console.log('✅ createSeedState 資料完整性檢查通過。')
