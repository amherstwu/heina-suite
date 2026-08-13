import type { Customer, DaigouState, Order, OrderStatus, PaymentStatus } from './types'
import {
  customerNamesEqual,
  customerRecordMatchesName,
  normalizeCustomerNameKey,
  orderBelongsToCustomerName,
} from '../modules/groupbuy/customerNameKey'

/** 客戶自助：LINE 顯示名、手機末三碼、查詢碼（不分大小寫） */
export function findPortalOrders(state: DaigouState, query: string): Order[] {
  const q = query.trim()
  if (!q) return []
  const lower = q.toLowerCase()
  const byCode = state.orders.filter((o) => o.lookupCode.toLowerCase() === lower)
  if (byCode.length) return byCode
  const key = normalizeCustomerNameKey(q)
  const custs = state.customers.filter(
    (c) =>
      c.phoneLast3 === q ||
      (key.length <= 1
        ? customerRecordMatchesName(c, q, 'exact')
        : customerRecordMatchesName(c, q, 'exact') || customerRecordMatchesName(c, q, 'includes')),
  )
  const ids = new Set(custs.map((c) => c.id))
  return state.orders.filter((o) => ids.has(o.customerId))
}

/** 後台暱稱查單：規則與會員端相近，另含社群帳號模糊搜尋，並回傳對應客戶清單 */
export type StaffNicknameLookupResult = {
  matchKind: 'lookup_code' | 'customer'
  customers: Customer[]
  orders: Order[]
}

export function staffNicknameLookup(state: Pick<DaigouState, 'orders' | 'customers'>, query: string): StaffNicknameLookupResult {
  const q = query.trim()
  if (!q) return { matchKind: 'customer', customers: [], orders: [] }
  const lower = q.toLowerCase()
  const byCode = state.orders.filter((o) => o.lookupCode.toLowerCase() === lower)
  if (byCode.length) {
    const custIds = [...new Set(byCode.map((o) => o.customerId))]
    const customers = state.customers.filter((c) => custIds.includes(c.id))
    return { matchKind: 'lookup_code', customers, orders: byCode }
  }
  const key = normalizeCustomerNameKey(q)
  // 人名：先精確；單字元禁用 includes，避免「如」誤中他人
  const exactCusts = state.customers.filter((c) => customerRecordMatchesName(c, q, 'exact'))
  const phoneOrSocial = state.customers.filter(
    (c) =>
      c.phoneLast3 === q ||
      (c.socialAccount?.trim() && c.socialAccount.toLowerCase().includes(lower)),
  )
  const looseCusts =
    exactCusts.length > 0 || key.length <= 1
      ? []
      : state.customers.filter((c) => customerRecordMatchesName(c, q, 'includes'))
  const merged =
    exactCusts.length > 0
      ? exactCusts
      : [...new Map([...looseCusts, ...phoneOrSocial].map((c) => [c.id, c])).values()]
  const ids = new Set(merged.map((c) => c.id))
  const orders = state.orders.filter(
    (o) =>
      ids.has(o.customerId) ||
      (exactCusts.length > 0 &&
        orderBelongsToCustomerName(
          o,
          q,
          state.customers.find((c) => c.id === o.customerId),
          ids,
        )),
  )
  return { matchKind: 'customer', customers: merged, orders }
}

/** 以訂單狀態粗分「出貨／配送」階段（模型無獨立 shipment 狀態時之營運篩選） */
export type AdminShipPhase = '' | 'not_shipped' | 'shipped' | 'completed' | 'issue'

export type AdminOrderSearchFilters = {
  groupId?: string
  paymentStatus?: PaymentStatus | ''
  orderStatus?: OrderStatus | ''
  shipPhase?: AdminShipPhase
}

function norm(s: string) {
  return s.replace(/\s/g, '').toLowerCase()
}

/**
 * 後台暱稱查單：單一關鍵字搜尋訂單／客戶／團名／品名；可疊加團務與狀態篩選（不需兩欄驗證）。
 */
export function adminSearchOrders(
  state: Pick<DaigouState, 'orders' | 'customers' | 'groups'>,
  query: string,
  filters: AdminOrderSearchFilters = {},
): Order[] {
  let list = [...state.orders]
  if (filters.groupId) list = list.filter((o) => o.groupId === filters.groupId)
  if (filters.paymentStatus) list = list.filter((o) => o.paymentStatus === filters.paymentStatus)
  if (filters.orderStatus) list = list.filter((o) => o.orderStatus === filters.orderStatus)
  if (filters.shipPhase) {
    const o = filters.shipPhase
    if (o === 'not_shipped') {
      list = list.filter((x) => !['shipped', 'completed', 'cancelled', 'stockout_refund'].includes(x.orderStatus))
    } else if (o === 'shipped') {
      list = list.filter((x) => x.orderStatus === 'shipped')
    } else if (o === 'completed') {
      list = list.filter((x) => x.orderStatus === 'completed')
    } else if (o === 'issue') {
      list = list.filter((x) => ['exception', 'risk_flagged'].includes(x.orderStatus))
    }
  }

  const q = query.trim()
  if (!q) return list

  const lower = q.toLowerCase()
  const qKey = normalizeCustomerNameKey(q)
  const customersById = new Map(state.customers.map((c) => [c.id, c]))
  const groupsById = new Map(state.groups.map((g) => [g.id, g]))

  /** 查詢碼完全一致優先保留該批 */
  const exactCode = list.filter((o) => o.lookupCode.toLowerCase() === lower)
  if (exactCode.length) return exactCode

  /** 人名精確勾稽優先（與催款穿透同一規則） */
  const exactNameOrders = list.filter((o) =>
    orderBelongsToCustomerName(o, q, customersById.get(o.customerId)),
  )
  if (exactNameOrders.length) return exactNameOrders

  // 單字元：不再做 includes，避免誤中
  if (qKey.length <= 1) return []

  const nameHits = state.customers.filter((c) => customerRecordMatchesName(c, q, 'includes'))
  if (nameHits.length) {
    const hitIds = new Set(nameHits.map((c) => c.id))
    const byCustomer = list.filter((o) => hitIds.has(o.customerId))
    if (byCustomer.length) return byCustomer
  }

  const orderMatchesToken = (o: Order, token: string) => {
    const t = token.toLowerCase()
    if (o.lookupCode.toLowerCase().includes(t) || o.lookupCode.toLowerCase() === t) return true
    if (o.items.some((it) => it.name.toLowerCase().includes(t))) return true
    if (String(o.notes ?? '').toLowerCase().includes(t) || String(o.internalNote ?? '').toLowerCase().includes(t))
      return true
    const g = groupsById.get(o.groupId)
    if (g && (g.name.toLowerCase().includes(t) || String(g.orderNumber ?? '').toLowerCase().includes(t))) return true
    const c = customersById.get(o.customerId)
    if (!c) return false
    if (c.phoneLast3 === token || c.phoneLast3 === q) return true
    if (customerNamesEqual(c.name, token) || customerNamesEqual(c.lineDisplayName, token)) return true
    if (customerRecordMatchesName(c, token, 'includes')) return true
    if (c.socialAccount?.trim() && norm(c.socialAccount).includes(norm(token))) return true
    return false
  }

  return list.filter((o) => orderMatchesToken(o, q))
}
