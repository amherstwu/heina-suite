/** 連線（現場連線）管理資料模型 */

export type LiveLine = {
  id: string
  customerName: string
  productName: string
  qty: number
  jpyUnit: number
  /** 台幣總額（該品項小計） */
  twdTotal: number
  /**
   * 已收訂金（台幣）。
   * 0 = 全額貨到付款；>0 = 先收訂金，尾款貨到收取。
   */
  deposit: number
  note?: string
  /** 同步後對應的 daigou 訂單 id */
  syncedOrderId?: string
  matchedCustomerId?: string
}

export type LiveSession = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** 連線場次照片（data URL 或 http） */
  photoUrls: string[]
  /**
   * 依客人名字存放的卡片照片。
   * key = 客人名字（trim 後原文，不分大小寫比對時請用 liveCustomerKey）
   */
  customerPhotoUrls?: Record<string, string[]>
  lines: LiveLine[]
  notes: string
  /** 已同步到出貨物流的時間 */
  syncedAt?: number
}

export function liveCustomerKey(name: string) {
  return name.trim().toLowerCase() || '__empty__'
}

/** 連線場次名稱比對（去空白、不分大小寫） */
export function liveSessionNameKey(name: string) {
  return name.trim().toLowerCase() || '未命名連線'
}

export function liveLineBalance(line: LiveLine): number {
  return Math.max(0, (Number(line.twdTotal) || 0) - (Number(line.deposit) || 0))
}

export function liveSessionTotals(session: LiveSession) {
  const twd = session.lines.reduce((s, l) => s + (Number(l.twdTotal) || 0), 0)
  const deposit = session.lines.reduce((s, l) => s + (Number(l.deposit) || 0), 0)
  const cod = Math.max(0, twd - deposit)
  const jpy = session.lines.reduce((s, l) => s + (Number(l.jpyUnit) || 0) * Math.max(1, Number(l.qty) || 1), 0)
  const customers = new Set(session.lines.map((l) => liveCustomerKey(l.customerName))).size
  return { twd, deposit, cod, jpy, count: session.lines.length, customers }
}

export type LiveCustomerGroup = {
  key: string
  name: string
  lines: LiveLine[]
  twd: number
  deposit: number
  cod: number
  itemCount: number
  qtyTotal: number
  synced: boolean
}

export function groupLiveLinesByCustomer(lines: LiveLine[]): LiveCustomerGroup[] {
  const map = new Map<string, LiveCustomerGroup>()
  for (const line of lines) {
    const key = liveCustomerKey(line.customerName)
    const existing = map.get(key)
    const twd = Number(line.twdTotal) || 0
    const deposit = Number(line.deposit) || 0
    if (existing) {
      existing.lines.push(line)
      existing.twd += twd
      existing.deposit += deposit
      existing.cod = Math.max(0, existing.twd - existing.deposit)
      existing.itemCount += 1
      existing.qtyTotal += Math.max(1, Number(line.qty) || 1)
      existing.synced = existing.synced && !!line.syncedOrderId
      if (!existing.name.trim() && line.customerName.trim()) existing.name = line.customerName.trim()
    } else {
      map.set(key, {
        key,
        name: line.customerName.trim() || '（未填名字）',
        lines: [line],
        twd,
        deposit,
        cod: Math.max(0, twd - deposit),
        itemCount: 1,
        qtyTotal: Math.max(1, Number(line.qty) || 1),
        synced: !!line.syncedOrderId,
      })
    }
  }
  return [...map.values()]
}

export function resolveCustomerPhotoUrls(
  session: LiveSession,
  customerKey: string,
  displayName: string,
): string[] {
  const map = session.customerPhotoUrls || {}
  if (map[displayName]?.length) return map[displayName]
  const hit = Object.entries(map).find(([k]) => liveCustomerKey(k) === customerKey)
  return hit?.[1] ?? []
}
