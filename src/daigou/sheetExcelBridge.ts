/**
 * Google 試算表 / Microsoft Excel 串聯工具（純前端）
 * - Excel：多工作表 .xlsx 匯出、檔案／貼上 CSV 解析後匯入商品
 * - Google：產生官方 export 連結（下載 CSV／xlsx）、已發布網頁 CSV 嘗試 fetch
 */
import * as XLSX from 'xlsx'
import type { DaigouState, Product, ProductStatus } from './types'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, GROUP_STATUS_LABEL, TRANSACTION_TYPE_LABEL, TRANSACTION_CATEGORY_LABEL } from './constants'

/** Google 試算表 ID 轉成「瀏覽器下載 CSV」連結（需已登入 Google 且有權限） */
export function googleSheetCsvExportUrl(spreadsheetId: string, gid = '0') {
  const id = spreadsheetId.trim()
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}`
}

export function googleSheetXlsxExportUrl(spreadsheetId: string) {
  const id = spreadsheetId.trim()
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
}

export function googleSheetEditUrl(spreadsheetId: string) {
  const id = spreadsheetId.trim()
  return `https://docs.google.com/spreadsheets/d/${id}/edit`
}

/** 已發布到網路的試算表 CSV（較有機會被 fetch，仍可能受 CORS 限制） */
export function googlePublishedCsvUrl(publishedCsvUrl: string) {
  return publishedCsvUrl.trim()
}

export async function tryFetchText(url: string, signal?: AbortSignal): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const r = await fetch(url, { mode: 'cors', signal })
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
    const text = await r.text()
    return { ok: true, text }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

export function pickCell(row: Record<string, unknown>, ...candidates: string[]): string {
  const keys = Object.keys(row)
  const norm = (s: string) => s.replace(/\s/g, '').toLowerCase()
  const idx = new Map<string, string>()
  for (const k of keys) idx.set(norm(k), k)
  for (const c of candidates) {
    const k = idx.get(norm(c))
    if (k != null && row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim()
  }
  return ''
}

/** 將試算表／Excel 一列轉成可寫入 store 的商品（缺欄位用預設補） */
export function sheetRowToProductDraft(
  row: Record<string, unknown>,
  defaults: {
    groupId?: string
    exchangeMultiplier: number
    imageUrl: string
    categoryFallback: string
    ipFallback: string
  },
): Omit<Product, 'id'> | null {
  const name = pickCell(row, '商品名稱', '品名', 'name', 'Name')
  if (!name) return null
  const jpy = Number(pickCell(row, '日幣', 'JPY', 'jpy', '日幣價')) || 0
  let twd = Number(pickCell(row, '台幣', 'TWD', 'twd', '台幣售價')) || 0
  if (!twd && jpy) twd = Math.ceil(jpy * defaults.exchangeMultiplier)
  const groupId = pickCell(row, '團ID', '團id', 'groupId', 'group_id') || defaults.groupId
  const category = pickCell(row, '分類', 'category') || defaults.categoryFallback
  const ipSeries = pickCell(row, 'IP', 'IP系列', 'ip', 'ipSeries') || defaults.ipFallback
  const productCode = pickCell(row, '商品編碼', 'SKU', 'productCode', 'code')
  const limitPerCustomer = Number(pickCell(row, '每人上限', 'limitPerCustomer', '單人上限')) || 5
  const preorderLimit = Number(pickCell(row, '預購上限', 'preorderLimit', '總量上限')) || undefined
  const stockQty = Number(pickCell(row, '庫存', 'stockQty', '現貨')) || 0
  const preorderQty = Number(pickCell(row, '已預購', 'preorderQty', '預購量')) || 0
  const statusRaw = pickCell(row, '狀態', 'status', '商品狀態')
  const allowed: ProductStatus[] = [
    'draft',
    'open_preorder',
    'almost_sold_out',
    'available',
    'low_stock',
    'sold_out',
    'closed',
    'closed_preorder',
    'ordered_po',
    'arrived_stock',
    'shortage',
    'cancelled_product',
  ]
  const status = (allowed.includes(statusRaw as ProductStatus) ? statusRaw : 'available') as ProductStatus

  return {
    groupId,
    productCode: productCode || undefined,
    name,
    imageUrl: defaults.imageUrl,
    imageGallery: [defaults.imageUrl],
    category,
    ipSeries,
    characterName: pickCell(row, '角色', 'characterName') || undefined,
    supplier: pickCell(row, '供應商', 'supplier') || undefined,
    purchaseUrl: pickCell(row, '購買連結', 'purchaseUrl', 'url') || undefined,
    jpyPrice: jpy,
    twdPrice: twd,
    exchangeMultiplier: defaults.exchangeMultiplier,
    pricingRule: pickCell(row, '計價規則', 'pricingRule') || undefined,
    isBlindBox: /是|true|1|Y/i.test(pickCell(row, '盲盒', 'isBlindBox')),
    canOpenBlindBox: /是|true|1|Y/i.test(pickCell(row, '可開盒', 'canOpenBlindBox')),
    openingFee: Number(pickCell(row, '開盒費', 'openingFee')) || 0,
    stockQty,
    preorderQty,
    preorderLimit: preorderLimit && preorderLimit > 0 ? preorderLimit : undefined,
    limitPerCustomer,
    status,
    internalNote: pickCell(row, '內部備註', 'internalNote') || undefined,
    customerNote: pickCell(row, '對客備註', 'customerNote') || undefined,
  }
}

export function parseWorkbookToJsonSheets(data: ArrayBuffer): { name: string; rows: Record<string, unknown>[] }[] {
  const wb = XLSX.read(data, { type: 'array' })
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    if (!ws) return { name, rows: [] }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
    return { name, rows }
  })
}

