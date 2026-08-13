/**
 * HeinaDataPack：對齊 GAS 試算表分頁的 Excel 進出格式（上架 Ready）
 */
import * as XLSX from 'xlsx'
import type { BankJournalRow, GroupBuyAppData, GroupBuyGroup, GroupBuyOrder } from '../api/types'

export const HEINA_DATA_PACK_VERSION = 1

export const HEINA_PACK_SHEETS = {
  meta: '_meta',
  orders: '訂單明細',
  journal: '銀行日記帳',
  settings: '系統設定',
  groups: '團務摘要',
  readme: '使用說明',
} as const

/** 與 gas/GroupBuy.gs GB_HEADER 一致 */
export const GB_ORDER_HEADER = [
  '名字',
  '商品',
  '數量',
  '日幣單價',
  '日幣總價',
  '台幣售價',
  '總額',
  '訂金',
  '國內運費',
  '國際運費',
  '尾款',
  '付款狀況',
  '出貨日',
  '系列',
  '__GroupID',
  '__GroupStatus',
  '__GroupClosing',
  '__GroupSaleEnd',
  '__GroupPurchase',
  '__GroupJpy',
  '__GroupOrderId',
  '__GroupLogisticsId',
  '__GroupLink',
  '__OrderID',
  '__PaymentInfo',
  '__ExportDate',
] as const

export const GB_JOURNAL_HEADER = ['ID', '日期', '銀行', '類型', '金額', '分類', '備註'] as const
export const GB_SETTINGS_HEADER = ['Key', 'Value'] as const
export const GB_GROUP_SUMMARY_HEADER = [
  '團ID',
  '團名',
  '狀態',
  '結單日',
  '販售截止',
  '官方出貨',
  '日幣總額',
  '訂單數',
] as const

export type DataPackImportMode = 'replace' | 'merge'

export type HeinaDataPackPayload = {
  packVersion: number
  exportedAt: string
  source: 'gas' | 'mock' | 'file'
  orderRows: (string | number)[][]
  journalRows: (string | number)[][]
  settingsRows: (string | number)[][]
  groupSummaryRows: (string | number)[][]
}

export type ExportDataPackResult = {
  ok: boolean
  message?: string
  pack?: HeinaDataPackPayload
}

export type ImportDataPackPayload = {
  mode: DataPackImportMode
  pack: HeinaDataPackPayload
  /** 要套用的分頁；缺省＝全部主要分頁 */
  sheets?: Array<'訂單明細' | '銀行日記帳' | '系統設定'>
}

