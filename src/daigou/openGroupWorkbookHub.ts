/**
 * 「開團明細」類工作簿：解析主表列、登記分頁、結構分頁，供開團與預購中心預覽／上傳使用。
 */
import * as XLSX from 'xlsx'
import type { OpenGroupMasterRow, OpenGroupWorkbookInsights } from './openGroupWorkbookHub.types'

export type { OpenGroupMasterRow, OpenGroupWorkbookInsights } from './openGroupWorkbookHub.types'

function normKey(s: string) {
  return String(s).replace(/\s/g, '').toLowerCase()
}

function hasAnyKey(row: Record<string, unknown>, keys: string[]) {
  const keySet = new Set(Object.keys(row).map(normKey))
  return keys.some((k) => keySet.has(normKey(k)))
}

/** Excel 1900 日期序列 → ISO 日期字串（僅合理區間） */
export function excelSerialToIsoDate(serial: unknown): string | null {
  const n = Number(serial)
  if (!Number.isFinite(n) || n < 2000 || n > 80000) return null
  const ms = Math.round((n - 25569) * 86400 * 1000)
  return new Date(ms).toISOString().slice(0, 10)
}

const STRUCT_SHEET_NAMES = new Set([
  '開團明細',
  '開團表單',
  '團清單',
  '商品清單',
  '預購登記',
  '客戶名單',
  '私接訂單',
  '分需彙總',
  '二補匯率',
])

export const OPEN_GROUP_STRUCT_ROLE: Record<string, string> = {
  開團明細: '主檔總表',
  開團表單: '單團主檔',
  團清單: '團別代碼',
  商品清單: '報價對照',
  預購登記: '預購登記',
  客戶名單: '客戶主檔',
  私接訂單: '私接／特殊單',
  分需彙總: '分攤彙總',
  二補匯率: '二補匯率',
}

/** 開團明細工作表：第一欄為品項／系列名，其餘欄依常見範本位置解析 */
export function parseKaitoMasterRowsFromAoA(rows: unknown[][]): OpenGroupMasterRow[] {
  const out: OpenGroupMasterRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    const title = String(r[0] ?? '').trim()
    if (!title) continue
    const link = String(r[14] ?? '').trim()
    out.push({
      title,
      closingDate: excelSerialToIsoDate(r[1]),
      saleEndDate: excelSerialToIsoDate(r[2]),
      purchaseDate: excelSerialToIsoDate(r[3]),
      purchasePlace: String(r[4] ?? '').trim(),
      shipEta: String(r[5] ?? '').trim(),
      phase: String(r[6] ?? '').trim(),
      jpyAmount: r[7] !== '' && r[7] != null ? String(r[7]) : '',
      cardPay: String(r[8] ?? '').trim(),
      link: link && /^https?:\/\//i.test(link) ? link : undefined,
    })
    if (out.length >= 80) break
  }
  return out
}

/** 是否為「登記／已購買」類分頁（含私接訂單）；供開團中心與整檔預購匯入共用 */
export function isOpenGroupRegistrationSheet(name: string, firstRow: Record<string, unknown>) {
  const badName =
    /(樞紐|linebank|流水帳|總攬|設定|代碼表|紀錄|信用卡|^開團明細$|^開團表單$|^團清單$|^商品清單$|^預購登記$|^客戶名單$|^分需彙總$|^二補匯率$)/i
  if (badName.test(name)) return false
  const hasName = hasAnyKey(firstRow, ['名字', '姓名', '在群裡的名字', 'LINE名子', '客戶', '臉書', '平台'])
  const hasItem = hasAnyKey(firstRow, ['商品', '品項', '項目', '動畫IP'])
  return hasName && hasItem
}

function isRegistrationSheet(name: string, firstRow: Record<string, unknown>) {
  return isOpenGroupRegistrationSheet(name, firstRow)
}

export function analyzeOpenGroupWorkbook(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  masterAoA: unknown[][] | null,
  sourceLabel: string,
): OpenGroupWorkbookInsights {
  const registration: { name: string; count: number }[] = []
  for (const s of sheets) {
    if (!s.rows.length) continue
    const first = s.rows[0] ?? {}
    if (isRegistrationSheet(s.name, first)) {
      registration.push({ name: s.name, count: Math.max(0, s.rows.length - 1) })
    }
  }
  registration.sort((a, b) => b.count - a.count)

  const structSheets = [...STRUCT_SHEET_NAMES]
    .filter((n) => sheets.some((x) => x.name === n))
    .map((name) => {
      const s = sheets.find((x) => x.name === name)
      return {
        name,
        rowCount: s?.rows.length ?? 0,
        role: OPEN_GROUP_STRUCT_ROLE[name] ?? '結構表',
      }
    })

  const masterRowsSample = masterAoA?.length ? parseKaitoMasterRowsFromAoA(masterAoA) : []

  return {
    version: 1,
    sourceLabel,
    workbookSheetTotal: sheets.length,
    registrationSheetCount: registration.length,
    registrationTopSheets: registration.slice(0, 36).map((x) => x.name),
    structSheets,
    masterRowsSample: masterRowsSample.slice(0, 40),
  }
}

/** 從使用者上傳的 .xlsx 解析（與「試算表／Excel」匯入相容之分頁邏輯） */
export function parseOpenGroupInsightsFromArrayBuffer(ab: ArrayBuffer, fileName: string): OpenGroupWorkbookInsights {
  const wb = XLSX.read(ab, { type: 'array' })
  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    if (!ws) return { name, rows: [] as Record<string, unknown>[] }
    return { name, rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' }) }
  })
  const masterWs = wb.Sheets['開團明細']
  const masterAoA = masterWs
    ? (XLSX.utils.sheet_to_json(masterWs, { header: 1, defval: '' }) as unknown[][])
    : null
  return analyzeOpenGroupWorkbook(sheets, masterAoA, fileName)
}
