import type { GroupBuyAppData, SharedCustomerBalanceMemo } from '../api/types'
import { KEYS, loadJson, saveJson } from '../adapters/mockStorage'
import { mergeGroupBuyAppData } from '../adapters/groupbuyMockMerge'
import { memoAdjustAmount } from './customerBalanceMemo'
import type { Customer } from './types'
import { mapCustomersToPortalLookup } from './portalLookupAuth'

function gbDefault(): GroupBuyAppData {
  return mergeGroupBuyAppData({} as GroupBuyAppData)
}

/** 將代購後台客人列表的查單密碼同步至開團／查單後端資料（Mock localStorage 與 GAS saveAppData 同源） */
export function syncPortalLookupCustomersToGroupbuy(customers: Customer[]) {
  try {
    const existing = loadJson(KEYS.groupbuy, gbDefault()) as GroupBuyAppData & {
      bankViewerFull?: unknown
    }
    const data = mergeGroupBuyAppData(existing)
    const bankViewerFull = existing.bankViewerFull
    saveJson(KEYS.groupbuy, {
      ...data,
      portalLookupCustomers: mapCustomersToPortalLookup(customers),
      customerBalanceMemos: mapCustomersToSharedBalanceMemos(customers),
      ...(bankViewerFull !== undefined ? { bankViewerFull } : {}),
    })
  } catch {
    /* localStorage unavailable */
  }
}

export function mapCustomersToSharedBalanceMemos(customers: Customer[]): SharedCustomerBalanceMemo[] {
  const out: SharedCustomerBalanceMemo[] = []
  for (const c of customers) {
    const customerName = (c.name || c.lineDisplayName || '').trim()
    if (!customerName) continue
    for (const m of c.balanceMemos ?? []) {
      out.push({
        id: m.id,
        customerName,
        amountTwd: memoAdjustAmount(m),
        status: m.status,
        settledAt: m.settledAt,
        settledNote: m.settledNote,
      })
    }
  }
  return out
}

export function openSharedBalanceMemosForName(
  memos: SharedCustomerBalanceMemo[] | undefined,
  customerName: string,
): SharedCustomerBalanceMemo[] {
  const want = String(customerName || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
  if (!want) return []
  return (memos ?? []).filter((m) => {
    if (m.status !== 'open') return false
    const n = String(m.customerName || '')
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase()
    return n === want
  })
}
