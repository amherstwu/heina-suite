/**
 * 「開團明細」主表（總表）解析：結單日、狀態、日幣、刷卡備註、物流、重量、官網連結等。
 * 以 AoA 掃描標題列，避免主表上方有標題列時 sheet_to_json 欄名錯亂。
 */
import * as XLSX from 'xlsx'
import { excelSerialToIsoDate, isOpenGroupRegistrationSheet } from './openGroupWorkbookHub'
import type { HeinaWorkbookSheetProfile } from './heinaWorkbookSheetProfile'
import { sheetNameExcludedByProfile } from './heinaWorkbookSheetProfile'
import type { Group, GroupStatus } from './types'

export type KaitoMasterParsedRow = {
  sourceSheet: string
  title: string
  closingDate: string
  saleEndDate: string
  purchaseDate: string
  purchasePlace: string
  shipEtaText: string
  phaseStatus: string
  jpyAmount: number
  cardPayNote: string
  detailNote: string
  logisticsNumber: string
  weightKg: string
  link: string
  /** 整列其餘文字彙總（除已抽欄位外） */
  restText: string
}

export type KaitoMasterGatherResult = {
  rows: KaitoMasterParsedRow[]
  warnings: string[]
}

function normCell(s: unknown): string {
  return String(s ?? '')
    .replace(/\s/g, '')
    .replace(/　/g, '')
    .toLowerCase()
}

