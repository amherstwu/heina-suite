import * as XLSX from 'xlsx'
import type { CustomerPaymentReport, GroupBuyGroup, GroupBuyOrder } from '../../api/types'
import type { Customer } from '../../daigou/types'
import { normalizeLookupPin, isValidLookupPin } from '../../daigou/portalLookupAuth'
import { calcItemsTotalTwd } from './v50Utils'

function itemsSummary(items: GroupBuyOrder['items']): string {
  return (items || [])
    .map((it) => `${it.name}×${it.qty}`)
    .join('、')
}

export function exportAllV50OrdersXlsx(
  groups: GroupBuyGroup[],
  filename?: string,
) {
  const wb = XLSX.utils.book_new()
  const headers = [
    '團務名稱',
    '訂單ID',
    '客戶名字',
    '商品摘要',
    '總台幣',
    '訂金',
    '尾款',
    '國內運費',
    '國際運費',
    '付款狀態',
    '付款備註',
  ]
  const rows: (string | number)[][] = [headers]
  for (const g of groups) {
    for (const o of g.orders || []) {
      rows.push([
        g.name,
        o.id,
        o.customerName,
        itemsSummary(o.items),
        o.totalTwd || calcItemsTotalTwd(o.items || []),
        o.deposit,
        o.balance,
        o.domesticShip,
        o.intlShip,
        o.paymentStatus,
        o.paymentInfo,
      ])
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '客單管理')
  const ts = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, filename ?? `客單管理-${ts}.xlsx`)
}

export type PaymentReportExportRange = {
  /** YYYY-MM-DD，含當日（依確認日；無確認日則用匯款日） */
  from?: string
  /** YYYY-MM-DD，含當日 */
  to?: string
}

