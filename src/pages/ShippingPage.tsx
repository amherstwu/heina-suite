import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search, Trash2, Truck } from 'lucide-react'
import { Card, Btn, PageHeader, Chip, Empty } from '../components/ui'
import { BalanceMemoCollapsible } from '../components/customers/CustomerBalanceMemoPanel'
import { CustomerNoteField } from '../components/customers/CustomerNoteField'
import { useDaigouStore } from '../daigou/store'
import type { Customer, Group, Order, Shipment } from '../daigou/types'
import { downloadCsv } from '../daigou/csv'
import { getPaymentStatusLabel, getPaymentStatusBadgeVariant } from '../daigou/statusDisplay'
import { reconcileShippingQueueFromDaigou } from '../modules/groupbuy/v50DaigouSync'
import { isV50GroupReadyToShip } from '../modules/groupbuy/v50Utils'
import { useLiveStore } from '../modules/live/liveStore'
import {
  adjustedBalanceDue,
  formatMemoAmount,
  memoAdjustAmount,
  openBalanceMemos,
  sumOpenMemoAdjust,
} from '../daigou/customerBalanceMemo'
import '../modules/groupbuy/groupbuy.css'

type ShipmentRow = {
  sh: Shipment
  o: Order
  c: Customer | undefined
  g: Group | undefined
}

function buildRow(
  sh: Shipment,
  orders: Order[],
  customers: Customer[],
  groups: Group[],
): ShipmentRow | null {
  const o = orders.find((x) => x.id === sh.orderId)
  if (!o) return null
  const c = customers.find((x) => x.id === o.customerId)
  const g = groups.find((x) => x.id === o.groupId)
  return { sh, o, c, g }
}

type StatusFilter = 'all' | 'pending' | 'shipped'

type CustomerShipmentGroup = {
  name: string
  customerId: string
  lineName: string
  phoneLast3: string
  rows: ShipmentRow[]
}

function maskPhoneLast3(last3: string) {
  const t = (last3 || '').trim()
  if (!t) return '—'
  return `•••${t}`
}

function isRowShipped(sh: Shipment, o: Order): boolean {
  return (
    o.orderStatus === 'completed' ||
    o.orderStatus === 'shipped' ||
    sh.status === 'shipped' ||
    sh.status === 'delivered'
  )
}

