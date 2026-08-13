/**
 * 從貼上的文字解析「LINE 群組／記事本／試算表」風格成員清單。
 * LINE 一般帳號無法直接匯出群組成員 API，實務上多為手動複製貼上。
 */

export type LineImportRow = {
  lineDisplayName: string
  name: string
  phoneLast3: string
}

function stripBom(s: string) {
  return s.replace(/^\uFEFF/, '')
}

function normalizeSpaces(s: string) {
  return stripBom(s).replace(/\u3000/g, ' ').trim()
}

/** 去掉行首編號：1. 2) • - 等 */
function stripEnumeration(s: string) {
  return normalizeSpaces(s).replace(/^\s*[\d０-９]+[.、．:：)]\s*/u, '').replace(/^\s*[•·▪▫\-*]\s*/, '')
}

function splitCells(line: string): string[] {
  const t = stripEnumeration(line)
  if (!t) return []
  if (t.includes('\t')) return t.split('\t').map((c) => normalizeSpaces(c))
  if (t.includes('，')) return t.split('，').map((c) => normalizeSpaces(c))
  if (t.includes(',')) return t.split(',').map((c) => normalizeSpaces(c))
  return [t]
}

function digitsLast3(s: string): string | null {
  const d = s.replace(/\D/g, '')
  if (d.length >= 3) return d.slice(-3)
  return null
}

function looksLikeHeader(firstCell: string) {
  return /^(姓名|名字|顯示名|line|LINE|暱稱|暱名|手機|電話|末三碼|備註|序號|編號|#)/i.test(firstCell)
}

/**
 * 解析規則：
 * - 一行一位；空行略過。
 * - 單欄：整行當「LINE 顯示名」與「姓名」；末三碼預設 000。
 * - 若單欄內含尾端空白＋3 位數字，視為末三碼。
 * - 多欄（Tab 或逗號／中文逗號）：`顯示名, 姓名` 或 `顯示名, 末三碼` 或 `顯示名, 姓名, 末三碼`；欄位若為純 3 位數字當末三碼。
 */
export function parseLineGroupMemberList(raw: string): LineImportRow[] {
  const lines = raw.split(/\r\n|\n|\r/).map((l) => stripEnumeration(l))
  const out: LineImportRow[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cells = splitCells(line).filter(Boolean)
    if (cells.length === 0) continue
    if (i === 0 && looksLikeHeader(cells[0])) continue

    if (cells.length === 1) {
      let rest = cells[0]
      let phoneLast3 = '000'
      const m = rest.match(/^(.+?)\s+(\d{3})\s*$/)
      if (m) {
        rest = normalizeSpaces(m[1])
        phoneLast3 = m[2]
      }
      if (!rest) continue
      const key = rest.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ lineDisplayName: rest, name: rest, phoneLast3 })
      continue
    }

    const c0 = cells[0] || ''
    const c1 = cells[1] || ''
    const c2 = cells[2] || ''
    if (!c0) continue

    let lineDisplayName = c0
    let name = c0
    let phoneLast3 = '000'

    const c1Digits = c1.replace(/\D/g, '')
    const c1LooksPhone = c1 && c1Digits.length >= 3 && c1Digits.length === c1.replace(/[\s\-()（）]/g, '').length

    if (/^\d{3}$/.test(c1)) {
      phoneLast3 = c1
      name = c0
      lineDisplayName = c0
    } else if (c1 && c1LooksPhone) {
      lineDisplayName = c0
      name = c0
      phoneLast3 = digitsLast3(c1) ?? '000'
    } else if (c1) {
      lineDisplayName = c0
      name = c1
      if (/^\d{3}$/.test(c2)) phoneLast3 = c2
      else {
        const p2 = c2 ? digitsLast3(c2) : null
        if (p2) phoneLast3 = p2
      }
    }

    const key = lineDisplayName.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ lineDisplayName, name: name || lineDisplayName, phoneLast3 })
  }

  return out
}

/** 預覽：將新增幾人、與現有客戶重複（比對 LINE 顯示名，不分大小寫） */
export function countLineImportAgainstExisting(
  raw: string,
  existing: { lineDisplayName: string }[],
  skipDuplicates: boolean,
) {
  const rows = parseLineGroupMemberList(raw)
  if (!skipDuplicates) {
    return { parsed: rows.length, wouldAdd: rows.length, duplicatesVsExisting: 0 }
  }
  let dup = 0
  for (const r of rows) {
    const k = r.lineDisplayName.trim().toLowerCase()
    if (existing.some((c) => c.lineDisplayName.trim().toLowerCase() === k)) dup += 1
  }
  return { parsed: rows.length, wouldAdd: Math.max(0, rows.length - dup), duplicatesVsExisting: dup }
}
