/** 正規化客戶銀行帳號後五碼（僅保留 5 位數字、去重） */
export function normalizeBankLastFive(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length < 5) return null
  return digits.slice(-5)
}

export function normalizeBankLastFiveCodes(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const code = normalizeBankLastFive(String(item ?? ''))
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push(code)
  }
  return out
}

export function addBankLastFive(existing: string[] | undefined, raw: string): { next: string[]; error?: string } {
  const code = normalizeBankLastFive(raw)
  if (!code) return { next: normalizeBankLastFiveCodes(existing), error: '請輸入至少 5 位數字' }
  const cur = normalizeBankLastFiveCodes(existing)
  if (cur.includes(code)) return { next: cur, error: '此後五碼已存在' }
  return { next: [...cur, code] }
}

export function removeBankLastFive(existing: string[] | undefined, code: string): string[] {
  const target = normalizeBankLastFive(code) || code
  return normalizeBankLastFiveCodes(existing).filter((x) => x !== target)
}

export function customerMatchesBankLastFiveQuery(codes: string[] | undefined, q: string): boolean {
  const needle = String(q || '').replace(/\D/g, '')
  if (!needle) return false
  return normalizeBankLastFiveCodes(codes).some((c) => c.includes(needle) || needle.includes(c))
}