function toDateKeyFromTs(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function paymentReportRangeKey(r: CustomerPaymentReport): string {
  const fromConfirmed = toDateKeyFromTs(r.confirmedAt)
  if (fromConfirmed) return fromConfirmed
  const remittance = String(r.remittanceDate || '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(remittance)) return remittance.slice(0, 10)
  return toDateKeyFromTs(r.submittedAt)
}

export function filterConfirmedPaymentReportsByRange(
  reports: CustomerPaymentReport[],
  range?: PaymentReportExportRange,
): CustomerPaymentReport[] {
  const confirmed = reports.filter((r) => r.status === 'confirmed')
  const from = range?.from?.trim() || ''
  const to = range?.to?.trim() || ''
  if (!from && !to) return confirmed
  return confirmed.filter((r) => {
    const key = paymentReportRangeKey(r)
    if (!key) return false
    if (from && key < from) return false
    if (to && key > to) return false
    return true
  })
}

export function exportConfirmedPaymentReportsXlsx(
  reports: CustomerPaymentReport[],
  filename?: string,
  range?: PaymentReportExportRange,
) {
  const confirmed = filterConfirmedPaymentReportsByRange(reports, range)
  const wb = XLSX.utils.book_new()
  const headers = [
    '回報ID',
    '客戶名字',
    '匯款日',
    '末五碼',
    '匯款金額',
    '確認銀行',
    '確認時間',
    '訂單ID',
    '團務名稱',
    '訂金',
    '需補款',
    '補款累計',
  ]
  const rows: (string | number)[][] = [headers]
  for (const r of confirmed) {
    const confirmedAt = r.confirmedAt
      ? new Date(r.confirmedAt).toLocaleString('zh-TW')
      : ''
    for (const line of r.lines || []) {
      rows.push([
        r.id,
        r.customerName,
        r.remittanceDate,
        r.lastFive,
        r.totalAmount,
        r.confirmedBank ?? '',
        confirmedAt,
        line.orderId,
        line.groupName,
        line.deposit,
        line.needsSupplement ? '是' : '否',
        line.supplementTotal ?? 0,
      ])
    }
    if (!r.lines?.length) {
      rows.push([
        r.id,
        r.customerName,
        r.remittanceDate,
        r.lastFive,
        r.totalAmount,
        r.confirmedBank ?? '',
        confirmedAt,
        '',
        '',
        '',
        '',
        '',
      ])
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '付款回報已確認')
  const ts = new Date().toISOString().slice(0, 10)
  const rangeTag =
    range?.from || range?.to
      ? `_${range?.from || '起'}_${range?.to || '迄'}`
      : ''
  XLSX.writeFile(wb, filename ?? `付款回報已確認${rangeTag}-${ts}.xlsx`)
  return { exported: confirmed.length }
}

const CUSTOMER_EXPORT_HEADERS = [
  '客戶ID',
  '姓名',
  'LINE顯示名',
  '手機末三碼',
  '社群帳號',
  '查單密碼',
  '備註',
  '對客備註',
] as const

export function exportCustomersXlsx(customers: Customer[], filename?: string) {
  const wb = XLSX.utils.book_new()
  const rows: (string | number)[][] = [
    [...CUSTOMER_EXPORT_HEADERS],
    ...customers.map((c) => [
      c.id,
      c.name,
      c.lineDisplayName,
      c.phoneLast3,
      c.socialAccount,
      c.lookupPin ?? '',
      c.notes,
      c.customerNote ?? '',
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '客人列表')
  const ts = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, filename ?? `客人列表-${ts}.xlsx`)
}

export function downloadCustomerImportTemplateXlsx() {
  const wb = XLSX.utils.book_new()
  const rows: (string | number)[][] = [
    [...CUSTOMER_EXPORT_HEADERS],
    ['', '範例客人', 'LINE_範例', '123', '@line_id', '1234', '內部備註可選', '對客備註可選'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '客人列表')
  const note: (string | number)[][] = [
    ['匯入說明'],
    ['1. 有客戶ID則更新該客戶；無ID則以姓名比對，否則新增。'],
    ['2. 僅更新：姓名、LINE顯示名、手機末三碼、社群帳號、查單密碼、備註、對客備註。'],
    ['3. 查單密碼須為 4 位數字，同步至訂單自助查詢。'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(note), '說明')
  XLSX.writeFile(wb, '客人列表匯入範本.xlsx')
}

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

export type CustomerImportResult = {
  added: number
  updated: number
  skipped: number
  warnings: string[]
}

export function parseCustomerImportWorkbook(ab: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(ab, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
}

export function applyCustomerImportRows(
  rows: Record<string, unknown>[],
  existing: Customer[],
  newId: () => string,
): { customers: Customer[]; result: CustomerImportResult } {
  const warnings: string[] = []
  let added = 0
  let updated = 0
  let skipped = 0
  const list = [...existing]
  const byId = new Map(list.map((c) => [c.id, c]))
  const byName = new Map<string, Customer[]>()
  for (const c of list) {
    const key = norm(c.name)
    const arr = byName.get(key) ?? []
    arr.push(c)
    byName.set(key, arr)
  }

  let start = 0
  if (rows.length && pick(rows[0], '客戶ID', '姓名') === '客戶ID') start = 1

  for (let i = start; i < rows.length; i++) {
    const row = rows[i]
    const id = pick(row, '客戶ID', 'id', 'customerId')
    const name = pick(row, '姓名', '名字', 'name')
    const lineDisplayName = pick(row, 'LINE顯示名', 'LINE', 'lineDisplayName')
    const phoneLast3 = pick(row, '手機末三碼', 'phoneLast3')
    const socialAccount = pick(row, '社群帳號', 'socialAccount')
    const lookupPinRaw = pick(row, '查單密碼', 'lookupPin', '查單PIN')
    const notes = pick(row, '備註', 'notes')
    const customerNote = pick(row, '對客備註', 'customerNote')

    if (!name && !id) {
      skipped += 1
      continue
    }

    let hit: Customer | undefined
    if (id && byId.has(id)) hit = byId.get(id)
    else if (name) {
      const hits = byName.get(norm(name))
      if (hits?.length === 1) hit = hits[0]
      else if (hits && hits.length > 1) {
        warnings.push(`「${name}」有多筆客戶，請填客戶ID`)
        skipped += 1
        continue
      }
    }

    if (hit) {
      const patch: Partial<Customer> = {}
      if (name) patch.name = name
      if (lineDisplayName) patch.lineDisplayName = lineDisplayName
      if (phoneLast3) patch.phoneLast3 = phoneLast3
      if (socialAccount) patch.socialAccount = socialAccount
      if (lookupPinRaw) {
        const pin = normalizeLookupPin(lookupPinRaw)
        if (isValidLookupPin(pin)) patch.lookupPin = pin
        else warnings.push(`第 ${i + 1} 列：查單密碼須為 4 位數字，已略過`)
      }
      if (notes) patch.notes = notes
      if (customerNote) patch.customerNote = customerNote
      const idx = list.findIndex((c) => c.id === hit!.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch }
        updated += 1
      }
    } else if (name) {
      const nc: Customer = {
        id: id || newId(),
        name,
        lineDisplayName: lineDisplayName || name,
        phoneLast3: phoneLast3 || '000',
        socialAccount: socialAccount || '',
        tags: ['new_customer'],
        riskScore: 20,
        pickupReliability: 80,
        totalOrders: 0,
        totalUnpaidBalance: 0,
        notes: notes || 'Excel匯入',
        customerNote: customerNote || undefined,
      }
      if (lookupPinRaw) {
        const pin = normalizeLookupPin(lookupPinRaw)
        if (isValidLookupPin(pin)) nc.lookupPin = pin
      }
      list.unshift(nc)
      byId.set(nc.id, nc)
      const key = norm(nc.name)
      const arr = byName.get(key) ?? []
      arr.push(nc)
      byName.set(key, arr)
      added += 1
    } else {
      skipped += 1
    }
  }

  return {
    customers: list,
    result: { added, updated, skipped, warnings },
  }
}