function parseCellDate(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const iso = excelSerialToIsoDate(raw)
    if (iso) return iso
  }
  const t = String(raw).trim()
  if (!t) return ''
  const n = Number(String(t).replace(/,/g, ''))
  if (Number.isFinite(n) && n > 2000 && n < 120000) {
    const iso = excelSerialToIsoDate(n)
    if (iso) return iso
  }
  const m = t.match(/(\d{4})[./年-](\d{1,2})[./月-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return t.slice(0, 48)
}

function sumJpyFromText(raw: unknown): number {
  const s = String(raw ?? '').replace(/,/g, '')
  const nums = s.match(/\d+(?:\.\d+)?/g)
  if (!nums?.length) return 0
  return nums.reduce((a, x) => a + (Number(x) || 0), 0)
}

function firstUrlInRow(cells: unknown[]): string {
  const blob = cells.map((c) => String(c ?? '')).join(' ')
  const m = blob.match(/https?:\/\/[^\s"'<>[\]()]+/i)
  return m ? m[0].trim().slice(0, 2000) : ''
}

function isRegistrationHeaderAoA(headerCells: unknown[]): boolean {
  const blob = headerCells.map((c) => String(c ?? '')).join('|')
  return /名字|姓名|line|客戶|暱稱/i.test(blob) && /商品|品項|動畫|項目/i.test(blob)
}

function isMasterHeaderAoA(headerCells: unknown[]): boolean {
  const blob = headerCells.map((c) => String(c ?? '')).join('|')
  const hasClose = /結單|截單|開團日/i.test(blob)
  const hasMoney = /日幣|jpy|金額/i.test(blob)
  const hasShip = /出貨|抵達|到貨/i.test(blob)
  return hasClose && (hasMoney || hasShip)
}

function findCol(header: unknown[], matchers: RegExp[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = normCell(header[i])
    if (!h) continue
    if (matchers.some((re) => re.test(h))) return i
  }
  return -1
}

function inferGroupStatus(phase: string, shipEta: string): GroupStatus {
  const p = `${phase} ${shipEta}`.toLowerCase()
  if (/取消|退訂|作廢/.test(p)) return 'cancelled'
  if (/完成|結案|已取貨|已結/.test(p)) return 'completed'
  if (/出貨|寄出|配送|可取貨/.test(p)) return 'shipping'
  if (/抵台|到貨|理貨|入庫|已送達|送達日本|抵日/.test(p)) return 'arrived'
  if (/運送|空運|海運|通關|國際|發貨/.test(p)) return 'international_transit'
  if (/下單|備貨|採購|已訂|處理中|官方/.test(p)) return 'ordered'
  if (/結單|收單|截止|關單/.test(p)) return 'closed'
  return 'waiting_arrival'
}

/** 登記分頁名稱與主表品項名稱對應（去空白／符號後比對） */
export function kaitoSheetMatchesMasterTitle(sheetName: string, masterTitle: string): boolean {
  const squeeze = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[\s\-_/／、，,.・·]+/g, '')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
  const a = squeeze(sheetName)
  const b = squeeze(masterTitle)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  if (Math.min(a.length, b.length) < 4) return false
  const sa = new Set(a.split(''))
  const sb = new Set(b.split(''))
  let inter = 0
  for (const ch of sa) if (sb.has(ch)) inter++
  const ratio = inter / Math.max(sa.size, sb.size)
  return ratio >= 0.72
}

function parseMasterRowsFromAoA(sheetName: string, aoa: unknown[][], maxRows: number): { rows: KaitoMasterParsedRow[]; warnings: string[] } {
  const warnings: string[] = []
  const rows: KaitoMasterParsedRow[] = []
  if (!aoa?.length) return { rows, warnings }

  let headerIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 80); i++) {
    const r = aoa[i] as unknown[]
    if (!r?.length) continue
    if (isRegistrationHeaderAoA(r)) continue
    if (isMasterHeaderAoA(r)) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) return { rows, warnings }

  const h = aoa[headerIdx] as unknown[]
  const cTitle = findCol(h, [
    /第1欄/i,
    /^品項$/i,
    /^系列$/i,
    /品項名稱/i,
    /系列名稱/i,
    /品名/i,
    /團名/i,
    /商品名稱/i,
    /商品/i,
    /品項/i,
    /系列/i,
  ])
  const cClose = findCol(h, [/結單|截單|開團日/i])
  const cSaleEnd = findCol(h, [/結束販售|結束販賣|販售截止/i])
  const cPurchase = findCol(h, [/購買日|下單日|採購日/i])
  const cPlace = findCol(h, [/購買地|通路|來源/i])
  const cShip = findCol(h, [/出貨日|出貨|抵達|到貨預估/i])
  const cPhase = findCol(h, [/第2欄|狀態|進度|階段/i])
  const cJpy = findCol(h, [/日幣|jpy/i])
  const cCard = findCol(h, [/信用卡|刷卡|感費|扣款/i])
  const cDetail = findCol(h, [/明細/i])
  const cLog = findCol(h, [/物流編|追蹤|單號/i])
  const cWeight = findCol(h, [/重量/i])
  const cLink = findCol(h, [/已到貨|連結|網址|官網|購買連結|url/i])

  if (cTitle < 0) {
    warnings.push(`${sheetName}：主表有標題列但找不到品名／第1欄欄位，略過`)
    return { rows, warnings }
  }

  for (let ri = headerIdx + 1; ri < aoa.length && rows.length < maxRows; ri++) {
    const r = aoa[ri] as unknown[]
    if (!r?.length) continue
    const title = String(r[cTitle] ?? '').trim()
    if (!title || /^總計|合計|小計/i.test(title)) continue

    const cells = [...r]
    const link =
      (cLink >= 0 ? String(r[cLink] ?? '').trim() : '') ||
      (cDetail >= 0 ? firstUrlInRow([r[cDetail]]) : '') ||
      firstUrlInRow(cells)

    const used = new Set<number>()
    ;[cTitle, cClose, cSaleEnd, cPurchase, cPlace, cShip, cPhase, cJpy, cCard, cDetail, cLog, cWeight, cLink].forEach((idx) => {
      if (idx >= 0) used.add(idx)
    })
    const restParts: string[] = []
    for (let j = 0; j < cells.length; j++) {
      if (used.has(j)) continue
      const v = String(cells[j] ?? '').trim()
      if (v && v !== title) restParts.push(v)
    }

    rows.push({
      sourceSheet: sheetName,
      title: title.slice(0, 120),
      closingDate: cClose >= 0 ? parseCellDate(r[cClose]) : '',
      saleEndDate: cSaleEnd >= 0 ? parseCellDate(r[cSaleEnd]) : '',
      purchaseDate: cPurchase >= 0 ? parseCellDate(r[cPurchase]) : '',
      purchasePlace: cPlace >= 0 ? String(r[cPlace] ?? '').trim().slice(0, 80) : '',
      shipEtaText: cShip >= 0 ? String(r[cShip] ?? '').trim().slice(0, 120) : '',
      phaseStatus: cPhase >= 0 ? String(r[cPhase] ?? '').trim().slice(0, 200) : '',
      jpyAmount: cJpy >= 0 ? sumJpyFromText(r[cJpy]) : 0,
      cardPayNote: cCard >= 0 ? String(r[cCard] ?? '').trim().slice(0, 400) : '',
      detailNote: cDetail >= 0 ? String(r[cDetail] ?? '').trim().slice(0, 400) : '',
      logisticsNumber: cLog >= 0 ? String(r[cLog] ?? '').trim().slice(0, 120) : '',
      weightKg: cWeight >= 0 ? String(r[cWeight] ?? '').trim().slice(0, 40) : '',
      link: link.slice(0, 2000),
      restText: restParts.join('｜').slice(0, 600),
    })
  }

  if (!rows.length) warnings.push(`${sheetName}：偵測到主表標題列但無資料列`)
  return { rows, warnings }
}

