/**
 * 客人姓名勾稽：統一正規化與精確比對。
 * 催款／搜尋／同步分組皆應使用此模組，避免「如」誤中「小聖」等子字串問題。
 */

export function normalizeCustomerNameKey(s: string): string {
  return String(s || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}

/** 精確姓名相等（正規化後） */
export function customerNamesEqual(a: string, b: string): boolean {
  const na = normalizeCustomerNameKey(a)
  const nb = normalizeCustomerNameKey(b)
  return na !== '' && na === nb
}

/** 子字串包含（僅供手動寬鬆搜尋；催款穿透禁用） */
export function customerNameIncludes(hay: string, needle: string): boolean {
  const h = normalizeCustomerNameKey(hay)
  const n = normalizeCustomerNameKey(needle)
  return h !== '' && n !== '' && h.includes(n)
}

export function customerRecordMatchesName(
  c: { name?: string; lineDisplayName?: string } | undefined,
  query: string,
  mode: 'exact' | 'includes',
): boolean {
  if (!normalizeCustomerNameKey(query)) return true
  const name = c?.name || ''
  const line = c?.lineDisplayName || ''
  if (mode === 'exact') {
    return customerNamesEqual(name, query) || customerNamesEqual(line, query)
  }
  return customerNameIncludes(name, query) || customerNameIncludes(line, query)
}

const V50_CUSTOMER_TAG = 'v50CustomerName:'

/** 寫入 internalNote 的標記（姓名經 encode，避免空白切斷） */
export function formatV50CustomerNameTag(customerName: string): string {
  const trimmed = String(customerName || '').trim()
  if (!trimmed) return ''
  return `${V50_CUSTOMER_TAG}${encodeURIComponent(trimmed)}`
}

/** 從客單 internalNote／notes 讀回團務原始客人姓名 */
export function extractV50CustomerName(
  order: Pick<{ internalNote?: string; notes?: string }, 'internalNote' | 'notes'>,
): string | null {
  const src = `${order.internalNote || ''} ${order.notes || ''}`
  const m = src.match(/v50CustomerName:([^\s]+)/)
  if (!m?.[1]) return null
  try {
    return decodeURIComponent(m[1]).trim() || null
  } catch {
    return m[1].trim() || null
  }
}

/**
 * 顯示／分組用姓名：優先團務客訂姓名，再客單客戶檔。
 * 與催款名單同一來源，避免 customerId 錯掛時顯示錯人。
 */
export function resolveOrderCustomerDisplayName(
  order: Pick<{ internalNote?: string; notes?: string }, 'internalNote' | 'notes'>,
  customer?: { name?: string; lineDisplayName?: string } | null,
  fallback = '（未知客戶）',
): string {
  const fromV50 = extractV50CustomerName(order)
  if (fromV50) return fromV50
  const fromCust = (customer?.name || customer?.lineDisplayName || '').trim()
  return fromCust || fallback
}

/** 訂單是否屬於指定客人（精確勾稽） */
export function orderBelongsToCustomerName(
  order: Pick<{ customerId: string; internalNote?: string; notes?: string }, 'customerId' | 'internalNote' | 'notes'>,
  query: string,
  customer: { id?: string; name?: string; lineDisplayName?: string } | undefined,
  matchedCustomerIds?: Set<string>,
): boolean {
  if (!normalizeCustomerNameKey(query)) return true
  const v50Name = extractV50CustomerName(order)
  if (v50Name) return customerNamesEqual(v50Name, query)
  if (matchedCustomerIds?.has(order.customerId)) return true
  return customerRecordMatchesName(customer, query, 'exact')
}
