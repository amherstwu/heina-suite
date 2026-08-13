import type { PortalLookupCustomer } from '../api/types'
import type { Customer } from './types'

/** 未設定時的預設查單密碼 */
export const DEFAULT_LOOKUP_PIN = '1314'

export function normalizeLookupPin(raw: string): string {
  return String(raw).replace(/\D/g, '').slice(0, 4)
}

export function isValidLookupPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

export function effectiveLookupPin(raw: string | undefined | null): string {
  const pin = normalizeLookupPin(raw ?? '')
  return isValidLookupPin(pin) ? pin : DEFAULT_LOOKUP_PIN
}

export function lookupNameKey(s: string): string {
  return String(s).trim()
}

export function mapCustomersToPortalLookup(customers: Customer[]): PortalLookupCustomer[] {
  return customers.map((c) => ({
    name: lookupNameKey(c.name),
    lineDisplayName: lookupNameKey(c.lineDisplayName || c.name),
    lookupPin: effectiveLookupPin(c.lookupPin),
  }))
}

export function findPortalLookupCustomer(
  queryName: string,
  list: PortalLookupCustomer[],
): PortalLookupCustomer | undefined {
  const q = lookupNameKey(queryName)
  if (!q) return undefined
  return list.find(
    (c) => lookupNameKey(c.lineDisplayName) === q || lookupNameKey(c.name) === q,
  )
}

export type VerifyLookupAccessResult = {
  ok: boolean
  error?: string
}

export function verifyLookupAccess(
  queryName: string,
  submittedPin: string,
  portalLookupCustomers: PortalLookupCustomer[] | undefined,
): VerifyLookupAccessResult {
  const q = lookupNameKey(queryName)
  const pin = normalizeLookupPin(submittedPin)

  if (!q) return { ok: false, error: '請輸入查詢名稱' }
  if (!isValidLookupPin(pin)) return { ok: false, error: '請輸入 4 位數查單密碼' }

  const entry = findPortalLookupCustomer(q, portalLookupCustomers ?? [])
  const expected = entry ? effectiveLookupPin(entry.lookupPin) : DEFAULT_LOOKUP_PIN
  if (expected !== pin) {
    return { ok: false, error: '查單密碼錯誤' }
  }
  return { ok: true }
}

export type ChangeLookupPinResult = {
  ok: boolean
  message?: string
  lookupPin?: string
}

/** 驗證後回傳新密碼；呼叫端負責寫入客人列表與 portalLookupCustomers */
export function validateChangeLookupPin(
  queryName: string,
  currentPin: string,
  newPin: string,
  confirmPin: string,
  portalLookupCustomers: PortalLookupCustomer[] | undefined,
): ChangeLookupPinResult {
  const q = lookupNameKey(queryName)
  if (!q) return { ok: false, message: '請輸入查詢名稱' }

  const cur = normalizeLookupPin(currentPin)
  const next = normalizeLookupPin(newPin)
  const confirm = normalizeLookupPin(confirmPin)

  if (!isValidLookupPin(cur)) return { ok: false, message: '請輸入目前的 4 位數密碼' }
  if (!isValidLookupPin(next)) return { ok: false, message: '新密碼須為 4 位數字' }
  if (next !== confirm) return { ok: false, message: '兩次新密碼不一致' }
  if (next === cur) return { ok: false, message: '新密碼不可與目前密碼相同' }

  const auth = verifyLookupAccess(q, cur, portalLookupCustomers)
  if (!auth.ok) return { ok: false, message: auth.error || '目前密碼錯誤' }

  return { ok: true, lookupPin: next, message: '查單密碼已更新' }
}

export function upsertPortalLookupPin(
  list: PortalLookupCustomer[] | undefined,
  queryName: string,
  newPin: string,
): PortalLookupCustomer[] {
  const q = lookupNameKey(queryName)
  const pin = effectiveLookupPin(newPin)
  const next = [...(list ?? [])]
  const idx = next.findIndex(
    (c) => lookupNameKey(c.lineDisplayName) === q || lookupNameKey(c.name) === q,
  )
  if (idx >= 0) {
    next[idx] = { ...next[idx], lookupPin: pin }
    return next
  }
  next.push({ name: q, lineDisplayName: q, lookupPin: pin })
  return next
}
