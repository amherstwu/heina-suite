import type { GroupBuyGroup, GroupBuyOrder } from '../../api/types'
import type { Order } from '../../daigou/types'

export function parseV50Refs(text?: string): { v50OrderId?: string; v50GroupId?: string } {
  const src = text || ''
  const orderMatch = src.match(/v50OrderId:([^\s]+)/)
  const groupMatch = src.match(/v50GroupId:([^\s]+)/)
  return {
    v50OrderId: orderMatch?.[1],
    v50GroupId: groupMatch?.[1],
  }
}

export function extractV50OrderIdFromDaigou(order: Pick<Order, 'id' | 'internalNote' | 'notes'>): string | null {
  const fromNote = parseV50Refs(order.internalNote).v50OrderId ?? parseV50Refs(order.notes).v50OrderId
  if (fromNote) return fromNote
  if (order.id.startsWith('o_v50_')) return order.id.slice('o_v50_'.length)
  return null
}

export function findV50OrderContext(
  groups: GroupBuyGroup[],
  v50OrderId: string,
  v50GroupId?: string,
): { group: GroupBuyGroup; order: GroupBuyOrder } | null {
  const candidates = v50GroupId ? groups.filter((g) => g.id === v50GroupId) : groups
  for (const group of candidates) {
    const order = (group.orders || []).find((o) => o.id === v50OrderId)
    if (order) return { group, order }
  }
  return null
}
