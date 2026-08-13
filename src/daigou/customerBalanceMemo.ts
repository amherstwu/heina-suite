export type CustomerBalanceMemo = {
  id: string
  /** 正數＝客人欠我；負數＝我欠客人 */
  amountTwd: number
  createdAt: number
  status: 'open' | 'settled'
  settledAt?: number
  settledNote?: string
  /** @deprecated 舊版類型欄位，讀取時自動換算 */
  kind?: 'shipping_credit' | 'discount' | 'owed' | 'other'
  /** @deprecated */
  note?: string
}

export function openBalanceMemos(memos: CustomerBalanceMemo[] | undefined): CustomerBalanceMemo[] {
  return (memos ?? []).filter((m) => m.status === 'open')
}

/** 單筆備註對尾款的加減（相容舊版 kind） */
export function memoAdjustAmount(m: CustomerBalanceMemo): number {
  if (!m.kind) return Number(m.amountTwd) || 0
  const amt = Math.abs(Number(m.amountTwd) || 0)
  if (m.kind === 'owed') return amt
  if (m.kind === 'shipping_credit' || m.kind === 'discount') return -amt
  return Number(m.amountTwd) || 0
}

/** 待處理帳務備註合計（正加負減） */
export function sumOpenMemoAdjust(memos: CustomerBalanceMemo[] | undefined): number {
  return openBalanceMemos(memos).reduce((sum, m) => sum + memoAdjustAmount(m), 0)
}

/** 尾款合計經帳務備註調整後應收（不低於 0） */
export function adjustedBalanceDue(baseDue: number, memos: CustomerBalanceMemo[] | undefined): number {
  return Math.max(0, baseDue + sumOpenMemoAdjust(memos))
}

export function hasOpenBalanceMemos(memos: CustomerBalanceMemo[] | undefined): boolean {
  return openBalanceMemos(memos).length > 0
}

export function formatMemoAmount(amount: number): string {
  const n = Number(amount) || 0
  if (n > 0) return `+NT$${n.toLocaleString()}`
  if (n < 0) return `-NT$${Math.abs(n).toLocaleString()}`
  return 'NT$0'
}

/** 付款回報勾選的帳務備註快照 */
export type PaymentReportBalanceMemoRef = {
  id: string
  amountTwd: number
}

export function sumSelectedMemoAdjust(
  memos: PaymentReportBalanceMemoRef[] | undefined,
  selectedIds: Set<string> | string[],
): number {
  const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  return (memos ?? [])
    .filter((m) => ids.has(m.id))
    .reduce((sum, m) => sum + (Number(m.amountTwd) || 0), 0)
}

export function collectOpenMemosForCustomerName(
  customers: { id: string; name: string; lineDisplayName?: string; balanceMemos?: CustomerBalanceMemo[] }[],
  customerName: string,
): { customerId: string; memo: CustomerBalanceMemo }[] {
  const want = String(customerName || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
  if (!want) return []
  const out: { customerId: string; memo: CustomerBalanceMemo }[] = []
  for (const c of customers) {
    const name = String(c.name || '')
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase()
    const line = String(c.lineDisplayName || '')
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase()
    if (name !== want && line !== want) continue
    for (const m of openBalanceMemos(c.balanceMemos)) {
      out.push({ customerId: c.id, memo: m })
    }
  }
  return out
}
