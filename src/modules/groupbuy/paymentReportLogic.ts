import type {
  BankJournalRow,
  CustomerPaymentReport,
  CustomerPaymentReportLine,
  GroupBuyGroup,
  GroupBuyOrder,
  SubmitCustomerPaymentReportPayload,
} from '../../api/types'
import { calcItemsTotalTwd, calcOrderBalance, formatRemittancePaymentInfo, isV50CodPayment, normalizeGroupStatus, resolveV50Deposit } from './v50Utils'
import { normalizeCustomerNameKey } from './customerNameKey'

/** 付款回報應收訂金：未付款且訂金未填／0 時自動總額−20 */
export function orderReceivableDeposit(o: Pick<GroupBuyOrder, 'paymentStatus' | 'totalTwd' | 'deposit' | 'items'>): number {
  const total = Number(o.totalTwd) || calcItemsTotalTwd(o.items || [])
  return resolveV50Deposit(o.paymentStatus, total, o.deposit)
}

/**
 * 催款用：尚未付訂金的客人彙總。
 * 僅計「未付款」；排除已結束團務、貨到付款。
 */
export function summarizePendingDepositByCustomerFromGroups(
  groups: GroupBuyGroup[],
): { name: string; orderCount: number; depositTotal: number }[] {
  const map = new Map<string, { name: string; orderCount: number; depositTotal: number }>()
  for (const g of groups || []) {
    if (normalizeGroupStatus(g.status) === '已結束') continue
    for (const o of g.orders || []) {
      const pay = String(o.paymentStatus || '').trim()
      if (isV50CodPayment(pay)) continue
      if (pay !== '未付款') continue
      const due = orderReceivableDeposit(o)
      if (due <= 0) continue
      const name = String(o.customerName || '').trim() || '（未知客人）'
      const key = normalizeCustomerNameKey(name) || name.toLowerCase()
      const row = map.get(key) ?? { name, orderCount: 0, depositTotal: 0 }
      row.orderCount += 1
      row.depositTotal += due
      map.set(key, row)
    }
  }
  return [...map.values()].sort(
    (a, b) => b.depositTotal - a.depositTotal || a.name.localeCompare(b.name, 'zh-Hant'),
  )
}

export function findGroupBuyOrder(
  groups: GroupBuyGroup[] | undefined,
  orderId: string,
): GroupBuyOrder | undefined {
  for (const g of groups || []) {
    const found = (g.orders || []).find((o) => o.id === orderId)
    if (found) return found
  }
  return undefined
}

export function buildPaymentReportLines(
  groups: GroupBuyGroup[],
  orderIds: string[],
): CustomerPaymentReportLine[] {
  const lines: CustomerPaymentReportLine[] = []
  const wanted = new Set(orderIds)
  for (const g of groups) {
    for (const o of g.orders || []) {
      if (!wanted.has(o.id)) continue
      const deposit = orderReceivableDeposit(o)
      lines.push({
        orderId: o.id,
        groupId: g.id,
        groupName: g.name,
        lookupCode: o.id,
        deposit,
        expectedDeposit: deposit,
      })
    }
  }
  return lines
}

export function findPendingReportForOrders(
  reports: CustomerPaymentReport[],
  orderIds: string[],
): CustomerPaymentReport | undefined {
  const wanted = new Set(orderIds)
  return reports.find(
    (r) =>
      r.status === 'pending' &&
      r.orderIds.some((id) => wanted.has(id)),
  )
}

export function isV50OrderUnpaid(status: string): boolean {
  return !status || status === '未付款'
}

export function isV50OrderPaidLike(status: string): boolean {
  return status === '已付訂金' || status === '已結清' || status === '已付款' || status === '貨到付款'
}