export type ImportDataPackResult = {
  ok: boolean
  message?: string
  counts?: {
    orderRows: number
    journalRows: number
    settingsRows: number
  }
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 將團務資料展成 GAS 訂單明細列（含表頭） */
export function buildOrderFlatRows(groups: GroupBuyGroup[]): (string | number)[][] {
  const exportDate = new Date().toISOString().slice(0, 10)
  const rows: (string | number)[][] = [Array.from(GB_ORDER_HEADER)]
  for (const g of groups || []) {
    for (const o of g.orders || []) {
      const items = o.items?.length
        ? o.items
        : [{ name: '', qty: 0, jpy: 0, twd: 0 }]
      for (const it of items) {
        const qty = num(it.qty)
        const jpy = num(it.jpy)
        rows.push([
          o.customerName || '',
          it.name || '',
          qty,
          jpy,
          qty * jpy,
          num(it.twd),
          num(o.totalTwd),
          num(o.deposit),
          num(o.domesticShip),
          num(o.intlShip),
          num(o.balance),
          o.paymentStatus || '',
          g.officialShipDate || '',
          g.name || '',
          g.id || '',
          g.status || '已登記',
          g.closingDate || '',
          g.saleEndDate || '',
          g.purchaseDate || '',
          g.jpyAmount ?? '',
          g.orderId || '',
          g.logisticsId || '',
          g.purchaseLink || '',
          o.id || '',
          o.paymentInfo || '',
          exportDate,
        ])
      }
    }
  }
  return rows
}

export function buildJournalRows(journal: BankJournalRow[]): (string | number)[][] {
  const rows: (string | number)[][] = [Array.from(GB_JOURNAL_HEADER)]
  for (const j of journal || []) {
    rows.push([j.id || '', j.date || '', j.bank || '', j.type || '', num(j.amount), j.category || '', j.note || ''])
  }
  return rows
}

export function buildGroupSummaryRows(groups: GroupBuyGroup[]): (string | number)[][] {
  const rows: (string | number)[][] = [Array.from(GB_GROUP_SUMMARY_HEADER)]
  for (const g of groups || []) {
    rows.push([
      g.id || '',
      g.name || '',
      g.status || '',
      g.closingDate || '',
      g.saleEndDate || '',
      g.officialShipDate || '',
      g.jpyAmount ?? '',
      (g.orders || []).length,
    ])
  }
  return rows
}

/** 由 portal／匯率等組出系統設定列（含表頭）；額外 KV 可併入 */
export function buildSettingsRowsFromAppData(
  data: GroupBuyAppData,
  extraKv: Array<{ key: string; value: string }> = [],
): (string | number)[][] {
  const rows: (string | number)[][] = [Array.from(GB_SETTINGS_HEADER)]
  const pc = data.portalConfig || ({} as GroupBuyAppData['portalConfig'])
  const kv: Array<[string, string]> = [
    ['exchangeRate', String(data.exchangeRate ?? 0.22)],
    ['portalTitle', String(pc.title || '')],
    ['portalIntro', String(pc.intro || '')],
    ['portalWebsiteUrl', String(pc.websiteUrl || '')],
    ['portalGroupUrl', String(pc.groupUrl || '')],
    ['portalExtraNote', String(pc.extraNote || '')],
    ['portalLookupDesc', String(pc.lookupDesc || '')],
    ['portalLineFriendUrl', String(pc.lineFriendUrl || '')],
    ['portalLineShoppingUrl', String(pc.lineShoppingUrl || '')],
    ['portalInstagramUrl', String(pc.instagramUrl || '')],
    ['portalThreadsUrl', String(pc.threadsUrl || '')],
    ['portalPreorderShopUrl', String(pc.preorderShopUrl || '')],
    ['portalSpotShopUrl', String(pc.spotShopUrl || '')],
    ['portalFooter', String(pc.footer || '')],
  ]
  if (pc.announcements) kv.push(['portalAnnouncementsJson', JSON.stringify(pc.announcements)])
  if (pc.faqItems) kv.push(['portalFaqJson', JSON.stringify(pc.faqItems)])
  if (pc.processSteps) kv.push(['portalProcessStepsJson', JSON.stringify(pc.processSteps)])
  if (pc.guideInfographics) kv.push(['portalGuideInfographicsJson', JSON.stringify(pc.guideInfographics)])
  if (pc.homeOpenGroupIds) kv.push(['portalHomeOpenGroupIdsJson', JSON.stringify(pc.homeOpenGroupIds)])
  if (data.paymentReports) kv.push(['paymentReportsJson', JSON.stringify(data.paymentReports)])
  if (data.portalLookupCustomers) kv.push(['portalLookupCustomersJson', JSON.stringify(data.portalLookupCustomers)])
  if (data.customerBalanceMemos) kv.push(['customerBalanceMemosJson', JSON.stringify(data.customerBalanceMemos)])

  const seen = new Set<string>()
  for (const [k, v] of kv) {
    if (!k || seen.has(k)) continue
    seen.add(k)
    rows.push([k, v])
  }
  for (const e of extraKv) {
    const k = String(e.key || '').trim()
    if (!k || seen.has(k)) continue
    seen.add(k)
    rows.push([k, String(e.value ?? '')])
  }
  return rows
}

export function buildHeinaDataPackFromAppData(
  data: GroupBuyAppData,
  source: HeinaDataPackPayload['source'],
  extraSettings: Array<{ key: string; value: string }> = [],
): HeinaDataPackPayload {
  return {
    packVersion: HEINA_DATA_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    source,
    orderRows: buildOrderFlatRows(data.groups || []),
    journalRows: buildJournalRows(data.bankJournal || []),
    settingsRows: buildSettingsRowsFromAppData(data, extraSettings),
    groupSummaryRows: buildGroupSummaryRows(data.groups || []),
  }
}

function stripHeader(rows: (string | number)[][]): (string | number)[][] {
  if (!rows.length) return []
  const first = rows[0].map((c) => String(c))
  const looksHeader =
    first.includes('名字') ||
    first.includes('ID') ||
    first.includes('Key') ||
    first.includes('團ID') ||
    first[0] === 'packVersion'
  return looksHeader ? rows.slice(1) : rows
}

/** 扁平訂單列 → groups（簡化還原，對齊 GAS 隱藏欄） */
export function groupsFromOrderFlatRows(orderRows: (string | number)[][]): GroupBuyGroup[] {
  const body = stripHeader(orderRows)
  const map = new Map<string, GroupBuyGroup>()
  const orderMap = new Map<string, GroupBuyOrder>()

  for (const r of body) {
    const groupId = String(r[14] || '').trim() || `g_${String(r[13] || 'unknown')}`
    const groupName = String(r[13] || '')
    let g = map.get(groupId)
    if (!g) {
      g = {
        id: groupId,
        name: groupName || groupId,
        status: String(r[15] || '已登記'),
        closingDate: String(r[16] || ''),
        saleEndDate: String(r[17] || ''),
        officialShipDate: String(r[12] || ''),
        purchaseDate: String(r[18] || ''),
        jpyAmount: r[19] ?? '',
        orderId: String(r[20] || ''),
        logisticsId: String(r[21] || ''),
        purchaseLink: String(r[22] || ''),
        description: '',
        coverImageUrl: '',
        imageUrls: [],
        remarks: '',
        orders: [],
      }
      map.set(groupId, g)
    }

    const orderId = String(r[23] || '').trim() || `o_${groupId}_${String(r[0] || '')}_${orderMap.size}`
    const itemName = String(r[1] || '')
    const item = {
      name: itemName,
      qty: num(r[2]),
      jpy: num(r[3]),
      twd: num(r[5]),
    }
    const existing = orderMap.get(`${groupId}::${orderId}`)
    if (existing) {
      if (itemName) existing.items.push(item)
    } else {
      const o: GroupBuyOrder = {
        id: orderId,
        customerName: String(r[0] || ''),
        totalTwd: num(r[6]),
        deposit: num(r[7]),
        domesticShip: num(r[8]),
        intlShip: num(r[9]),
        balance: num(r[10]),
        paymentStatus: String(r[11] || ''),
        paymentInfo: String(r[24] || ''),
        items: itemName ? [item] : [],
      }
      orderMap.set(`${groupId}::${orderId}`, o)
      g.orders.push(o)
    }
  }
  return Array.from(map.values())
}

export function journalFromRows(journalRows: (string | number)[][]): BankJournalRow[] {
  return stripHeader(journalRows).map((r, i) => ({
    id: String(r[0] || `bj_${i}`),
    date: String(r[1] || ''),
    bank: String(r[2] || ''),
    type: String(r[3] || ''),
    amount: num(r[4]),
    category: String(r[5] || ''),
    note: String(r[6] || ''),
  }))
}

export function settingsKvFromRows(settingsRows: (string | number)[][]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of stripHeader(settingsRows)) {
    const k = String(r[0] || '').trim()
    if (!k) continue
    out[k] = String(r[1] ?? '')
  }
  return out
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 將 settings KV 合併進既有 GroupBuyAppData（portal／報表等） */
export function applySettingsKvToAppData(data: GroupBuyAppData, kv: Record<string, string>): GroupBuyAppData {
  const next: GroupBuyAppData = {
    ...data,
    portalConfig: { ...data.portalConfig },
  }
  if (kv.exchangeRate != null && kv.exchangeRate !== '') {
    next.exchangeRate = Number(kv.exchangeRate) || next.exchangeRate
  }
  const pc = next.portalConfig
  const set = (key: keyof typeof pc, sk: string) => {
    if (kv[sk] != null) (pc as Record<string, unknown>)[key as string] = kv[sk]
  }
  set('title', 'portalTitle')
  set('intro', 'portalIntro')
  set('websiteUrl', 'portalWebsiteUrl')
  set('groupUrl', 'portalGroupUrl')
  set('extraNote', 'portalExtraNote')
  set('lookupDesc', 'portalLookupDesc')
  set('lineFriendUrl', 'portalLineFriendUrl')
  set('lineShoppingUrl', 'portalLineShoppingUrl')
  set('instagramUrl', 'portalInstagramUrl')
  set('threadsUrl', 'portalThreadsUrl')
  set('preorderShopUrl', 'portalPreorderShopUrl')
  set('spotShopUrl', 'portalSpotShopUrl')
  set('footer', 'portalFooter')
  if (kv.portalAnnouncementsJson) pc.announcements = parseJsonSafe(kv.portalAnnouncementsJson, pc.announcements)
  if (kv.portalFaqJson) pc.faqItems = parseJsonSafe(kv.portalFaqJson, pc.faqItems)
  if (kv.portalProcessStepsJson) pc.processSteps = parseJsonSafe(kv.portalProcessStepsJson, pc.processSteps)
  if (kv.portalGuideInfographicsJson) {
    pc.guideInfographics = parseJsonSafe(kv.portalGuideInfographicsJson, pc.guideInfographics)
  }
  if (kv.portalHomeOpenGroupIdsJson) {
    pc.homeOpenGroupIds = parseJsonSafe(kv.portalHomeOpenGroupIdsJson, pc.homeOpenGroupIds)
  }
  if (kv.paymentReportsJson) next.paymentReports = parseJsonSafe(kv.paymentReportsJson, next.paymentReports)
  if (kv.portalLookupCustomersJson) {
    next.portalLookupCustomers = parseJsonSafe(kv.portalLookupCustomersJson, next.portalLookupCustomers)
  }
  if (kv.customerBalanceMemosJson) {
    next.customerBalanceMemos = parseJsonSafe(kv.customerBalanceMemosJson, next.customerBalanceMemos)
  }
  return next
}

export function mergeGroupsById(base: GroupBuyGroup[], incoming: GroupBuyGroup[]): GroupBuyGroup[] {
  const map = new Map(base.map((g) => [g.id, g]))
  for (const g of incoming) {
    map.set(g.id, g)
  }
  return Array.from(map.values())
}

export function mergeJournalById(base: BankJournalRow[], incoming: BankJournalRow[]): BankJournalRow[] {
  const map = new Map(base.map((j) => [j.id, j]))
  for (const j of incoming) {
    map.set(j.id, j)
  }
  return Array.from(map.values())
}

export function applyDataPackToAppData(
  existing: GroupBuyAppData,
  pack: HeinaDataPackPayload,
  mode: DataPackImportMode,
  sheets?: ImportDataPackPayload['sheets'],
): GroupBuyAppData {
  const want = new Set(sheets?.length ? sheets : (['訂單明細', '銀行日記帳', '系統設定'] as const))
  let next: GroupBuyAppData = { ...existing }

  if (want.has('訂單明細')) {
    const incoming = groupsFromOrderFlatRows(pack.orderRows || [])
    next.groups = mode === 'replace' ? incoming : mergeGroupsById(existing.groups || [], incoming)
  }
  if (want.has('銀行日記帳')) {
    const incoming = journalFromRows(pack.journalRows || [])
    next.bankJournal = mode === 'replace' ? incoming : mergeJournalById(existing.bankJournal || [], incoming)
  }
  if (want.has('系統設定')) {
    const kv = settingsKvFromRows(pack.settingsRows || [])
    next = applySettingsKvToAppData(next, kv)
  }
  return next
}

function readmeAoA(): (string | number)[][] {
  return [
    ['Heina Suite 資料包（HeinaDataPack）'],
    ['版本', HEINA_DATA_PACK_VERSION],
    [''],
    ['用途'],
    ['正式資料庫為 Google 試算表（Apps Script）。本 Excel 用於下載整理後再上傳匯回。'],
    [''],
    ['工作表'],
    ['_meta', '匯出版本與時間'],
    ['訂單明細', '與試算表「訂單明細」欄位一致（含 __GroupID 等隱藏欄）'],
    ['銀行日記帳', '與試算表「銀行日記帳」一致'],
    ['系統設定', 'Key / Value（含 portal、報表 JSON；可能含敏感設定，勿外傳）'],
    ['團務摘要', '僅供閱讀整理；匯入以訂單明細為準'],
    [''],
    ['匯入模式'],
    ['replace', '指定分頁整段覆寫'],
    ['merge', '以團ID／日記帳ID／設定 Key 合併'],
  ]
}

export function heinaDataPackToXlsxBlob(pack: HeinaDataPackPayload): Blob {
  const wb = XLSX.utils.book_new()
  const meta = [
    ['packVersion', pack.packVersion],
    ['exportedAt', pack.exportedAt],
    ['source', pack.source],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readmeAoA()), HEINA_PACK_SHEETS.readme)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), HEINA_PACK_SHEETS.meta)
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(pack.orderRows?.length ? pack.orderRows : [Array.from(GB_ORDER_HEADER)]),
    HEINA_PACK_SHEETS.orders,
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(pack.journalRows?.length ? pack.journalRows : [Array.from(GB_JOURNAL_HEADER)]),
    HEINA_PACK_SHEETS.journal,
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(pack.settingsRows?.length ? pack.settingsRows : [Array.from(GB_SETTINGS_HEADER)]),
    HEINA_PACK_SHEETS.settings,
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      pack.groupSummaryRows?.length ? pack.groupSummaryRows : [Array.from(GB_GROUP_SUMMARY_HEADER)],
    ),
    HEINA_PACK_SHEETS.groups,
  )
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadHeinaDataPackXlsx(pack: HeinaDataPackPayload, filename?: string) {
  const blob = heinaDataPackToXlsxBlob(pack)
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const name = filename || `heina-datapack-${ts}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function sheetToAoa(wb: XLSX.WorkBook, name: string): (string | number)[][] {
  const ws = wb.Sheets[name]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' }) as (string | number)[][]
}

export function parseHeinaDataPackFromXlsx(data: ArrayBuffer): HeinaDataPackPayload {
  const wb = XLSX.read(data, { type: 'array' })
  const metaRows = sheetToAoa(wb, HEINA_PACK_SHEETS.meta)
  const meta: Record<string, string> = {}
  for (const r of metaRows) {
    const k = String(r[0] || '').trim()
    if (k) meta[k] = String(r[1] ?? '')
  }
  return {
    packVersion: Number(meta.packVersion) || HEINA_DATA_PACK_VERSION,
    exportedAt: meta.exportedAt || new Date().toISOString(),
    source: (meta.source as HeinaDataPackPayload['source']) || 'file',
    orderRows: sheetToAoa(wb, HEINA_PACK_SHEETS.orders),
    journalRows: sheetToAoa(wb, HEINA_PACK_SHEETS.journal),
    settingsRows: sheetToAoa(wb, HEINA_PACK_SHEETS.settings),
    groupSummaryRows: sheetToAoa(wb, HEINA_PACK_SHEETS.groups),
  }
}

export function summarizeDataPack(pack: HeinaDataPackPayload) {
  return {
    orderDataRows: Math.max(0, (pack.orderRows?.length || 0) - 1),
    journalDataRows: Math.max(0, (pack.journalRows?.length || 0) - 1),
    settingsDataRows: Math.max(0, (pack.settingsRows?.length || 0) - 1),
    groupSummaryRows: Math.max(0, (pack.groupSummaryRows?.length || 0) - 1),
  }
}

export function normalizePackPayload(raw: unknown): HeinaDataPackPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<HeinaDataPackPayload>
  return {
    packVersion: Number(o.packVersion) || HEINA_DATA_PACK_VERSION,
    exportedAt: String(o.exportedAt || new Date().toISOString()),
    source: (o.source as HeinaDataPackPayload['source']) || 'file',
    orderRows: Array.isArray(o.orderRows) ? o.orderRows : [Array.from(GB_ORDER_HEADER)],
    journalRows: Array.isArray(o.journalRows) ? o.journalRows : [Array.from(GB_JOURNAL_HEADER)],
    settingsRows: Array.isArray(o.settingsRows) ? o.settingsRows : [Array.from(GB_SETTINGS_HEADER)],
    groupSummaryRows: Array.isArray(o.groupSummaryRows)
      ? o.groupSummaryRows
      : [Array.from(GB_GROUP_SUMMARY_HEADER)],
  }
}
