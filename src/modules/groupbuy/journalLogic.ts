import * as XLSX from 'xlsx'
import type { BankJournalRow } from '../../api/types'

export const JOURNAL_XLSX_HEADER = ['日期', '金額', '備註', '後五碼', 'ID'] as const

export function newJournalId(prefix = 'j') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`
}

export function normalizeLastFive(raw: string | undefined): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length >= 5) return digits.slice(-5)
  return digits
}

export function formatLastFiveDisplay(raw: string | undefined): string {
  const d = normalizeLastFive(raw)
  return d ? `#${d}` : '—'
}

export function journalNoteForPayment(customerName: string, groupNames: string[]): string {
  const groups = [...new Set(groupNames.map((s) => String(s || '').trim()).filter(Boolean))].join('、')
  return [String(customerName || '').trim(), groups].filter(Boolean).join(' ')
}

export function displayJournalNote(row: Pick<BankJournalRow, 'note'>): string {
  let note = String(row.note || '').trim()
  note = note.replace(/\s*後五碼\s*\d{5}\s*$/u, '')
  note = note.replace(/\s*#\d{5}\s*$/u, '')
  return note.trim()
}

export function displayJournalLastFive(row: Pick<BankJournalRow, 'note' | 'lastFive'>): string {
  const stored = normalizeLastFive(row.lastFive)
  if (stored) return stored
  const note = String(row.note || '')
  const hash = note.match(/#(\d{5})/)
  if (hash) return hash[1]
  const label = note.match(/後五碼\s*(\d{5})/)
  return label?.[1] || ''
}

export function createPaymentJournalRow(params: {
  date: string
  amount: number
  customerName: string
  groupNames: string[]
  lastFive: string
  bank?: string
}): BankJournalRow {
  const lastFive = normalizeLastFive(params.lastFive)
  return {
    id: newJournalId('j_pr'),
    date: String(params.date || '').trim(),
    bank: params.bank || '待分類',
    type: '收入',
    amount: Math.max(0, Math.round(Number(params.amount) || 0)),
    category: '團購訂金',
    note: journalNoteForPayment(params.customerName, params.groupNames),
    lastFive,
  }
}

export function sortJournalNewest(rows: BankJournalRow[]): BankJournalRow[] {
  return [...rows].sort((a, b) => {
    const da = String(a.date || '')
    const db = String(b.date || '')
    if (da !== db) return db.localeCompare(da)
    return String(b.id).localeCompare(String(a.id))
  })
}

export function journalToXlsxBuffer(rows: BankJournalRow[]): Uint8Array {
  const body = sortJournalNewest(rows).map((row) => [
    row.date || '',
    Number(row.amount) || 0,
    displayJournalNote(row),
    formatLastFiveDisplay(displayJournalLastFive(row)),
    row.id || '',
  ])
  const aoa = [Array.from(JOURNAL_XLSX_HEADER), ...body]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '日記帳')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
}

function headerIndex(header: string[], aliases: string[]): number {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const cells = header.map(norm)
  for (const alias of aliases) {
    const i = cells.indexOf(norm(alias))
    if (i >= 0) return i
  }
  return -1
}

export function journalFromXlsxBuffer(buf: ArrayBuffer): BankJournalRow[] {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const aoa = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, raw: false })
  if (!aoa.length) return []
  const header = (aoa[0] || []).map((c) => String(c || ''))
  const iDate = headerIndex(header, ['日期', 'date'])
  const iAmount = headerIndex(header, ['金額', 'amount'])
  const iNote = headerIndex(header, ['備註', 'note'])
  const iFive = headerIndex(header, ['後五碼', 'lastfive', '#後五碼'])
  const iId = headerIndex(header, ['ID', 'id'])
  const iBank = headerIndex(header, ['銀行', 'bank'])
  const iType = headerIndex(header, ['類型', 'type'])
  const iCat = headerIndex(header, ['分類', 'category'])

  const out: BankJournalRow[] = []
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] || []
    const date = String(iDate >= 0 ? row[iDate] : row[0] || '').trim()
    const amount = Math.round(Number(String(iAmount >= 0 ? row[iAmount] : row[1] || '').replace(/,/g, '')) || 0)
    const note = String(iNote >= 0 ? row[iNote] : row[2] || '').trim()
    if (!date && !note && !amount) continue
    const lastFive = normalizeLastFive(String(iFive >= 0 ? row[iFive] : ''))
    out.push({
      id: String(iId >= 0 ? row[iId] : '').trim() || newJournalId('j_imp'),
      date,
      bank: String(iBank >= 0 ? row[iBank] : '待分類').trim() || '待分類',
      type: String(iType >= 0 ? row[iType] : '收入').trim() || '收入',
      amount,
      category: String(iCat >= 0 ? row[iCat] : '手動').trim() || '手動',
      note,
      lastFive,
    })
  }
  return out
}

export function mergeJournalById(existing: BankJournalRow[], incoming: BankJournalRow[]): BankJournalRow[] {
  const map = new Map(existing.map((r) => [r.id, r]))
  for (const row of incoming) {
    map.set(row.id, { ...map.get(row.id), ...row })
  }
  return sortJournalNewest([...map.values()])
}

export function upsertJournalRows(existing: BankJournalRow[], incoming: BankJournalRow[]): BankJournalRow[] {
  if (!incoming.length) return sortJournalNewest(existing)
  const map = new Map(existing.map((r) => [r.id, r]))
  const fresh: BankJournalRow[] = []
  for (const row of incoming) {
    if (!row?.id) continue
    if (map.has(row.id)) map.set(row.id, { ...map.get(row.id), ...row })
    else fresh.push(row)
  }
  return sortJournalNewest([...fresh, ...map.values()])
}

export function journalNoteWithLastFive(row: Pick<BankJournalRow, 'note' | 'lastFive'>): string {
  const five = normalizeLastFive(row.lastFive)
  let note = String(row.note || '').trim()
  if (five && !note.includes(`#${five}`) && !note.includes(`後五碼 ${five}`)) {
    note = note ? `${note} #${five}` : `#${five}`
  }
  return note
}

const JOURNAL_UNDO_KEY = 'heina.journal.undo.v1'
const JOURNAL_UNDO_MAX = 5

type JournalUndoSnap = { at: number; rows: BankJournalRow[] }

function readJournalUndo(): JournalUndoSnap[] {
  try {
    const raw = localStorage.getItem(JOURNAL_UNDO_KEY)
    const parsed = raw ? (JSON.parse(raw) as JournalUndoSnap[]) : []
    return Array.isArray(parsed) ? parsed.filter((s) => Array.isArray(s?.rows)) : []
  } catch {
    return []
  }
}

export function pushJournalUndo(rows: BankJournalRow[]) {
  const stack = readJournalUndo()
  stack.unshift({ at: Date.now(), rows: rows.map((r) => ({ ...r })) })
  localStorage.setItem(JOURNAL_UNDO_KEY, JSON.stringify(stack.slice(0, JOURNAL_UNDO_MAX)))
}

export function peekJournalUndo(): JournalUndoSnap | null {
  return readJournalUndo()[0] || null
}

export function popJournalUndo(): BankJournalRow[] | null {
  const stack = readJournalUndo()
  const first = stack.shift()
  localStorage.setItem(JOURNAL_UNDO_KEY, JSON.stringify(stack))
  return first ? first.rows : null
}