/** 手動改回未付款或刪除關聯訂單時，移除含該訂單的付款回報（含已確認與日記帳） */
export function removePaymentReportsForOrder(
  bankJournal: BankJournalRow[],
  reports: CustomerPaymentReport[],
  orderId: string,
): { bankJournal: BankJournalRow[]; reports: CustomerPaymentReport[]; removedCount: number } {
  let nextJournal = bankJournal
  let nextReports = reports
  let removedCount = 0

  for (const report of reports) {
    if (!report.orderIds.includes(orderId)) continue
    if (report.status === 'confirmed') {
      const journal = findPaymentReportJournal(nextJournal, report)
      if (journal) nextJournal = nextJournal.filter((j) => j.id !== journal.id)
    }
    nextReports = nextReports.filter((r) => r.id !== report.id)
    removedCount += 1
  }

  return { bankJournal: nextJournal, reports: nextReports, removedCount }
}

export function removePendingPaymentReportsForOrder(
  reports: CustomerPaymentReport[],
  orderId: string,
): CustomerPaymentReport[] {
  return reports.filter((r) => r.status !== 'pending' || !r.orderIds.includes(orderId))
}

/** 團務管理手動變更支付狀態時，同步付款回報列表 */
export function syncPaymentReportsForOrderPaymentChange(
  bankJournal: BankJournalRow[],
  reports: CustomerPaymentReport[],
  orderId: string,
  previousStatus: string,
  nextStatus: string,
): {
  bankJournal: BankJournalRow[]
  reports: CustomerPaymentReport[]
  changed: boolean
  removedCount: number
} {
  const wasUnpaid = isV50OrderUnpaid(previousStatus)
  const nowUnpaid = isV50OrderUnpaid(nextStatus)
  const nowPaidLike = isV50OrderPaidLike(nextStatus)

  if (nowUnpaid && !wasUnpaid) {
    const removed = removePaymentReportsForOrder(bankJournal, reports, orderId)
    return {
      bankJournal: removed.bankJournal,
      reports: removed.reports,
      changed: removed.removedCount > 0,
      removedCount: removed.removedCount,
    }
  }

  if (nowPaidLike && wasUnpaid) {
    const nextReports = removePendingPaymentReportsForOrder(reports, orderId)
    const removedCount = reports.length - nextReports.length
    return {
      bankJournal,
      reports: nextReports,
      changed: removedCount > 0,
      removedCount,
    }
  }

  return { bankJournal, reports, changed: false, removedCount: 0 }
}

export function validateSubmitPaymentReport(
  groups: GroupBuyGroup[],
  reports: CustomerPaymentReport[],
  payload: SubmitCustomerPaymentReportPayload,
): { ok: true; lines: CustomerPaymentReportLine[] } | { ok: false; message: string } {
  const customerName = String(payload.customerName || '').trim()
  const remittanceDate = String(payload.remittanceDate || '').trim()
  const lastFive = String(payload.lastFive || '').trim()
  const totalAmount = Math.round(Number(payload.totalAmount) || 0)
  const orderIds = (payload.orderIds || []).filter(Boolean)

  if (!customerName) return { ok: false, message: '請先查詢訂單' }
  if (!remittanceDate) return { ok: false, message: '請填寫匯款日期' }
  if (!/^\d{5}$/.test(lastFive)) return { ok: false, message: '後五碼需為 5 位數字' }
  if (totalAmount <= 0) return { ok: false, message: '請填寫匯款總金額' }
  if (orderIds.length === 0) return { ok: false, message: '請至少勾選一筆待付訂單' }

  const lines = buildPaymentReportLines(groups, orderIds)
  if (lines.length !== orderIds.length) {
    return { ok: false, message: '部分訂單不存在或已變更，請重新查詢' }
  }

  for (const line of lines) {
    const g = groups.find((x) => x.id === line.groupId)
    const o = g?.orders?.find((x) => x.id === line.orderId)
    if (!o) return { ok: false, message: '訂單資料有誤，請重新查詢' }
    if (String(o.customerName || '').trim() !== customerName) {
      return { ok: false, message: '訂單與查詢名稱不符' }
    }
    if (o.paymentStatus !== '未付款') {
      return { ok: false, message: `訂單 ${line.lookupCode} 已不是待付款狀態` }
    }
  }

  const dup = findPendingReportForOrders(reports, orderIds)
  if (dup) {
    return { ok: false, message: '已有待確認的付款回報，請等待團主核對' }
  }

  const staleConfirmed = reports.find(
    (r) => r.status === 'confirmed' && r.orderIds.some((id) => orderIds.includes(id)),
  )
  if (staleConfirmed) {
    return {
      ok: false,
      message: '此訂單仍有已確認的付款回報紀錄，請至付款回報刪除或返回待確認後再送出',
    }
  }

  return { ok: true, lines }
}