export function parseCsvTextToJsonRows(csv: string): Record<string, unknown>[] {
  const wb = XLSX.read(csv, { type: 'string' })
  const first = wb.SheetNames[0]
  const ws = wb.Sheets[first]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
}

/** 從試算表複製貼上的 TSV，或逗號 CSV，轉成物件陣列（第一列為欄名） */
export function parseClipboardTableToJsonRows(text: string): Record<string, unknown>[] {
  const t = text.trim()
  if (!t) return []
  const firstLine = t.split(/\r?\n/)[0] ?? ''
  const delim = firstLine.includes('\t') ? '\t' : ','
  const wb = XLSX.read(t, { type: 'string', FS: delim })
  const first = wb.SheetNames[0]
  const ws = wb.Sheets[first]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
}

export function exportDaigouStateToXlsx(s: DaigouState, filename?: string) {
  const wb = XLSX.utils.book_new()
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

  const readme: (string | number)[][] = [
    ['HelpMeBuy Pro Heina shop 資料匯出'],
    ['匯出時間', new Date().toLocaleString('zh-TW')],
    [''],
    ['使用方式'],
    ['1. 用 Excel 直接開啟本檔，或上傳至 Google 雲端硬碟以試算表開啟。'],
    ['2. 編輯「商品匯入」工作表後，可於「試算表串聯」頁面上傳匯入。'],
    ['3. Google：建議在試算表內 檔案 → 下載 → Microsoft Excel，再由此頁上傳。'],
    ['4. 官方 CSV 下載連結需在同一瀏覽器已登入 Google 帳號。'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), '使用說明')

  const orderRows: (string | number)[][] = [
    ['查詢碼', '訂單ID', '客戶ID', '團ID', '訂單狀態', '付款狀態', '訂金', '尾款', '國內運', '國際運', '折扣', '包材', '其他費', '應付總額', '已收', '未收', '建立日'],
    ...s.orders.map((o) => [
      o.lookupCode,
      o.id,
      o.customerId,
      o.groupId,
      ORDER_STATUS_LABEL[o.orderStatus],
      PAYMENT_STATUS_LABEL[o.paymentStatus],
      o.deposit,
      o.balance,
      o.domesticShipping,
      o.internationalShipping,
      o.discount ?? 0,
      o.packagingFee ?? 0,
      o.otherFee ?? 0,
      o.totalAmount,
      o.totalReceived ?? 0,
      o.outstandingAmount ?? Math.max(0, o.totalAmount - (o.totalReceived ?? 0)),
      new Date(o.createdAt).toISOString(),
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(orderRows), '訂單')

  const custRows: (string | number)[][] = [
    ['客戶ID', '姓名', 'LINE顯示名', '末三碼', '風險分', '未結餘額', '取貨可靠度', '訂單數', '標籤', '備註'],
    ...s.customers.map((c) => [
      c.id,
      c.name,
      c.lineDisplayName,
      c.phoneLast3,
      c.riskScore,
      c.totalUnpaidBalance,
      c.pickupReliability,
      c.totalOrders,
      c.tags.join(','),
      c.notes,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(custRows), '客戶')

  const prodRows: (string | number)[][] = [
    ['商品名稱', '團ID', '分類', 'IP系列', '日幣', '台幣', '每人上限', '預購上限', '庫存', '已預購', '盲盒', '可開盒', '開盒費', '狀態', '商品編碼', '供應商', '購買連結', '內部備註'],
    ...s.products.map((p) => [
      p.name,
      p.groupId ?? '',
      p.category,
      p.ipSeries,
      p.jpyPrice,
      p.twdPrice,
      p.limitPerCustomer,
      p.preorderLimit ?? '',
      p.stockQty,
      p.preorderQty,
      p.isBlindBox ? '是' : '否',
      p.canOpenBlindBox ? '是' : '否',
      p.openingFee,
      p.status,
      p.productCode ?? '',
      p.supplier ?? '',
      p.purchaseUrl ?? '',
      p.internalNote ?? '',
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodRows), '商品')

  const tpl: (string | number)[][] = [
    ['商品名稱', '團ID', '分類', 'IP系列', '日幣', '台幣', '每人上限', '預購上限', '庫存', '已預購', '盲盒', '可開盒', '開盒費', '狀態', '商品編碼'],
    ['範例：徽章A', 'g1', '週邊', '咒術', 1100, 250, 5, 100, 0, 0, '否', '否', 0, 'available', 'SKU-0001'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tpl), '商品匯入')

  const txRows: (string | number)[][] = [
    ['分錄ID', '日期', '類型', '分類', '金額', '幣別', '團ID', '訂單ID', '客戶ID', '備註'],
    ...s.transactions.map((t) => [
      t.id,
      t.date,
      TRANSACTION_TYPE_LABEL[t.type],
      TRANSACTION_CATEGORY_LABEL[t.category],
      t.amount,
      t.currency,
      t.groupId ?? '',
      t.orderId ?? '',
      t.customerId ?? '',
      t.note,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txRows), '帳務')

  const grpRows: (string | number)[][] = [
    ['團ID', '團名', '狀態', '截團日', '匯率', '團JPY', '訂單編號', '封存'],
    ...s.groups.map((g) => [
      g.id,
      g.name,
      GROUP_STATUS_LABEL[g.status],
      g.closingDate,
      g.exchangeRate,
      g.jpyAmountTotal,
      g.orderNumber,
      g.archived ? '是' : '否',
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(grpRows), '團務')

  XLSX.writeFile(wb, filename ?? `helpmebuy-export-${ts}.xlsx`)
}

/** 多工作表 .xlsx 時優先選「登記／報名」工作表 */
export function pickSheetRowsForRegisterImport(sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const hit = sheets.find((s) => /登記|報名|名單|訂單(?!管理)/i.test(s.name))
  const rows = hit?.rows?.length ? hit.rows : sheets[0]?.rows ?? []
  return { sheetName: hit?.name ?? sheets[0]?.name ?? '', rows }
}

/** 與常見 Google 登記表欄位對齊的空白範本（下載後可貼到試算表） */
export function downloadRegisterSheetTemplateXlsx() {
  const wb = XLSX.utils.book_new()
  const headers: (string | number)[][] = [
    [
      '名字',
      '商品',
      '數量',
      '日幣單價',
      '匯率',
      '金額',
      '折碼',
      '公式',
      '調整',
      '總金額',
      '訂金',
      '尾款',
      '備註',
      '賣貨便',
      '運費或其他',
    ],
    ['吳沛忠', 'UX-09', 1, 3299, '', 900, '', '', '', 1490, '', '', '面交', '', 240],
    ['', 'CX-07', 1, 1999, '', 590, '', '', '', '', '', '', '', 'V', 190],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(headers), '登記表')
  const note: (string | number)[][] = [
    ['登記表匯入說明'],
    ['1. 同一客戶僅「第一列」填名字，以下續列商品時名字欄請留空。'],
    ['2. 「金額」為該列台幣小計；若留空，將用 日幣單價×數量×匯率（匯率空白則用設定頁預設）。'],
    ['3. 「總金額」可寫在該客戶最後一列；與品項加總不符時會提示，訂單仍以品項＋運費公式為主。'],
    ['4. 「賣貨便」欄填 V／是 等即標記；最右欄可填國內運費數字（無欄名亦可）。'],
    ['5. 於「試算表與 Excel 串聯」頁選團後上傳，系統會建立客戶（若尚無）與訂單。'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(note), '說明')
  XLSX.writeFile(wb, 'helpmebuy-登記表範本.xlsx')
}

export function downloadProductTemplateXlsx() {
  const wb = XLSX.utils.book_new()
  const tpl: (string | number)[][] = [
    ['商品名稱', '團ID', '分類', 'IP系列', '日幣', '台幣', '每人上限', '預購上限', '庫存', '已預購', '盲盒', '可開盒', '開盒費', '狀態', '商品編碼', '供應商', '購買連結'],
    ['範例：徽章A', 'g1', '週邊', '咒術', 1100, 250, 5, 100, 0, 0, '否', '否', 0, 'available', 'SKU-NEW'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tpl), '商品匯入')
  const note: (string | number)[][] = [
    ['欄位說明'],
    ['團ID', '請填現有團務 id，例如 g1、g2（可至團務頁複製）。'],
    ['狀態', '可用：draft, open_preorder, available, sold_out …（空白則 available）'],
    ['台幣', '可留空，將依下方預設匯率由日幣推算。'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(note), '說明')
  XLSX.writeFile(wb, 'helpmebuy-商品匯入範本.xlsx')
}
