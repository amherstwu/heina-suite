import type { CustomerPaymentReport } from '../../api/types'

export type PaymentReportSortMode =
  | 'time_desc'
  | 'time_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'remittance_desc'
  | 'remittance_asc'
  | 'name_asc'
  | 'name_desc'

export type PaymentReportSourceFilter = '' | 'customer' | 'admin_review'

export function paymentReportMatchesQuery(report: CustomerPaymentReport, query: string): boolean {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return true
  if (String(report.customerName || '').toLowerCase().includes(needle)) return true
  if (String(report.lastFive || '').includes(needle)) return true
  if (String(report.remittanceDate || '').includes(needle)) return true
  if (String(report.confirmedBank || '').toLowerCase().includes(needle)) return true
  for (const line of report.lines || []) {
    if (String(line.groupName || '').toLowerCase().includes(needle)) return true
    if (String(line.lookupCode || '').toLowerCase().includes(needle)) return true
    if (String(line.orderId || '').toLowerCase().includes(needle)) return true
  }
  return false
}

export function sortPaymentReports(
  reports: CustomerPaymentReport[],
  mode: PaymentReportSortMode,
  tab: 'pending' | 'confirmed',
): CustomerPaymentReport[] {
  const arr = [...reports]
  const timeOf = (r: CustomerPaymentReport) =>
    tab === 'pending' ? r.submittedAt : (r.confirmedAt ?? r.submittedAt)

  switch (mode) {
    case 'time_asc':
      return arr.sort((a, b) => timeOf(a) - timeOf(b))
    case 'amount_desc':
      return arr.sort((a, b) => b.totalAmount - a.totalAmount)
    case 'amount_asc':
      return arr.sort((a, b) => a.totalAmount - b.totalAmount)
    case 'remittance_desc':
      return arr.sort((a, b) => String(b.remittanceDate).localeCompare(String(a.remittanceDate)))
    case 'remittance_asc':
      return arr.sort((a, b) => String(a.remittanceDate).localeCompare(String(b.remittanceDate)))
    case 'name_asc':
      return arr.sort((a, b) => a.customerName.localeCompare(b.customerName, 'zh-Hant'))
    case 'name_desc':
      return arr.sort((a, b) => b.customerName.localeCompare(a.customerName, 'zh-Hant'))
    default:
      return arr.sort((a, b) => timeOf(b) - timeOf(a))
  }
}

export function collectPaymentReportGroups(
  reports: CustomerPaymentReport[],
): { id: string; name: string }[] {
  const map = new Map<string, string>()
  for (const report of reports) {
    for (const line of report.lines || []) {
      if (line.groupId && line.groupName) map.set(line.groupId, line.groupName)
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
}
