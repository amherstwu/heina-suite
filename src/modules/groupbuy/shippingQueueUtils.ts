import type { Customer, Group, Order, Shipment } from '../../daigou/types'
import { isV50GroupReadyToShip } from './v50Utils'

export type ShippingQueueRow = {
  sh: Shipment
  o: Order
  c: Customer | undefined
  g: Group | undefined
}

export function isShipmentRowShipped(sh: Shipment, o: Order): boolean {
  return (
    o.orderStatus === 'completed' ||
    o.orderStatus === 'shipped' ||
    sh.status === 'shipped' ||
    sh.status === 'delivered'
  )
}

export function isShipmentRowPending(sh: Shipment, o: Order): boolean {
  if (o.orderStatus === 'cancelled') return false
  return !isShipmentRowShipped(sh, o)
}

function buildRow(
  sh: Shipment,
  orders: Order[],
  customers: Customer[],
  groups: Group[],
): ShippingQueueRow | null {
  const o = orders.find((x) => x.id === sh.orderId)
  if (!o) return null
  const c = customers.find((x) => x.id === o.customerId)
  const g = groups.find((x) => x.id === o.groupId)
  return { sh, o, c, g }
}

/** 與出貨物流頁相同：已抵台團務佇列中的列 */
export function listShippingQueueRows(
  shipments: Shipment[],
  orders: Order[],
  customers: Customer[],
  groups: Group[],
): ShippingQueueRow[] {
  return shipments
    .map((sh) => buildRow(sh, orders, customers, groups))
    .filter((row): row is ShippingQueueRow => {
      if (!row) return false
      if (row.o.orderStatus === 'cancelled') return false
      return isV50GroupReadyToShip(row.g?.internalNotes)
    })
}

/** 出貨物流裡目前待出貨的列（可勾選批次出貨） */
export function listPendingShippingQueueRows(
  shipments: Shipment[],
  orders: Order[],
  customers: Customer[],
  groups: Group[],
): ShippingQueueRow[] {
  return listShippingQueueRows(shipments, orders, customers, groups).filter(({ sh, o }) =>
    isShipmentRowPending(sh, o),
  )
}

export function customerDisplayName(row: ShippingQueueRow): string {
  return (row.c?.name || row.c?.lineDisplayName || '（未知客戶）').trim()
}
