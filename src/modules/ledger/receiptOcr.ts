export type ReceiptHints = {
  /** 建議帶入「金額」欄位（記帳幣／原幣由使用者確認） */
  suggestedAmount?: number
  /** yyyy-mm-dd */
  suggestedDate?: string
  /** 可帶入備註的一行摘要 */
  suggestedNote?: string
}

/** 全形數字、常見 OCR 混淆 */
function normalizeDigits(s: string) {
  const map: Record<string, string> = {
    '０': '0',
    '１': '1',
    '２': '2',
    '３': '3',
    '４': '4',
    '５': '5',
    '６': '6',
    '７': '7',
    '８': '8',
    '９': '9',
    'O': '0',
    'o': '0',
    'l': '1',
    'I': '1',
    '|': '1',
  }
  return s
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
}

function parseMoneyToken(raw: string): number | null {
  const t = normalizeDigits(raw).replace(/,/g, '').replace(/[^\d.]/g, '')
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) return null
  return Math.round(n * 100) / 100
}

/** 民國 y/m/d → 西元 yyyy-mm-dd（民國元年 = 1912） */
function rocToIso(y: number, m: number, d: number): string | null {
  if (y < 1 || y > 200 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const gy = 1911 + y
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  const dt = new Date(`${gy}-${mm}-${dd}T12:00:00`)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

/**
 * 從 OCR 全文粗抓台灣發票／收據常見欄位（啟發式，務必人工確認）。
 */
export function parseTaiwanReceiptText(text: string): ReceiptHints {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  const flat = normalizeDigits(lines.join('\n'))

  const hints: ReceiptHints = {}

  const west = flat.match(/\b(20\d{2})[/\-.年](\d{1,2})[/\-.月](\d{1,2})(?:日|號)?\b/)
  if (west) {
    const y = west[1].padStart(4, '0')
    const mo = west[2].padStart(2, '0')
    const d = west[3].padStart(2, '0')
    const tryD = new Date(`${y}-${mo}-${d}T12:00:00`)
    if (!Number.isNaN(tryD.getTime())) hints.suggestedDate = `${y}-${mo}-${d}`
  }

  // 民國 xxx年xx月xx日 或 xxx/xx/xx（常見於發票）
  const roc1 = flat.match(/(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (roc1) {
    const y = Number(roc1[1])
    if (y >= 1 && y <= 200) {
      const iso = rocToIso(y, Number(roc1[2]), Number(roc1[3]))
      if (iso) hints.suggestedDate = iso
    }
  }
  if (!hints.suggestedDate) {
    const roc2 = flat.match(/\b(\d{2,3})\/(\d{1,2})\/(\d{1,2})\b/)
    if (roc2) {
      const y = Number(roc2[1])
      if (y >= 1 && y <= 200) {
        const iso = rocToIso(y, Number(roc2[2]), Number(roc2[3]))
        if (iso) hints.suggestedDate = iso
      }
    }
  }

  const totalKeywords = /(總計|合計|應收|應付|本次|支付|金額|Total|AMOUNT|NT\$|ＮＴ\$)/i
  let bestAmt: { n: number; score: number } | null = null

  for (const line of lines) {
    if (!line) continue
    const ln = normalizeDigits(line)
    const kw = totalKeywords.test(ln) ? 3 : 0
    const moneyPatterns = [
      /NT\$?\s*([\d,]+\.?\d*)/i,
      /ＮＴ\$\s*([\d,]+\.?\d*)/,
      /\$\s*([\d,]+\.?\d*)/,
      /([\d,]+\.?\d*)\s*元/,
    ]
    for (const re of moneyPatterns) {
      const m = ln.match(re)
      if (m) {
        const n = parseMoneyToken(m[1])
        if (n != null) {
          const score = kw + (n >= 10 && n < 500000 ? 2 : 0) + Math.min(n / 100000, 1)
          if (!bestAmt || score > bestAmt.score || (score === bestAmt.score && n > bestAmt.n)) {
            bestAmt = { n, score }
          }
        }
      }
    }
  }

  // 若沒關鍵字列，取全文最大「合理」金額作為弱提示
  if (!bestAmt) {
    const nums = [...flat.matchAll(/([\d,]{1,3}(?:,\d{3})*(?:\.\d+)?)/g)]
      .map((x) => parseMoneyToken(x[1]))
      .filter((x): x is number => x != null && x >= 10 && x < 1e7)
    if (nums.length) bestAmt = { n: Math.max(...nums), score: 0 }
  }

  if (bestAmt) hints.suggestedAmount = bestAmt.n

  const noteLine = lines.find((l) => /統一發票|電子發票|收據|店名|商家/i.test(l))
  if (noteLine && noteLine.length <= 80) hints.suggestedNote = noteLine

  return hints
}

export function isImageReceiptFile(file: File) {
  return /^image\//i.test(file.type)
}

/**
 * 瀏覽器端 OCR（預留）。
 * 專案預設未安裝 `tesseract.js` 以減少 bundle；若需啟用請安裝套件後改為 dynamic import 實作。
 */
export async function recognizeReceiptImage(
  file: File,
  onProgress?: (p: number) => void,
): Promise<string> {
  void onProgress
  if (!isImageReceiptFile(file)) {
    throw new Error('目前僅支援圖片格式（請用拍照或選擇 JPG／PNG）')
  }
  throw new Error('收據 OCR 未啟用：請安裝 tesseract.js 或改接後端辨識 API。')
}