export function masterParsedRowToGroupDraft(
  row: KaitoMasterParsedRow,
  exchangeRate: number,
  profileId: string,
): Omit<Group, 'id' | 'createdAt'> {
  const status = inferGroupStatus(row.phaseStatus, row.shipEtaText)
  const noteParts = [
    `版型主表：${profileId}`,
    `來源分頁：${row.sourceSheet}`,
    row.purchasePlace ? `購買地：${row.purchasePlace}` : '',
    row.cardPayNote ? `刷卡／帳務：${row.cardPayNote}` : '',
    row.detailNote ? `明細欄：${row.detailNote}` : '',
    row.weightKg ? `重量(kg)：${row.weightKg}` : '',
    row.restText ? `其他：${row.restText}` : '',
  ].filter(Boolean)
  return {
    name: row.title.slice(0, 80),
    status,
    closingDate: row.closingDate || new Date().toISOString().slice(0, 10),
    saleEndDate: row.saleEndDate || row.closingDate || new Date().toISOString().slice(0, 10),
    officialShipDate: row.shipEtaText,
    exchangeRate,
    jpyAmountTotal: Math.round(row.jpyAmount),
    orderNumber: '',
    logisticsNumber: row.logisticsNumber,
    purchaseLink: row.link,
    notes: noteParts.join('｜').slice(0, 1500),
    actualOrderDate: row.purchaseDate || undefined,
    supplierName: row.purchasePlace || undefined,
    customerAnnouncement: [row.phaseStatus, row.shipEtaText].filter(Boolean).join(' · ').slice(0, 500) || undefined,
    internalNotes: [
      row.cardPayNote ? `刷卡備註：${row.cardPayNote}` : '',
      row.logisticsNumber ? `物流編號：${row.logisticsNumber}` : '',
      row.weightKg ? `重量：${row.weightKg}` : '',
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 800),
  }
}

/** 主表摘要寫入訂單 customerNote 尾端，方便 #/portal 一併閱讀 */
export function masterSummaryForOrderNote(row: KaitoMasterParsedRow): string {
  const parts = [
    `【主表】${row.phaseStatus || '—'}`,
    row.shipEtaText ? `出貨／抵達：${row.shipEtaText}` : '',
    row.jpyAmount ? `日幣合計約：¥${Math.round(row.jpyAmount)}` : '',
    row.logisticsNumber ? `物流：${row.logisticsNumber}` : '',
    row.cardPayNote ? `刷卡：${row.cardPayNote}` : '',
    row.weightKg ? `重量：${row.weightKg}` : '',
    row.link ? `連結：${row.link}` : '',
  ].filter(Boolean)
  return parts.join('｜').slice(0, 420)
}

export function gatherKaitoMasterRowsFromWorkbookBuffer(
  workbookBuffer: ArrayBuffer,
  profile: HeinaWorkbookSheetProfile,
  sheetsMeta: { name: string; rows: Record<string, unknown>[] }[],
  opts?: { maxMasterRows?: number },
): KaitoMasterGatherResult {
  const maxPerSheet = opts?.maxMasterRows ?? 400
  const warnings: string[] = []
  const all: KaitoMasterParsedRow[] = []

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(workbookBuffer, { type: 'array' })
  } catch (e) {
    warnings.push(`主表解析失敗：${e instanceof Error ? e.message : String(e)}`)
    return { rows: [], warnings }
  }

  const metaByName = new Map(sheetsMeta.map((s) => [s.name, s.rows]))

  for (const name of wb.SheetNames) {
    if (sheetNameExcludedByProfile(name, profile)) {
      const isNamedMaster = profile.masterSheetNames.some((m) => m.toLowerCase() === name.toLowerCase())
      if (!isNamedMaster) continue
    }
    const jsonRows = metaByName.get(name) ?? []
    const first = jsonRows[0] ?? {}
    if (jsonRows.length && isOpenGroupRegistrationSheet(name, first)) continue

    const ws = wb.Sheets[name]
    if (!ws) continue
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]
    const { rows, warnings: w } = parseMasterRowsFromAoA(name, aoa, maxPerSheet)
    for (const x of w) warnings.push(x)
    all.push(...rows)
  }

  if (!all.length) warnings.push('未從任何分頁解析到主表資料列（仍會匯入登記訂單）')
  return { rows: all, warnings }
}

export function extractPreorderSheetTagFromRemark(remark: string): string | null {
  const m = remark.match(/預購分頁：([^｜]+)/)
  const s = m?.[1]?.trim()
  return s || null
}

export function buildRegistrationSheetToGroupId(
  masterTitles: { groupId: string; title: string }[],
  registrationSheetNames: string[],
): Map<string, string> {
  const m = new Map<string, string>()
  for (const sn of registrationSheetNames) {
    const hit = masterTitles.find((t) => kaitoSheetMatchesMasterTitle(sn, t.title))
    if (hit) m.set(sn, hit.groupId)
  }
  return m
}