export function resolvePaymentReportLineDeposit(
  orderId: string,
  fallback: number,
  lineDeposits?: Record<string, number>,
): number {
  if (lineDeposits && lineDeposits[orderId] != null) {
    return Math.max(0, Math.round(Number(lineDeposits[orderId]) || 0))
  }
  return Math.max(0, Math.round(Number(fallback) || 0))
}

export function formatPaymentReportCopyDate(isoDate: string): string {
  const parts = String(isoDate || '').trim().split('-')
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`
  return String(isoDate || '').trim()
}

export function lineExpectedDeposit(
  line: CustomerPaymentReportLine,
  liveOrder?: Pick<GroupBuyOrder, 'paymentStatus' | 'totalTwd' | 'deposit' | 'items'>,
): number {
  if (liveOrder) return Math.max(0, Math.round(orderReceivableDeposit(liveOrder)))
  const stored = Number(line.expectedDeposit ?? line.deposit) || 0
  if (stored > 0) return Math.max(0, Math.round(stored))
  return 0
}

/** 付款回報複製文字：日期 + 團務訂金 + 團務名 + #後五碼，每團一行 */
export function buildPaymentReportCopyText(
  remittanceDate: string,
  lastFive: string,
  lines: CustomerPaymentReportLine[],
  lineDeposits?: Record<string, number>,
  selectedOrderIds?: Set<string>,
): string {
  const groupRows = new Map<string, { groupName: string; deposit: number }>()
  for (const line of lines) {
    if (selectedOrderIds && !selectedOrderIds.has(line.orderId)) continue
    const dep = resolvePaymentReportLineDeposit(line.orderId, line.deposit, lineDeposits)
    const existing = groupRows.get(line.groupId)
    if (existing) {
      existing.deposit += dep
    } else {
      groupRows.set(line.groupId, { groupName: line.groupName, deposit: dep })
    }
  }
  const date = formatPaymentReportCopyDate(remittanceDate)
  const note = String(lastFive || '').trim()
  return [...groupRows.values()]
    .map((g) => `${date} ${g.deposit} ${g.groupName} #${note}`)
    .join('\n')
}

export function sumPaymentReportDeposits(
  lines: CustomerPaymentReportLine[],
  lineDeposits?: Record<string, number>,
  selectedOrderIds?: Set<string>,
): number {
  return lines.reduce((sum, line) => {
    if (selectedOrderIds && !selectedOrderIds.has(line.orderId)) return sum
    return sum + resolvePaymentReportLineDeposit(line.orderId, line.deposit, lineDeposits)
  }, 0)
}

export function deletePaymentReport(
  reports: CustomerPaymentReport[],
  reportId: string,
): CustomerPaymentReport[] {
  return reports.filter((r) => r.id !== reportId)
}

function findPaymentReportJournal(
  bankJournal: BankJournalRow[],
  report: CustomerPaymentReport,
): BankJournalRow | undefined {
  if (report.journalEntryId) {
    return bankJournal.find((j) => j.id === report.journalEntryId)
  }
  const noteNeedle = `${report.customerName} 付款回報`
  return bankJournal.find(
    (j) =>
      j.category === '團購訂金' &&
      String(j.note || '').includes(noteNeedle) &&
      String(j.note || '').includes(report.lastFive) &&
      Number(j.amount) === Number(report.totalAmount),
  )
}

