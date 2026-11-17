import type { PortalLookupCustomer } from '../api/types'
import { customerNamesEqual } from '../modules/groupbuy/customerNameKey'
import {
  effectiveLookupPin,
  isValidLookupPin,
  lookupNameKey,
  normalizeLookupPin,
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
 * 依查詢字串解析客人名稱：
 * - 訂單編號（完全相符）
 * - 手機末三碼（完全相符）
 * - 暱稱／姓名（正規化後完全相符，不含子字串）
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
    if (customerNamesEqual(n, q)) found.add(n)
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
    return { ok: false, error: '查無符合的客人，請輸入完整暱稱或訂單編號' }
  }

  const authorized: string[] = []
  let sawMissing = false
  let sawWrong = false
  for (const name of candidates) {
    const entry = (portalLookupCustomers || []).find(
      (c) => customerNamesEqual(c.lineDisplayName, name) || customerNamesEqual(c.name, name),
    )
    const expectedPin = entry ? effectiveLookupPin(entry.lookupPin) : ''
    if (!expectedPin) {
      sawMissing = true
      continue
    }
    if (expectedPin === pin) authorized.push(name)
    else sawWrong = true
  }

  if (authorized.length === 0) {
    return {
      ok: false,
      error:
        sawMissing && !sawWrong
          ? '查單密碼尚未設定，請聯絡團主為你設定專屬查單密碼'
          : '查單密碼錯誤',
    }
  }

  const expanded = new Set<string>(authorized)
  for (const name of authorized) {
    for (const c of portalLookupCustomers || []) {
      if (!customerNamesEqual(c.name, name) && !customerNamesEqual(c.lineDisplayName, name)) continue
      if (c.name) expanded.add(c.name)
      if (c.lineDisplayName) expanded.add(c.lineDisplayName)
    }
  }
  for (const g of groups) {
    for (const o of g.orders || []) {
      const cn = lookupNameKey(o.customerName || '')
      if (!cn) continue
      if ([...expanded].some((alias) => customerNamesEqual(alias, cn))) expanded.add(cn)
    }
  }
  return { ok: true, authorizedNames: [...expanded] }
}

export function orderMatchesAuthorizedNames(
  customerName: string | undefined,
  authorizedNames: string[],
): boolean {
  if (!lookupNameKey(customerName || '')) return false
  return authorizedNames.some((a) => customerNamesEqual(customerName || '', a))
}
