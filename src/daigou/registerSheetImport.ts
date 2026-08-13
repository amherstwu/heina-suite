/**
 * 將常見「團購登記表」試算表結構（名字／商品／數量／日幣單價／金額／總金額…）
 * 解析為訂單區塊，供批次寫入 store（與「商品匯入」分開）。
 */
import type { OrderItem } from './types'

function norm(s: string) {
  return String(s).replace(/\s/g, '').toLowerCase()
}

function pick(row: Record<string, unknown>, ...candidates: string[]): string {
  const keys = Object.keys(row)
  const idx = new Map<string, string>()
  for (const k of keys) idx.set(norm(k), k)
  for (const c of candidates) {
    const k = idx.get(norm(c))
    if (k != null && row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim()
  }
  return ''
}

function numCell(row: Record<string, unknown>, ...candidates: string[]): number {
  const s = pick(row, ...candidates)
  if (!s) return 0
  const n = Number(String(s).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function isHeaderRow(row: Record<string, unknown>): boolean {
  const n = pick(row, '名字', '姓名')
  const p = pick(row, '商品', '品名', '品項')
  if (n === '名字' || n === '姓名') return true
  if (p === '商品' || p === '品項') return true
  return false
}

function truthyMyship(v: string): boolean {
  if (!v) return false
  return /[v√✓是1y]/i.test(v) || norm(v).includes('賣貨便')
}

const KNOWN_COL_NORMS = new Set(
  [
    '名字',
    '姓名',
    '暱稱',
    '商品',
    '品名',
    '品項',
    '數量',
    '日幣單價',
    '日幣',
    '單價',
    '匯率',
    '金額',
    '折碼',
    '公式',
    '調整',
    '總金額',
    '合計',
    '應收',
    '訂金',
    '尾款',
    '備註',
    '說明',
    '賣貨便',
    '國內運',
    '國內運費',
    '運費',
    'qty',
    'jpy',
  ].map(norm),
)

/** 無標題欄（例如最右欄運費）嘗試當作國內運費數字 */
function pickUnassignedPositiveNumber(row: Record<string, unknown>): number {
  for (const k of Object.keys(row)) {
    const nk = norm(k)
    if (!nk || nk.startsWith('__empty')) continue
    if (KNOWN_COL_NORMS.has(nk)) continue
    const raw = row[k]
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0 && n < 500_000) return n
  }
  return 0
}

export type RegisterSheetOrderBlock = {
  customerName: string
  items: OrderItem[]
  domesticShipping: number
  internationalShipping: number
  sheetTotalTwd: number | null
  rawDeposit: number
  remark: string
  myship: boolean
}

export type RegisterSheetParseResult = {
  blocks: RegisterSheetOrderBlock[]
  warnings: string[]
}

function mergeFooter(cur: RegisterSheetOrderBlock, row: Record<string, unknown>) {
  const t = numCell(row, '總金額', '合計', '應收')
  if (t > 0) cur.sheetTotalTwd = t
  const d = numCell(row, '訂金')
  if (d > 0) cur.rawDeposit = d
  const r = pick(row, '備註', '說明', 'note')
  if (r) cur.remark = cur.remark ? `${cur.remark}；${r}` : r
  if (truthyMyship(pick(row, '賣貨便', '便'))) cur.myship = true
  const ds = numCell(row, '國內運', '國內運費', '運費')
  if (ds > 0) cur.domesticShipping = Math.max(cur.domesticShipping, ds)
  const extra = pickUnassignedPositiveNumber(row)
  if (extra > 0 && cur.domesticShipping === 0) cur.domesticShipping = extra
}

/**
 * 假設列順序與一般登記表相同：同一客戶僅第一列填「名字」，以下列留空續商品。
 */
export function parseRegisterSheetOrderBlocks(
  rows: Record<string, unknown>[],
  opts: { defaultExchangeRate: number },
): RegisterSheetParseResult {
  const warnings: string[] = []
  if (!rows.length) return { blocks: [], warnings: ['沒有任何列'] }

  let start = 0
  if (isHeaderRow(rows[0])) start = 1

  const blocks: RegisterSheetOrderBlock[] = []
  let cur: RegisterSheetOrderBlock | null = null

  const flush = () => {
    if (cur && cur.items.length) blocks.push(cur)
    cur = null
  }

  for (let i = start; i < rows.length; i++) {
    const row = rows[i]
    const name = pick(row, '名字', '姓名', '暱稱')
    const product = pick(row, '商品', '品名', '品項')
    const qtyHint = numCell(row, '數量', 'qty', '數')
    const lineMoney = numCell(row, '金額', '台幣', '小計', '台幣金額')
    const empty =
      !name &&
      !product &&
      !qtyHint &&
      !lineMoney &&
      !numCell(row, '日幣單價', '日幣', '單價', 'jpy') &&
      !numCell(row, '總金額', '合計')
    if (empty) continue

    if (name) {
      flush()
      cur = {
        customerName: name,
        items: [],
        domesticShipping: 0,
        internationalShipping: 0,
        sheetTotalTwd: null,
        rawDeposit: 0,
        remark: '',
        myship: false,
      }
      mergeFooter(cur, row)
    }

    if (!cur) {
      if (product) warnings.push(`第 ${i + 1} 列：有商品「${product}」但上方尚無客戶名字，已略過`)
      continue
    }

    if (product) {
      const qty = Math.max(1, qtyHint || 1)
      const jpyUnit = numCell(row, '日幣單價', '日幣', 'jpy', '單價')
      const rate = numCell(row, '匯率', '匯') || opts.defaultExchangeRate
      let lineTwd = lineMoney
      if (!lineTwd && jpyUnit && qty) lineTwd = Math.ceil(jpyUnit * qty * rate)
      const twdUnit = qty > 0 ? lineTwd / qty : lineTwd

      cur.items.push({
        productId: `reg_${i}_${norm(product).replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'item'}`,
        name: product,
        qty,
        jpyUnit: jpyUnit || 0,
        twdUnit: twdUnit || 0,
      })
    }

    mergeFooter(cur, row)
  }
  flush()

  for (const b of blocks) {
    if (b.sheetTotalTwd != null && b.items.length) {
      const sum = b.items.reduce((s, it) => s + it.twdUnit * it.qty, 0)
      if (Math.abs(sum - b.sheetTotalTwd) > 2) {
        warnings.push(
          `「${b.customerName}」品項台幣加總 ${Math.round(sum)} 與試算表「總金額」${b.sheetTotalTwd} 不一致，訂單金額仍以品項加總＋運費計算。`,
        )
      }
    }
  }

  return { blocks, warnings }
}