export function applyRevertPaymentReport(
  groups: GroupBuyGroup[],
  bankJournal: BankJournalRow[],
  report: CustomerPaymentReport,
): { groups: GroupBuyGroup[]; bankJournal: BankJournalRow[]; report: CustomerPaymentReport } {
  const journal = findPaymentReportJournal(bankJournal, report)
  const nextJournal = journal ? bankJournal.filter((j) => j.id !== journal.id) : bankJournal
  const targetIds = new Set(report.orderIds)
  const expectedByOrder = new Map(
    report.lines.map((line) => [line.orderId, lineExpectedDeposit(line)]),
  )

  const nextGroups = groups.map((g) => ({
    ...g,
    orders: (g.orders || []).map((o) => {
      if (!targetIds.has(o.id)) return o
      const deposit = expectedByOrder.get(o.id) ?? (Number(o.deposit) || 0)
      return {
        ...o,
        paymentStatus: '未付款',
        deposit,
        balance: calcOrderBalance(o.totalTwd, deposit, o.domesticShip, o.intlShip),
        paymentInfo: '',
      }
    }),
  }))

  const nextLines = report.lines.map((line) => ({
    ...line,
    deposit: lineExpectedDeposit(line),
  }))

  const nextReport: CustomerPaymentReport = {
    ...report,
    lines: nextLines,
    totalAmount: report.reportedTotalAmount ?? report.totalAmount,
    status: 'pending',
    confirmedAt: undefined,
    confirmedBank: undefined,
    journalEntryId: undefined,
  }

  return { groups: nextGroups, bankJournal: nextJournal, report: nextReport }
}

export function applyDeletePaymentReport(
  groups: GroupBuyGroup[],
  bankJournal: BankJournalRow[],
  reports: CustomerPaymentReport[],
  reportId: string,
): {
  ok: boolean
  message?: string
  groups?: GroupBuyGroup[]
  bankJournal?: BankJournalRow[]
  reports?: CustomerPaymentReport[]
} {
  const report = reports.find((r) => r.id === reportId)
  if (!report) return { ok: false, message: '找不到付款回報' }

  let nextGroups = groups
  let nextJournal = bankJournal
  if (report.status === 'confirmed') {
    const reverted = applyRevertPaymentReport(groups, bankJournal, report)
    nextGroups = reverted.groups
    nextJournal = reverted.bankJournal
  }

  return {
    ok: true,
    groups: nextGroups,
    bankJournal: nextJournal,
    reports: deletePaymentReport(reports, reportId),
  }
}

