import { useMemo, useState } from 'react'
import type { Group, Order, Transaction } from '../../daigou/types'
import type { DaigouOrderBucket } from '../../modules/groupbuy/v50Utils'
import { formatTwd } from '../customer-portal/portalUtils'
import { previewSummaryForBucket } from './previewUtils'
import { StaffLookupPreviewCard } from './StaffLookupPreviewCard'
import { StaffLookupSummaryBar } from './StaffLookupSummaryBar'
import './StaffLookupMemberPreview.css'

export function StaffLookupStaffPreview({
  orders,
  groupsById,
  orderBucket,
  transactions = [],
  onCopyOrderSummary,
}: {
  lineDisplayName: string
  orders: Order[]
  groupsById: Map<string, Group>
  orderBucket?: DaigouOrderBucket
  transactions?: Transaction[]
  onCopyOrderSummary?: (order: Order) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...orders].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [orders],
  )

  const summary = useMemo(() => previewSummaryForBucket(sorted, orderBucket), [sorted, orderBucket])

  return (
    <div className="slmp-preview slmp-preview--staff">
      <StaffLookupSummaryBar orders={sorted} />

      <h4 className="slmp-list-title">訂單明細</h4>
      {sorted.length === 0 ? (
        <p className="slmp-empty">此分頁沒有訂單。</p>
      ) : (
        <ul className="slmp-order-list">
          {sorted.map((o) => {
            const open = expandedId === o.id
            return (
              <StaffLookupPreviewCard
                key={o.id}
                order={o}
                group={groupsById.get(o.groupId)}
                open={open}
                variant="staff"
                orderBucket={orderBucket}
                onCopySummary={onCopyOrderSummary}
                onToggle={() => setExpandedId(open ? null : o.id)}
              />
            )
          })}
        </ul>
      )}

      {transactions.length > 0 ? (
        <section className="slmp-section slmp-tx-section">
          <h4 className="slmp-section-head">金流紀錄（此客戶）</h4>
          <div className="slmp-purchase-card">
            <ul className="slmp-tx-list">
              {transactions.slice(0, 12).map((t) => (
                <li key={t.id} className="slmp-tx-row">
                  <span>{t.date}</span>
                  <span className="slmp-tx-note">{t.note || '—'}</span>
                  <strong>{formatTwd(t.amount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <p className="slmp-footnote">{summary.footnote}</p>
    </div>
  )
}