function isRowPending(sh: Shipment, o: Order): boolean {
  if (o.orderStatus === 'cancelled') return false
  return !isRowShipped(sh, o)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function orderItemCount(order: Order): number {
  return (order.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
}

function pendingBalanceTotal(rows: ShipmentRow[]) {
  return rows
    .filter(({ sh, o }) => isRowPending(sh, o))
    .reduce((sum, { o }) => sum + Math.max(0, Number(o.balance) || 0), 0)
}

export function ShippingPage() {
  const shipments = useDaigouStore((s) => s.shipments)
  const orders = useDaigouStore((s) => s.orders)
  const customers = useDaigouStore((s) => s.customers)
  const groups = useDaigouStore((s) => s.groups)
  const batchShipShipped = useDaigouStore((s) => s.batchShipShipped)
  const revertShipmentToPending = useDaigouStore((s) => s.revertShipmentToPending)
  const deleteShipments = useDaigouStore((s) => s.deleteShipments)
  const settleCustomerBalanceMemos = useDaigouStore((s) => s.settleCustomerBalanceMemos)
  const updateCustomer = useDaigouStore((s) => s.updateCustomer)
  const addToast = useDaigouStore((s) => s.addToast)
  const clearLiveSyncedOrderIds = useLiveStore((s) => s.clearSyncedOrderIds)

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [customerShipDates, setCustomerShipDates] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<Record<string, boolean>>({})
  /** 出貨時不抵銷的帳務備註（預設全選抵銷） */
  const [excludedMemoIds, setExcludedMemoIds] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    reconcileShippingQueueFromDaigou()
  }, [])

  const allRows = useMemo(() => {
    return shipments
      .map((sh) => buildRow(sh, orders, customers, groups))
      .filter((row): row is ShipmentRow => {
        if (!row) return false
        const { o, g } = row
        if (o.orderStatus === 'cancelled') return false
        return isV50GroupReadyToShip(g?.internalNotes)
      })
  }, [shipments, orders, customers, groups])

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return allRows.filter(({ sh, o, c, g }) => {
      if (statusFilter === 'pending' && !isRowPending(sh, o)) return false
      if (statusFilter === 'shipped' && !isRowShipped(sh, o)) return false
      if (!needle) return true
      const hay = [
        c?.name,
        c?.lineDisplayName,
        o.lookupCode,
        g?.name,
        sh.carrier,
        sh.trackingNo,
        sh.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [allRows, q, statusFilter])

  const customerGroups = useMemo(() => {
    const map = new Map<string, CustomerShipmentGroup>()
    for (const row of filteredRows) {
      const name = (row.c?.name || row.c?.lineDisplayName || '（未知客戶）').trim()
      const key = name.toLowerCase()
      const existing = map.get(key) ?? {
        name,
        customerId: row.c?.id ?? '',
        lineName: row.c?.lineDisplayName || row.c?.name || name,
        phoneLast3: row.c?.phoneLast3 ?? '',
        rows: [],
      }
      existing.rows.push(row)
      map.set(key, existing)
    }
    for (const group of map.values()) {
      group.rows.sort((a, b) => (b.o.createdAt ?? 0) - (a.o.createdAt ?? 0))
    }
    return [...map.values()].sort(
      (a, b) => (b.rows[0]?.o.createdAt ?? 0) - (a.rows[0]?.o.createdAt ?? 0),
    )
  }, [filteredRows])

  useEffect(() => {
    if (statusFilter === 'all') {
      setExpandedCustomers(new Set())
      return
    }
    setExpandedCustomers(new Set(customerGroups.map((g) => g.name.toLowerCase())))
  }, [customerGroups, statusFilter])

  const metrics = useMemo(() => {
    let pending = 0
    for (const row of allRows) {
      if (isRowPending(row.sh, row.o)) pending += 1
    }
    return {
      customers: customerGroups.length,
      shipments: statusFilter === 'pending' ? pending : filteredRows.length,
      pending,
    }
  }, [allRows, customerGroups.length, filteredRows.length, statusFilter])

  const statusCounts = useMemo(() => {
    let pending = 0
    let shipped = 0
    for (const row of allRows) {
      if (isRowPending(row.sh, row.o)) pending += 1
      if (isRowShipped(row.sh, row.o)) shipped += 1
    }
    return { all: allRows.length, pending, shipped }
  }, [allRows])

  function customerKey(name: string) {
    return name.toLowerCase()
  }

  function customerShipDate(name: string) {
    return customerShipDates[customerKey(name)] || todayIso()
  }

  function setCustomerShipDate(name: string, date: string) {
    setCustomerShipDates((prev) => ({ ...prev, [customerKey(name)]: date }))
  }

  function customerRecord(customerId: string) {
    return customers.find((c) => c.id === customerId)
  }

  function memoIdsToSettle(customerId: string): string[] {
    const c = customerRecord(customerId)
    const excluded = excludedMemoIds[customerId] ?? new Set<string>()
    return openBalanceMemos(c?.balanceMemos)
      .filter((m) => !excluded.has(m.id))
      .map((m) => m.id)
  }

  function toggleMemoSettle(customerId: string, memoId: string, include: boolean) {
    setExcludedMemoIds((prev) => {
      const next = { ...prev }
      const set = new Set(next[customerId] ?? [])
      if (include) set.delete(memoId)
      else set.add(memoId)
      next[customerId] = set
      return next
    })
  }

  function settleMemosForShipBatch(customerIds: string[], shipDate: string) {
    const note = `出貨抵銷 ${shipDate}`
    for (const customerId of customerIds) {
      if (!customerId) continue
      const ids = memoIdsToSettle(customerId)
      if (ids.length > 0) settleCustomerBalanceMemos(customerId, ids, note)
    }
  }

  const selectedIds = useMemo(
    () =>
      Object.entries(sel)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [sel],
  )

  function toggleShipmentSelect(id: string) {
    setSel((s) => {
      const next = { ...s }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  function toggleCustomerSelect(group: CustomerShipmentGroup, checked: boolean) {
    setSel((prev) => {
      const next = { ...prev }
      for (const { sh, o } of group.rows) {
        if (!isRowPending(sh, o)) continue
        if (checked) next[sh.id] = true
        else delete next[sh.id]
      }
      return next
    })
  }

  function isCustomerFullySelected(group: CustomerShipmentGroup) {
    const pending = group.rows.filter(({ sh, o }) => isRowPending(sh, o))
    return pending.length > 0 && pending.every(({ sh }) => sel[sh.id])
  }

  function isCustomerPartiallySelected(group: CustomerShipmentGroup) {
    const pending = group.rows.filter(({ sh, o }) => isRowPending(sh, o))
    const n = pending.filter(({ sh }) => sel[sh.id]).length
    return n > 0 && n < pending.length
  }

  function confirmBatchShip(customerName?: string) {
    const ids = customerName
      ? selectedIds.filter((id) => {
          const row = allRows.find((r) => r.sh.id === id)
          const name = (row?.c?.name || row?.c?.lineDisplayName || '').trim()
          return customerKey(name) === customerKey(customerName)
        })
      : selectedIds

    const pendingIds = ids.filter((id) => {
      const row = allRows.find((r) => r.sh.id === id)
      return row ? isRowPending(row.sh, row.o) : false
    })

    if (pendingIds.length === 0) {
      addToast('請先勾選待出貨訂單', 'err')
      return
    }

    const shipDateByShipmentId: Record<string, string> = {}
    const customerIdsToSettle = new Set<string>()
    for (const id of pendingIds) {
      const row = allRows.find((r) => r.sh.id === id)
      const name = (row?.c?.name || row?.c?.lineDisplayName || customerName || '').trim()
      shipDateByShipmentId[id] = customerShipDate(name)
      if (row?.c?.id) customerIdsToSettle.add(row.c.id)
    }

    const shipDate = customerName ? customerShipDate(customerName) : todayIso()
    batchShipShipped(pendingIds, shipDateByShipmentId)
    settleMemosForShipBatch([...customerIdsToSettle], shipDate)
    setSel((prev) => {
      const next = { ...prev }
      for (const id of pendingIds) delete next[id]
      return next
    })
  }

  function removeShipments(ids: string[], label?: string) {
    const uniqueIds = [...new Set(ids.filter(Boolean))]
    if (!uniqueIds.length) {
      addToast('請先選擇要刪除的出貨項目', 'err')
      return
    }
    const count = uniqueIds.length
    const confirmLabel = label || `${count} 筆出貨`
    if (!window.confirm(`確定刪除${confirmLabel}？對應客單也會一併刪除，且不會再出現在出貨物流。`)) return

    const orderIds = allRows.filter((r) => uniqueIds.includes(r.sh.id)).map((r) => r.o.id)
    deleteShipments(uniqueIds)
    clearLiveSyncedOrderIds(orderIds)
    setSel((prev) => {
      const next = { ...prev }
      for (const id of uniqueIds) delete next[id]
      return next
    })
  }

  function confirmBatchDelete(customerName?: string) {
    const ids = customerName
      ? selectedIds.filter((id) => {
          const row = allRows.find((r) => r.sh.id === id)
          const name = (row?.c?.name || row?.c?.lineDisplayName || '').trim()
          return customerKey(name) === customerKey(customerName)
        })
      : selectedIds
    removeShipments(ids, customerName ? `「${customerName}」已勾選的 ${ids.length} 筆出貨` : `${ids.length} 筆出貨`)
  }

  function toggleCustomerExpand(name: string) {
    const key = customerKey(name)
    setExpandedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function exportList() {
    const data: (string | number)[][] = [
      ['查詢碼', '客戶', '團名', '物流', '單號', '狀態', '寄出日', '備註'],
      ...filteredRows.map(({ sh, o, c, g }) => [
        o.lookupCode,
        c?.name ?? '',
        g?.name ?? '',
        sh.carrier,
        sh.trackingNo,
        isRowShipped(sh, o) ? '已出貨' : '待出貨',
        sh.shipDate,
        sh.notes,
      ]),
    ]
    downloadCsv('出貨清單.csv', data)
    addToast('已匯出出貨 CSV', 'ok')
  }

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: '待出貨' },
    { key: 'shipped', label: '已出貨' },
    { key: 'all', label: '全部' },
  ]

  return (
    <div className="shipping-page">
      <PageHeader
        title="出貨物流"
        action={
          <>
            <Btn variant="secondary" onClick={exportList}>
              匯出清單
            </Btn>
            <Btn
              variant="danger"
              onClick={() => confirmBatchDelete()}
              disabled={selectedIds.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              刪除（{selectedIds.length}）
            </Btn>
            <Btn onClick={() => confirmBatchShip()} disabled={selectedIds.length === 0}>
              <Truck className="h-4 w-4" />
              批次出貨（{selectedIds.length}）
            </Btn>
          </>
        }
      />

      <div className="oc-metric-blocks mb-4">
        <div className="oc-metric-card oc-metric-card--blue">
          <p className="oc-metric-label">待出貨客人</p>
          <p className="oc-metric-value">{metrics.customers}</p>
        </div>
        <div className="oc-metric-card oc-metric-card--teal">
          <p className="oc-metric-label">待出貨筆數</p>
          <p className="oc-metric-value oc-metric-value--teal">{metrics.pending}</p>
        </div>
      </div>

      <Card className="shipping-search-panel mb-4 !p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted" />
          <input
            className="w-full rounded-xl border border-white/[0.1] bg-ds-surface py-2.5 pl-10 pr-3 text-body text-ds-text outline-none transition focus:border-ds-primary/45 focus:ring-2 focus:ring-ds-primary/20"
            placeholder="搜尋客人、查詢碼、團名、物流單號…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="shipping-status-tabs mt-3">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={
                statusFilter === tab.key ? 'shipping-status-tab shipping-status-tab--active' : 'shipping-status-tab'
              }
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}（{statusCounts[tab.key]}）
            </button>
          ))}
        </div>
      </Card>

      {allRows.length === 0 ? (
        <Empty
          title="尚無待出貨訂單"
          hint="當團務狀態改為「已抵台」，訂單會自動出現在此（含未付訂金）。"
        />
      ) : filteredRows.length === 0 ? (
        <Empty title="查無符合條件" hint="調整搜尋或狀態篩選。" />
      ) : (
        <div className="space-y-3">
          {customerGroups.map((group) => {
            const expanded = expandedCustomers.has(customerKey(group.name))
            const groupNames = [...new Set(group.rows.map((r) => r.g?.name).filter(Boolean))].join('、')
            const pendingCount = group.rows.filter(({ sh, o }) => isRowPending(sh, o)).length
            const shippedCount = group.rows.length - pendingCount
            const balanceDue = pendingBalanceTotal(group.rows)
            const cust = group.customerId ? customerRecord(group.customerId) : undefined
            const openMemos = openBalanceMemos(cust?.balanceMemos)
            const memoAdjust = sumOpenMemoAdjust(cust?.balanceMemos)
            const adjustedDue = adjustedBalanceDue(balanceDue, cust?.balanceMemos)
            const hasMemoAdjust = memoAdjust !== 0

            return (
              <Card key={group.name} className="order-customer-card" hover={false}>
                <div
                  className="order-customer-card-head order-customer-card-head--clickable flex flex-wrap items-center justify-between gap-3"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCustomerExpand(group.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleCustomerExpand(group.name)
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="shipping-customer-name">{group.name}</p>
                    <p className="shipping-customer-meta">
                      LINE：{group.lineName} · 手機尾碼 {maskPhoneLast3(group.phoneLast3)}
                    </p>
                    {!expanded ? (
                      <p className="shipping-customer-meta">
                        {group.rows.length} 筆
                        {pendingCount > 0 ? ` · 待出貨 ${pendingCount}` : ''}
                        {shippedCount > 0 ? ` · 已出貨 ${shippedCount}` : ''}
                        {balanceDue > 0 ? ` · 尾款 NT$${balanceDue.toLocaleString()}` : ''}
                        {hasMemoAdjust ? ` · 合計 NT$${adjustedDue.toLocaleString()}` : ''}
                        {groupNames ? ` · ${groupNames}` : ''}
                      </p>
                    ) : balanceDue > 0 || hasMemoAdjust ? (
                      <p className="shipping-customer-balance">
                        {balanceDue > 0 ? `尾款合計 NT$${balanceDue.toLocaleString()}` : null}
                        {hasMemoAdjust ? (
                          <span className="shipping-customer-balance-adjust">
                            {balanceDue > 0 ? ' → ' : ''}
                            含帳務備註 NT${adjustedDue.toLocaleString()}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <div className="shipping-customer-actions" onClick={(e) => e.stopPropagation()}>
                    {expanded && pendingCount > 0 ? (
                      <label className="shipping-select-all">
                        <input
                          type="checkbox"
                          checked={isCustomerFullySelected(group)}
                          ref={(el) => {
                            if (el) el.indeterminate = isCustomerPartiallySelected(group)
                          }}
                          onChange={(e) => toggleCustomerSelect(group, e.target.checked)}
                        />
                        全選
                      </label>
                    ) : null}
                    {group.customerId ? (
                      <Link
                        className="text-body text-sm font-semibold text-ds-primary hover:underline"
                        to={`/customers/${group.customerId}`}
                      >
                        客戶詳情
                      </Link>
                    ) : null}
                    <Chip tone="neutral" className="order-card-chip">
                      {group.rows.length} 筆
                    </Chip>
                    <ChevronDown
                      className={`shipping-expand-icon${expanded ? ' shipping-expand-icon--open' : ''}`}
                      aria-hidden
                    />
                  </div>
                </div>

                {expanded ? (
                  <>
                    {openMemos.length > 0 && group.customerId ? (
                      <BalanceMemoCollapsible
                        title="帳務備註（出貨時抵銷）"
                        summary={`${openMemos.length} 筆 · 合計 ${formatMemoAmount(memoAdjust)}`}
                        className="shipping-balance-memos"
                        storageKey={`heina.ship.cbm.${group.customerId}`}
                        onToggleClick={(e) => e.stopPropagation()}
                      >
                        <ul className="shipping-balance-memos-list">
                          {openMemos.map((m) => {
                            const amt = memoAdjustAmount(m)
                            const included = !(excludedMemoIds[group.customerId]?.has(m.id) ?? false)
                            return (
                              <li key={m.id} className="shipping-balance-memo">
                                <label className="shipping-balance-memo-label">
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={(e) => toggleMemoSettle(group.customerId, m.id, e.target.checked)}
                                  />
                                  <strong className="shipping-balance-memo-amount">{formatMemoAmount(amt)}</strong>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                        <Link className="shipping-balance-memos-edit" to={`/customers/${group.customerId}`}>
                          編輯帳務備註
                        </Link>
                      </BalanceMemoCollapsible>
                    ) : null}
                    {group.customerId && cust ? (
                      <div className="shipping-customer-note" onClick={(e) => e.stopPropagation()}>
                        <CustomerNoteField
                          compact
                          value={cust.customerNote}
                          onSave={(next) => updateCustomer(group.customerId!, { customerNote: next })}
                        />
                      </div>
                    ) : null}
                    <div className="shipping-customer-ship-bar" onClick={(e) => e.stopPropagation()}>
                      <label className="shipping-customer-ship-date">
                        <span>出貨日期</span>
                        <input
                          type="date"
                          className="shipping-row-date"
                          value={customerShipDates[customerKey(group.name)] || todayIso()}
                          onChange={(e) => setCustomerShipDate(group.name, e.target.value)}
                          aria-label={`${group.name} 出貨日期`}
                        />
                      </label>
                      <p className="shipping-customer-ship-hint">勾選訂單後按「確認出貨」，此日期套用於該客人本次出貨</p>
                      <Btn
                        variant="danger"
                        className="shipping-customer-delete-btn"
                        disabled={!group.rows.some(({ sh }) => sel[sh.id])}
                        onClick={() => confirmBatchDelete(group.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                        刪除勾選
                      </Btn>
                      <Btn
                        className="shipping-customer-ship-btn"
                        disabled={!group.rows.some(({ sh, o }) => isRowPending(sh, o) && sel[sh.id])}
                        onClick={() => confirmBatchShip(group.name)}
                      >
                        <Truck className="h-4 w-4" />
                        確認出貨
                      </Btn>
                    </div>
                    {group.rows.map(({ sh, o, g }) => {
                      const shipped = isRowShipped(sh, o)
                      const groupName = g?.name ?? '（未知團）'
                      const itemCount = orderItemCount(o)
                      const orderBalance = Math.max(0, Number(o.balance) || 0)

                      return (
                        <div
                          key={sh.id}
                          className={`shipping-shipment-row${shipped ? ' shipping-shipment-row--shipped' : ''}`}
                        >
                          <div className="shipping-row-meta">
                            <div className="shipping-row-badges">
                              <span
                                className={`shipping-status-badge ${shipped ? 'shipping-status-badge--shipped' : 'shipping-status-badge--not_packed'}`}
                              >
                                {shipped ? '已出貨' : '待出貨'}
                              </span>
                              <span
                                className={`order-pay-status order-pay-status--${getPaymentStatusBadgeVariant(o.paymentStatus)}`}
                              >
                                {getPaymentStatusLabel(o.paymentStatus)}
                              </span>
                            </div>
                          </div>

                          <div className="shipping-row-body">
                            <div className="shipping-row-main">
                              {shipped ? (
                                <Btn
                                  variant="ghost"
                                  className="shipping-revert-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    revertShipmentToPending(sh.id)
                                  }}
                                >
                                  退回待出貨
                                </Btn>
                              ) : (
                                <label className="shipping-row-ship-toggle" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={!!sel[sh.id]}
                                    onChange={() => toggleShipmentSelect(sh.id)}
                                  />
                                  <span>選取</span>
                                </label>
                              )}
                              <div className="shipping-row-info min-w-0 flex-1">
                                <p className="shipping-row-group-name">{groupName}</p>
                                <p className="shipping-row-item-count">{itemCount} 件</p>
                                {shipped && sh.shipDate ? (
                                  <p className="shipping-row-detail shipping-row-detail--muted">
                                    出貨日 {sh.shipDate}
                                  </p>
                                ) : null}
                              </div>
                              <div className="shipping-row-aside">
                                {orderBalance > 0 ? (
                                  <p className="shipping-row-order-balance">尾款 NT${orderBalance.toLocaleString()}</p>
                                ) : null}
                                <p className="shipping-row-code">
                                  <Link to={`/orders/${o.id}`}>{o.lookupCode}</Link>
                                </p>
                                <Btn
                                  variant="ghost"
                                  className="shipping-delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeShipments([sh.id], `「${group.name}」這筆出貨（${o.lookupCode}）`)
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  刪除
                                </Btn>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