export function createPaymentReport(
  payload: SubmitCustomerPaymentReportPayload,
  lines: CustomerPaymentReportLine[],
): CustomerPaymentReport {
  const balanceMemos = (payload.balanceMemos || [])
    .filter((m) => m?.id)
    .map((m) => ({
      id: String(m.id),
      amountTwd: Math.round(Number(m.amountTwd) || 0),
    }))
  return {
    id: `pr_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    customerName: String(payload.customerName).trim(),
    remittanceDate: String(payload.remittanceDate).trim(),
    lastFive: String(payload.lastFive).trim(),
    totalAmount: Math.round(Number(payload.totalAmount) || 0),
    reportedTotalAmount: Math.round(Number(payload.totalAmount) || 0),
    orderIds: [...payload.orderIds],
    lines,
    status: 'pending',
    submittedAt: Date.now(),
    ...(balanceMemos.length ? { balanceMemos } : {}),
  }
}

export function applyConfirmPaymentReport(
  groups: GroupBuyGroup[],
  bankJournal: BankJournalRow[],
  report: CustomerPaymentReport,
  remittanceBank: string,
  lineDeposits?: Record<string, number>,
  selectedOrderIds?: string[],
): {
  groups: GroupBuyGroup[]
  bankJournal: BankJournalRow[]
  report: CustomerPaymentReport
  pendingFollowUp?: CustomerPaymentReport
} {
  const selected =
    selectedOrderIds && selectedOrderIds.length > 0
      ? new Set(selectedOrderIds)
      : new Set(report.orderIds)
  const confirmedLines = report.lines.filter((line) => selected.has(line.orderId))
  if (confirmedLines.length === 0) {
    throw new Error('請至少勾選一筆團務')
  }

  const paymentInfo = formatRemittancePaymentInfo(
    report.remittanceDate,
    remittanceBank || '待分類',
    report.lastFive,
  )
  let totalIn = 0

  const nextGroups = groups.map((g) => ({
    ...g,
    orders: (g.orders || []).map((o) => {
      if (!selected.has(o.id)) return o
      const deposit = resolvePaymentReportLineDeposit(o.id, orderReceivableDeposit(o), lineDeposits)
      totalIn += deposit
      return {
        ...o,
        paymentStatus: '已付訂金',
        deposit,
        balance: calcOrderBalance(o.totalTwd, deposit, o.domesticShip, o.intlShip),
        paymentInfo,
      }
    }),
  }))

  const journalRow: BankJournalRow = {
    id: `j_pr_${Date.now()}`,
    date: report.remittanceDate,
    bank: remittanceBank || '待分類',
    type: '收入',
    amount: totalIn,
    category: '團購訂金',
    note: `${report.customerName} 付款回報 ${confirmedLines.length} 筆 · 後五碼 ${report.lastFive}`,
  }

  const nextLines = confirmedLines.map((line) => ({
    ...line,
    expectedDeposit: line.expectedDeposit ?? line.deposit,
    deposit: resolvePaymentReportLineDeposit(line.orderId, line.deposit, lineDeposits),
    needsSupplement:
      resolvePaymentReportLineDeposit(line.orderId, line.deposit, lineDeposits) <
      lineExpectedDeposit(line),
  }))

  const nextReport: CustomerPaymentReport = {
    ...report,
    orderIds: confirmedLines.map((l) => l.orderId),
    lines: nextLines,
    reportedTotalAmount: report.reportedTotalAmount ?? report.totalAmount,
    totalAmount: totalIn,
    status: 'confirmed',
    confirmedAt: Date.now(),
    confirmedBank: remittanceBank || '待分類',
    journalEntryId: journalRow.id,
    source: report.source ?? 'customer',
  }

  const unselectedLines = report.lines.filter((line) => !selected.has(line.orderId))
  let pendingFollowUp: CustomerPaymentReport | undefined
  if (unselectedLines.length > 0) {
    const unselectedIds = unselectedLines.map((l) => l.orderId)
    pendingFollowUp = {
      id: `pr_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      customerName: report.customerName,
      remittanceDate: report.remittanceDate,
      lastFive: report.lastFive,
      totalAmount: unselectedLines.reduce((s, l) => s + lineExpectedDeposit(l), 0),
      reportedTotalAmount: report.reportedTotalAmount ?? report.totalAmount,
      orderIds: unselectedIds,
      lines: unselectedLines.map((line) => ({
        ...line,
        deposit: lineExpectedDeposit(line),
        expectedDeposit: lineExpectedDeposit(line),
      })),
      status: 'pending',
      submittedAt: report.submittedAt,
      source: 'customer',
    }
  }

  return {
    groups: nextGroups,
    bankJournal: [journalRow, ...bankJournal],
    report: nextReport,
    pendingFollowUp,
  }
}

