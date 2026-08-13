import * as XLSX from 'xlsx'
import type { LiveLine } from './liveTypes'

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

function num(row: Record<string, unknown>, ...candidates: string[]): number {
  const raw = pick(row, ...candidates)
  if (!raw) return 0
  const n = Number(String(raw).replace(/,/g, '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const LIVE_IMPORT_HEADERS = [
  '連線名稱',
  '名字',
  '商品',
  '數量',
  '日幣單價',
  '台幣總額',
  '已收訂金',
] as const

export type LiveImportRow = {
  sessionName: string
  customerName: string
  productName: string
  qty: number
  jpyUnit: number
  twdTotal: number
  deposit: number
}

export type LiveImportParseResult = {
  rows: LiveImportRow[]
  warnings: string[]
  sessionNames: string[]
}

export function downloadLiveImportTemplateXlsx() {
  const wb = XLSX.utils.book_new()
  const rows: (string | number)[][] = [
    [...LIVE_IMPORT_HEADERS],
    ['7/16連線', '小葵', '一番賞 A賞', 1, 1500, 450, 0],
    ['7/16連線', '小葵', '徽章', 2, 500, 300, 0],
    ['7/16連線', '阿哲', '資料夾', 1, 800, 240, 100],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '連線明細')
  const note: (string | number)[][] = [
    ['匯入說明'],
    ['1. 同一連線名稱會併入同一場連線。'],
    ['2. 台幣總額＝該列品項小計（數量×台幣單價，或直接填小計）。'],
    ['3. 已收訂金可留空或 0＝全額貨到付款；有填則尾款於出貨／取貨收取。'],
    ['4. 連線商品預設貨到付款，不需走付款審核。'],
    ['5. 匯入後可上傳連線照片，並一鍵同步到出貨物流。'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(note), '說明')
  XLSX.writeFile(wb, '連線匯入範本.xlsx')
}

export function parseLiveImportWorkbook(ab: ArrayBuffer): LiveImportParseResult {
  const wb = XLSX.read(ab, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { rows: [], warnings: ['找不到工作表'], sessionNames: [] }
  const ws = wb.Sheets[sheetName]
  if (!ws) return { rows: [], warnings: ['工作表空白'], sessionNames: [] }
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  const warnings: string[] = []
  const rows: LiveImportRow[] = []
  const sessionSet = new Set<string>()

  let start = 0
  if (json.length && pick(json[0], '連線名稱', '名字', '商品') === '連線名稱') start = 1

  for (let i = start; i < json.length; i++) {
    const row = json[i]
    const sessionName = pick(row, '連線名稱', '連線', '場次') || '未命名連線'
    const customerName = pick(row, '名字', '姓名', '客戶名字', '客人')
    const productName = pick(row, '商品', '品名', '品項')
    const qty = Math.max(1, num(row, '數量', 'qty') || 1)
    const jpyUnit = num(row, '日幣單價', '日幣', 'jpy')
    let twdTotal = num(row, '台幣總額', '台幣小計', '台幣', '金額')
    const twdUnit = num(row, '台幣單價', '台幣售價')
    if (!twdTotal && twdUnit) twdTotal = twdUnit * qty
    const deposit = Math.max(0, num(row, '已收訂金', '訂金', 'deposit'))

    if (!customerName && !productName && !twdTotal) continue
    if (!customerName) {
      warnings.push(`第 ${i + 2} 列：缺少名字，已略過`)
      continue
    }
    if (!productName) {
      warnings.push(`第 ${i + 2} 列（${customerName}）：缺少商品，已略過`)
      continue
    }

    sessionSet.add(sessionName)
    rows.push({
      sessionName,
      customerName,
      productName,
      qty,
      jpyUnit,
      twdTotal,
      deposit: Math.min(deposit, twdTotal || deposit),
    })
  }

  return { rows, warnings, sessionNames: [...sessionSet] }
}

export function liveImportRowsToLines(rows: LiveImportRow[], newId: () => string): LiveLine[] {
  return rows.map((r) => ({
    id: newId(),
    customerName: r.customerName,
    productName: r.productName,
    qty: r.qty,
    jpyUnit: r.jpyUnit,
    twdTotal: r.twdTotal,
    deposit: r.deposit,
  }))
}

export function exportLiveSessionXlsx(sessionName: string, lines: LiveLine[], filename?: string) {
  const wb = XLSX.utils.book_new()
  const rows: (string | number)[][] = [
    [...LIVE_IMPORT_HEADERS],
    ...lines.map((l) => [
      sessionName,
      l.customerName,
      l.productName,
      l.qty,
      l.jpyUnit,
      l.twdTotal,
      l.deposit,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '連線明細')
  const ts = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, (filename ?? `連線-${sessionName}-${ts}.xlsx`).replace(/[\\/*?:\[\]]/g, '_'))
}
