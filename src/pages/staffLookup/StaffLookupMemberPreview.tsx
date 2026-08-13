import { useMemo, useState, useEffect } from 'react'
import type { Group, Order } from '../../daigou/types'
import {
  CUSTOMER_GROUP_STATUS_FILTERS,
  isDaigouOrderShipped,
  matchesCustomerGroupStatusFilter,
  type CustomerGroupStatusFilter,
  type DaigouOrderBucket,
} from '../../modules/groupbuy/v50Utils'
import { previewSummaryForBucket, shipDateSortKey } from './previewUtils'
import { StaffLookupPreviewCard } from './StaffLookupPreviewCard'
import { StaffLookupSummaryBar } from './StaffLookupSummaryBar'
import './StaffLookupMemberPreview.css'

type SortMode = 'time' | 'ship' | 'amount'
type DeliveryFilter = '' | 'shipped' | 'not_shipped'

function matchesDeliveryFilter(order: Order, filter: DeliveryFilter) {
  if (!filter) return true
  const shipped = isDaigouOrderShipped(order.orderStatus)
  if (filter === 'shipped') return shipped
  return !shipped
}

export function StaffLookupMemberPreview({
  orders,
  groupsById,
  orderBucket,
  lookupQuery,
  initialExpandedId,
}: {
  lineDisplayName: string
  orders: Order[]
  groupsById: Map<string, Group>
  orderBucket?: DaigouOrderBucket
  pendingShipCount?: number
  lookupQuery?: string
  /** 從開團詳情返回時，展開原本點過的訂單小卡 */
  initialExpandedId?: string | null
}) {
  const [expandedId, setExpandedId] = useState<string | null>(() => initialExpandedId || null)
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [groupStatusFilter, setGroupStatusFilter] = useState<CustomerGroupStatusFilter>('')
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('')

  useEffect(() => {
    if (initialExpandedId) setExpandedId(initialExpandedId)
  }, [initialExpandedId])

  const sorted = useMemo(() => {
    const rows = [...orders]
    if (sortMode === 'amount') {
      rows.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0))
    } else if (sortMode === 'ship') {
      rows.sort((a, b) => {
        const ga = groupsById.get(a.groupId)
        const gb = groupsById.get(b.groupId)
        const ka = shipDateSortKey(ga?.officialShipDate)
        const kb = shipDateSortKey(gb?.officialShipDate)
        if (ka !== kb) return ka - kb
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })
    } else {
      rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    }
    return rows
  }, [orders, sortMode, groupsById])

  const filtered = useMemo(() => {
    return sorted.filter((o) => {
      const g = groupsById.get(o.groupId)
      return (
        matchesCustomerGroupStatusFilter(g?.internalNotes, groupStatusFilter) &&
        matchesDeliveryFilter(o, deliveryFilter)
      )
    })
  }, [sorted, groupsById, groupStatusFilter, deliveryFilter])

  const summary = useMemo(() => previewSummaryForBucket(filtered, orderBucket), [filtered, orderBucket])

  return (
    <div className="slmp-preview">
      <StaffLookupSummaryBar orders={filtered} />

      <div className="slmp-toolbar">
        <select
          className="slmp-sort"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          aria-label="排序方式"
        >
          <option value="time">依登記時間</option>
          <option value="ship">依官方出貨日</option>
          <option value="amount">依金額大小</option>
        </select>
        <span className="slmp-count">共 {filtered.length} 個訂單</span>
      </div>

      <div className="slmp-filters">
        <div className="slmp-filter-group">
          <p className="slmp-filter-label">
            <span aria-hidden>📦</span> 團務狀況
          </p>
          <div className="slmp-pills">
            <button
              type="button"
              className={'slmp-pill' + (groupStatusFilter === '' ? ' is-on' : '')}
              onClick={() => setGroupStatusFilter('')}
            >
              全部
            </button>
            {CUSTOMER_GROUP_STATUS_FILTERS.map((label) => (
              <button
                key={label}
                type="button"
                className={'slmp-pill' + (groupStatusFilter === label ? ' is-on' : '')}
                onClick={() => setGroupStatusFilter(groupStatusFilter === label ? '' : label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="slmp-filter-group">
          <p className="slmp-filter-label slmp-filter-label--ship">
            <span aria-hidden>🚚</span> 出貨篩選
          </p>
          <div className="slmp-pills">
            <button
              type="button"
              className={'slmp-pill slmp-pill--ship' + (deliveryFilter === '' ? ' is-on' : '')}
              onClick={() => setDeliveryFilter('')}
            >
              全部
            </button>
            <button
              type="button"
              className={'slmp-pill slmp-pill--ship' + (deliveryFilter === 'shipped' ? ' is-on' : '')}
              onClick={() => setDeliveryFilter(deliveryFilter === 'shipped' ? '' : 'shipped')}
            >
              已出貨
            </button>
            <button
              type="button"
              className={'slmp-pill slmp-pill--ship' + (deliveryFilter === 'not_shipped' ? ' is-on' : '')}
              onClick={() => setDeliveryFilter(deliveryFilter === 'not_shipped' ? '' : 'not_shipped')}
            >
              尚未出貨
            </button>
          </div>
          <p className="slmp-filter-hint">出貨物流標記為已出貨後，訂單會自動移至「已結束訂單」。</p>
        </div>
      </div>

      <h4 className="slmp-list-title">訂單列表</h4>
      {filtered.length === 0 ? (
        <p className="slmp-empty">目前篩選條件下沒有訂單，請調整團務狀況或出貨篩選。</p>
      ) : (
        <ul className="slmp-order-list">
          {filtered.map((o) => {
            const id = o.id
            const open = expandedId === id
            return (
              <StaffLookupPreviewCard
                key={id}
                order={o}
                group={groupsById.get(o.groupId)}
                open={open}
                variant="member"
                orderBucket={orderBucket}
                lookupQuery={lookupQuery}
                onToggle={() => setExpandedId(open ? null : id)}
              />
            )
          })}
        </ul>
      )}

      <p className="slmp-footnote">{summary.footnote}</p>
    </div>
  )
}