export function createAdminReviewPaymentReport(
  groups: GroupBuyGroup[],
  params: {
    customerName: string
    orderIds: string[]
    remittanceDate: string
    remittanceBank: string
    lastFive: string
    totalAmount: number
    journalEntryId: string
  },
): CustomerPaymentReport {
  const lines = buildPaymentReportLines(groups, params.orderIds).map((line) => {
    const g = groups.find((x) => x.id === line.groupId)
    const o = g?.orders?.find((x) => x.id === line.orderId)
    const deposit = o ? orderReceivableDeposit(o) : line.deposit
    const expected = lineExpectedDeposit({ ...line, expectedDeposit: deposit, deposit }, o)
    return {
      ...line,
      deposit,
      expectedDeposit: expected,
      needsSupplement: deposit < expected,
      supplementTotal: 0,
    }
  })

  return {
    id: `pr_ar_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    customerName: params.customerName.trim(),
    remittanceDate: params.remittanceDate,
    lastFive: params.lastFive || '—',
    totalAmount: params.totalAmount,
    reportedTotalAmount: params.totalAmount,
    orderIds: [...params.orderIds],
    lines,
    status: 'confirmed',
    submittedAt: Date.now(),
    confirmedAt: Date.now(),
    confirmedBank: params.remittanceBank || '待分類',
    journalEntryId: params.journalEntryId,
    source: 'admin_review',
  }
}

export function applyUpdatePaymentReportLineFlags(
  reports: CustomerPaymentReport[],
  reportId: string,
  orderId: string,
  needsSupplement: boolean,
): CustomerPaymentReport[] {
  return reports.map((report) => {
    if (report.id !== reportId) return report
    return {
      ...report,
      lines: report.lines.map((line) =>
        line.orderId === orderId ? { ...line, needsSupplement } : line,
      ),
    }
  })
}

export function applySupplementPaymentReport(
  groups: GroupBuyGroup[],
  bankJournal: BankJournalRow[],
  reports: CustomerPaymentReport[],
  reportId: string,
  orderId: string,
  amount: number,
  remittanceDate: string,
  remittanceBank: string,
  note?: string,
): {
  ok: boolean
  message?: string
  groups?: GroupBuyGroup[]
  bankJournal?: BankJournalRow[]
  reports?: CustomerPaymentReport[]
} {
  const addAmount = Math.max(0, Math.round(Number(amount) || 0))
  if (addAmount <= 0) return { ok: false, message: '補款金額需大於 0' }

  const reportIdx = reports.findIndex((r) => r.id === reportId && r.status === 'confirmed')
  if (reportIdx < 0) return { ok: false, message: '找不到已確認的付款回報' }

  const report = reports[reportIdx]
  const line = report.lines.find((l) => l.orderId === orderId)
  if (!line) return { ok: false, message: '找不到訂單' }
  if (!line.needsSupplement) return { ok: false, message: '此筆未標記需補款' }

  const supplementInfo = formatRemittancePaymentInfo(
    remittanceDate,
    remittanceBank || '待分類',
    note?.trim() || `補款${addAmount}`,
  )

  let nextGroups = groups.map((g) => ({
    ...g,
    orders: (g.orders || []).map((o) => {
      if (o.id !== orderId) return o
      const newDeposit = (Number(o.deposit) || 0) + addAmount
      const paymentInfo = [o.paymentInfo, supplementInfo].filter(Boolean).join(' · ')
      return {
        ...o,
        paymentStatus: '已付訂金',
        deposit: newDeposit,
        balance: calcOrderBalance(o.totalTwd, newDeposit, o.domesticShip, o.intlShip),
        paymentInfo,
      }
    }),
  }))

  const journalRow: BankJournalRow = {
    id: `j_sup_${Date.now()}`,
    date: remittanceDate,
    bank: remittanceBank || '待分類',
    type: '收入',
    amount: addAmount,
    category: '團購訂金',
    note: `${report.customerName} 補款 ${line.groupName} · ${note?.trim() || '補款'}`,
  }

  const updatedLine = {
    ...line,
    deposit: line.deposit + addAmount,
    supplementTotal: (line.supplementTotal || 0) + addAmount,
    needsSupplement: line.deposit + addAmount < lineExpectedDeposit(line),
  }

  const nextReport: CustomerPaymentReport = {
    ...report,
    totalAmount: report.totalAmount + addAmount,
    lines: report.lines.map((l) => (l.orderId === orderId ? updatedLine : l)),
  }

  const nextReports = reports.map((r, i) => (i === reportIdx ? nextReport : r))

  return {
    ok: true,
    groups: nextGroups,
    bankJournal: [journalRow, ...bankJournal],
    reports: nextReports,
  }
}
