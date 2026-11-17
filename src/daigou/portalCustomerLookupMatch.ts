import type { PortalLookupCustomer } from '../api/types'
import {
  effectiveLookupPin,
  isValidLookupPin,
  lookupNameKey,
  normalizeLookupPin,
  verifyLookupAccess,
} from './portalLookupAuth'

export type LookupOrderLike = {
  id?: string
  customerName?: string
}

export type LookupGroupLike = {
  orders?: LookupOrderLike[]
}

export type LookupPhoneHint = {
  name?: string
  lineDisplayName?: string
  phoneLast3?: string
}

/** 自所有團務訂單收集不重覆客人名 */
export function collectOrderCustomerNames(groups: LookupGroupLike[]): string[] {
  const names = new Set<string>()
  for (const g of groups) {
    for (const o of g.orders || []) {
      const n = lookupNameKey(o.customerName || '')
      if (n) names.add(n)
    }
  }
  return [...names]
}

/**
 * 依查詢字串解析可能的客人名稱：
 * - 訂單編號（完全相符）
 * - 手機末三碼
 * - 暱稱／姓名（完全相符優先，否則部分相符）
 */
export function resolveCustomerLookupCandidates(
  query: string,
  groups: LookupGroupLike[],
  portalLookupCustomers: PortalLookupCustomer[] | undefined,
  phoneHints: LookupPhoneHint[] = [],
): string[] {
  const q = lookupNameKey(query)
  if (!q) return []
  const lower = q.toLowerCase()
  const found = new Set<string>()

  for (const g of groups) {
    for (const o of g.orders || []) {
      const oid = String(o.id || '').trim()
      if (oid && oid.toLowerCase() === lower) {
        const n = lookupNameKey(o.customerName || '')
        if (n) found.add(n)
      }
    }
  }

  if (/^\d{3}$/.test(q)) {
    for (const c of phoneHints) {
      if (String(c.phoneLast3 || '').trim() !== q) continue
      const a = lookupNameKey(c.name || '')
      const b = lookupNameKey(c.lineDisplayName || '')
      if (a) found.add(a)
      if (b) found.add(b)
    }
  }

  const namePool = new Set<string>([
    ...collectOrderCustomerNames(groups),
    ...(portalLookupCustomers || []).flatMap((c) => [
      lookupNameKey(c.name),
      lookupNameKey(c.lineDisplayName),
    ]),
  ])

  for (const n of namePool) {
    if (!n) continue
    if (n.toLowerCase() === lower) found.add(n)
  }

  if (found.size === 0) {
    for (const n of namePool) {
      if (!n) continue
      if (n.toLowerCase().includes(lower)) found.add(n)
    }
  }

  return [...found]
}

export type AuthorizeLookupResult =
  | { ok: true; authorizedNames: string[] }
  | { ok: false; error: string }

/**
 * 先解析查詢對應的客人，再以查單密碼授權；
 * 僅回傳密碼正確的客人名（可用於篩選訂單）。
 */
export function authorizeCustomerLookupQuery(
  query: string,
  submittedPin: string,
  groups: LookupGroupLike[],
  portalLookupCustomers: PortalLookupCustomer[] | undefined,
  phoneHints: LookupPhoneHint[] = [],
): AuthorizeLookupResult {
  const q = lookupNameKey(query)
  const pin = normalizeLookupPin(submittedPin)
  if (!q) return { ok: false, error: '請輸入查詢名稱' }
  if (!isValidLookupPin(pin)) return { ok: false, error: '請輸入 4 位數查單密碼' }

  const candidates = resolveCustomerLookupCandidates(q, groups, portalLookupCustomers, phoneHints)

  if (candidates.length === 0) {
    // 查無對應客人時仍驗證預設／該名密碼（避免洩漏是否存在），再回傳空授權名
    const auth = verifyLookupAccess(q, pin, portalLookupCustomers)
    if (!auth.ok) return { ok: false, error: auth.error || '查單密碼錯誤' }
    return { ok: true, authorizedNames: [q] }
  }

  const authorized: string[] = []
  for (const name of candidates) {
    const entry = (portalLookupCustomers || []).find(
      (c) => lookupNameKey(c.lineDisplayName) === name || lookupNameKey(c.name) === name,
    )
    const expectedPin = entry ? effectiveLookupPin(entry.lookupPin) : ''
    if (expectedPin && expectedPin === pin) authorized.push(name)
  }

  if (authorized.length === 0) {
    return { ok: false, error: '查單密碼錯誤' }
  }
  return { ok: true, authorizedNames: authorized }
}

export function orderMatchesAuthorizedNames(
  customerName: string | undefined,
  authorizedNames: string[],
): boolean {
  const n = lookupNameKey(customerName || '')
  if (!n) return false
  const lower = n.toLowerCase()
  return authorizedNames.some((a) => lookupNameKey(a).toLowerCase() === lower)
}
