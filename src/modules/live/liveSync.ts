import { useDaigouStore } from '../../daigou/store'
import type { Group, Order, OrderItem, PaymentStatus, Shipment } from '../../daigou/types'
import type { LiveLine, LiveSession } from './liveTypes'
import { liveLineBalance } from './liveTypes'

const LIVE_TAG = 'liveSessionId:'
const LIVE_LINE_TAG = 'liveLineId:'

function rid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`
}

function buildLiveGroupNotes(sessionId: string) {
  return `${LIVE_TAG}${sessionId} v50Status:已抵台`
}

export function findLiveDaigouGroupId(sessionId: string): string | null {
  const marker = `${LIVE_TAG}${sessionId}`
  const g = useDaigouStore.getState().groups.find((x) => x.internalNotes?.includes(marker) || x.notes?.includes(marker))
  return g?.id ?? null
}

function ensureCustomer(name: string) {
  const trimmed = name.trim()
  const st = useDaigouStore.getState()
  const hit = st.customers.find(
    (c) => c.name.trim() === trimmed || c.lineDisplayName.trim() === trimmed,
  )
  if (hit) return hit

  const id = rid('c_live')
  useDaigouStore.setState((s) => ({
    ...s,
    customers: [
      {
        id,
        name: trimmed,
        lineDisplayName: trimmed,
        phoneLast3: '000',
        socialAccount: '',
        tags: ['new_customer'],
        riskScore: 20,
        pickupReliability: 80,
        totalOrders: 0,
        totalUnpaidBalance: 0,
        notes: '由連線管理自動建立',
        lookupPin: undefined,
      },
      ...s.customers,
    ],
  }))
  return useDaigouStore.getState().customers.find((c) => c.id === id)!
}

function ensureLiveGroup(session: LiveSession): Group {
  const st = useDaigouStore.getState()
  const marker = `${LIVE_TAG}${session.id}`
  const existing = st.groups.find((g) => g.internalNotes?.includes(marker))
  const today = new Date().toISOString().slice(0, 10)
  const notes = buildLiveGroupNotes(session.id)

  if (existing) {
    const updated: Group = {
      ...existing,
      name: `連線｜${session.name}`,
      status: 'arrived',
      internalNotes: notes,
      notes: `現場連線貨到付款｜${session.name}`,
      coverImageUrl: session.photoUrls[0] || existing.coverImageUrl,
    }
    useDaigouStore.setState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === existing.id ? updated : g)),
    }))
    return updated
  }

  const group: Group = {
    id: rid('g_live'),
    name: `連線｜${session.name}`,
    status: 'arrived',
    closingDate: today,
    saleEndDate: today,
    officialShipDate: today,
    exchangeRate: 0.22,
    jpyAmountTotal: 0,
    orderNumber: '',
    logisticsNumber: '',
    purchaseLink: '',
    notes: `現場連線貨到付款｜${session.name}`,
    createdAt: Date.now(),
    internalNotes: notes,
    coverImageUrl: session.photoUrls[0] || '',
  }
  useDaigouStore.setState((s) => ({ ...s, groups: [group, ...s.groups] }))
  return group
}

function ensureShipment(order: Order) {
  const st = useDaigouStore.getState()
  if (st.shipments.some((s) => s.orderId === order.id)) return
  const shipment: Shipment = {
    id: rid('s_live'),
    orderId: order.id,
    customerId: order.customerId,
    carrier: '待填寫',
    trackingNo: '',
    status: 'not_packed',
    shipDate: '',
    notes: '連線商品｜貨到付款待出貨',
  }
  useDaigouStore.setState((s) => ({ ...s, shipments: [shipment, ...s.shipments] }))
}

/** 同一客人多品項合併成一筆訂單，方便出貨與收取尾款 */
function groupLinesByCustomer(lines: LiveLine[]): Map<string, LiveLine[]> {
  const map = new Map<string, LiveLine[]>()
  for (const line of lines) {
    const key = line.customerName.trim()
    const arr = map.get(key) ?? []
    arr.push(line)
    map.set(key, arr)
  }
  return map
}

export type LiveSyncResult = {
  ok: boolean
  message: string
  orderCount: number
  customerCount: number
  shipmentCount: number
  updatedLines: LiveLine[]
}

export type LiveDeleteResult = {
  ok: boolean
  message: string
  removedOrders: number
  removedShipments: number
  removedShipmentRecords: number
  removedMyShipRecords: number
  removedGroup: boolean
}

function hasLiveSessionMarker(text: string | undefined, sessionId: string) {
  return String(text || '').includes(`${LIVE_TAG}${sessionId}`)
}

function cleanupLiveOrders(sessionId: string, keepOrderIds: Set<string>) {
  const st = useDaigouStore.getState()
  const liveGroupId = findLiveDaigouGroupId(sessionId)
  const obsoleteOrderIds = st.orders
    .filter((o) => {
      const tagged = hasLiveSessionMarker(o.internalNote, sessionId) || hasLiveSessionMarker(o.notes, sessionId)
      const inLiveGroup = liveGroupId != null && o.groupId === liveGroupId
      return (tagged || inLiveGroup) && !keepOrderIds.has(o.id)
    })
    .map((o) => o.id)
  if (!obsoleteOrderIds.length) return

  const obsoleteOrderIdSet = new Set(obsoleteOrderIds)
  const obsoleteShipmentRecordIds = st.shipmentRecords
    .filter((x) => obsoleteOrderIdSet.has(x.orderId))
    .map((x) => x.id)
  const obsoleteShipmentRecordIdSet = new Set(obsoleteShipmentRecordIds)

  useDaigouStore.setState((s) => ({
    ...s,
    orders: s.orders.filter((o) => !obsoleteOrderIdSet.has(o.id)),
    shipments: s.shipments.filter((x) => !obsoleteOrderIdSet.has(x.orderId)),
    shipmentRecords: s.shipmentRecords.filter((x) => !obsoleteOrderIdSet.has(x.orderId)),
    myShipRecords: s.myShipRecords.filter(
      (x) => !obsoleteOrderIdSet.has(x.orderId) && !obsoleteShipmentRecordIdSet.has(x.shipmentId || ''),
    ),
  }))
}

/**
 * 將連線明細同步為 daigou 團務（已抵台）＋客訂＋出貨佇列。
 * - 無訂金：貨到付款（unpaid），仍進入出貨物流
 * - 有訂金：deposit_paid，尾款於取貨收取
 */
export function syncLiveSessionToShipping(session: LiveSession): LiveSyncResult {
  if (!session.lines.length) {
    return {
      ok: false,
      message: '此連線尚無明細',
      orderCount: 0,
      customerCount: 0,
      shipmentCount: 0,
      updatedLines: session.lines,
    }
  }

  const group = ensureLiveGroup(session)
  const byCustomer = groupLinesByCustomer(session.lines)
  const lineUpdates = new Map<string, Partial<LiveLine>>()
  const activeOrderIds = new Set<string>()
  let orderCount = 0
  let shipmentCount = 0
  const beforeShipments = useDaigouStore.getState().shipments.length

  for (const [customerName, lines] of byCustomer) {
    const customer = ensureCustomer(customerName)
    const items: OrderItem[] = lines.map((l) => {
      const qty = Math.max(1, l.qty || 1)
      const twdUnit = qty > 0 ? Math.round(((Number(l.twdTotal) || 0) / qty) * 100) / 100 : 0
      return {
        productId: '',
        name: l.productName,
        qty,
        jpyUnit: Number(l.jpyUnit) || 0,
        twdUnit,
      }
    })

    const totalAmount = lines.reduce((s, l) => s + (Number(l.twdTotal) || 0), 0)
    const deposit = Math.min(
      totalAmount,
      lines.reduce((s, l) => s + (Number(l.deposit) || 0), 0),
    )
    const balance = Math.max(0, totalAmount - deposit)
    const paymentStatus: PaymentStatus = deposit > 0 ? 'deposit_paid' : 'unpaid'
    const totalReceived = deposit
    const existingOrderId = lines.map((l) => l.syncedOrderId).find(Boolean)

    const st = useDaigouStore.getState()
    let order = existingOrderId ? st.orders.find((o) => o.id === existingOrderId) : undefined

    const internalNote = `${LIVE_TAG}${session.id} ${lines.map((l) => `${LIVE_LINE_TAG}${l.id}`).join(' ')}`
    const notes = deposit > 0
      ? `連線｜已收訂金 $${deposit}｜尾款貨到付款 $${balance}`
      : `連線｜全額貨到付款 $${totalAmount}`

    if (order) {
      const next: Order = {
        ...order,
        customerId: customer.id,
        groupId: group.id,
        items,
        deposit,
        balance,
        totalAmount,
        totalReceived,
        outstandingAmount: balance,
        paymentStatus,
        orderStatus: 'ready_to_ship',
        internalNote,
        notes,
        updatedAt: Date.now(),
      }
      useDaigouStore.setState((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === order!.id ? next : o)),
      }))
      order = next
    } else {
      const ts = Date.now()
      const no: Order = {
        id: rid('o_live'),
        lookupCode: `LIVE-${String(ts).slice(-6)}`,
        customerId: customer.id,
        groupId: group.id,
        items,
        deposit,
        balance,
        domesticShipping: 0,
        internationalShipping: 0,
        totalAmount,
        totalReceived,
        outstandingAmount: balance,
        paymentStatus,
        orderStatus: 'ready_to_ship',
        notes,
        internalNote,
        customerNote: '',
        createdAt: ts,
        updatedAt: ts,
      }
      useDaigouStore.setState((s) => ({ ...s, orders: [no, ...s.orders] }))
      order = no
      orderCount += 1
    }

    activeOrderIds.add(order.id)
    ensureShipment(order)
    for (const l of lines) {
      lineUpdates.set(l.id, {
        syncedOrderId: order.id,
        matchedCustomerId: customer.id,
        deposit: l.deposit,
      })
    }
  }

  cleanupLiveOrders(session.id, activeOrderIds)
  shipmentCount = Math.max(0, useDaigouStore.getState().shipments.length - beforeShipments)
  const updatedLines = session.lines.map((l) => ({ ...l, ...lineUpdates.get(l.id) }))

  useDaigouStore.getState().addToast(
    `連線「${session.name}」已同步：${byCustomer.size} 位客人、${orderCount || byCustomer.size} 筆客訂進入出貨物流`,
    'ok',
  )

  return {
    ok: true,
    message: `已同步 ${byCustomer.size} 位客人至出貨物流（貨到付款；有訂金者已註記尾款）`,
    orderCount: orderCount || byCustomer.size,
    customerCount: byCustomer.size,
    shipmentCount,
    updatedLines,
  }
}

export function liveCodSummary(lines: LiveLine[]) {
  let pureCod = 0
  let withDeposit = 0
  let depositSum = 0
  let codBalance = 0
  for (const l of lines) {
    if ((l.deposit || 0) > 0) {
      withDeposit += 1
      depositSum += l.deposit
      codBalance += liveLineBalance(l)
    } else {
      pureCod += 1
      codBalance += Number(l.twdTotal) || 0
    }
  }
  return { pureCod, withDeposit, depositSum, codBalance }
}

export function deleteLiveSessionArtifacts(sessionId: string): LiveDeleteResult {
  const st = useDaigouStore.getState()
  const liveGroupId = findLiveDaigouGroupId(sessionId)
  const orderIds = st.orders
    .filter((o) => {
      const tagged = hasLiveSessionMarker(o.internalNote, sessionId) || hasLiveSessionMarker(o.notes, sessionId)
      const inLiveGroup = liveGroupId != null && o.groupId === liveGroupId
      return tagged || inLiveGroup
    })
    .map((o) => o.id)
  const orderIdSet = new Set(orderIds)
  const shipmentRecordIds = st.shipmentRecords.filter((x) => orderIdSet.has(x.orderId)).map((x) => x.id)
  const shipmentRecordIdSet = new Set(shipmentRecordIds)
  const removedShipments = st.shipments.filter((x) => orderIdSet.has(x.orderId)).length
  const removedShipmentRecords = shipmentRecordIds.length
  const removedMyShipRecords = st.myShipRecords.filter(
    (x) => orderIdSet.has(x.orderId) || shipmentRecordIdSet.has(x.shipmentId || ''),
  ).length
  const removedGroup = st.groups.some((g) => hasLiveSessionMarker(g.internalNotes, sessionId) || g.id === liveGroupId)

  useDaigouStore.setState((s) => ({
    ...s,
    groups: s.groups.filter((g) => !hasLiveSessionMarker(g.internalNotes, sessionId) && g.id !== liveGroupId),
    orders: s.orders.filter((o) => !orderIdSet.has(o.id)),
    shipments: s.shipments.filter((x) => !orderIdSet.has(x.orderId)),
    shipmentRecords: s.shipmentRecords.filter((x) => !orderIdSet.has(x.orderId)),
    myShipRecords: s.myShipRecords.filter(
      (x) => !orderIdSet.has(x.orderId) && !shipmentRecordIdSet.has(x.shipmentId || ''),
    ),
  }))

  return {
    ok: true,
    message: `已刪除連線同步資料：${orderIds.length} 筆客單、${removedShipments} 筆出貨`,
    removedOrders: orderIds.length,
    removedShipments,
    removedShipmentRecords,
    removedMyShipRecords,
    removedGroup,
  }
}
