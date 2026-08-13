import { Link } from 'react-router-dom'
import type { GroupBuyGroup, GroupBuyOrder } from '../../api/types'
import { isV50CodPayment, normalizeGroupStatus } from './v50Utils'
import './v50OrderDetailSheet.css'

type Props = {
  group: GroupBuyGroup
  order: GroupBuyOrder
  lookupCode?: string
}

function paymentBadgeClass(status: string): string {
  if (status === '未付款') return 'order-pay-status--pending'
  if (status === '已付訂金') return 'order-pay-status--warn'
  if (status === '已付款' || status === '已結清') return 'order-pay-status--ok'
  if (status === '貨到付款') return 'order-pay-status--neutral'
  return 'order-pay-status--neutral'
}

export function V50OrderDetailPanel({ group, order, lookupCode }: Props) {
  const items = order.items || []
  const groupStatus = normalizeGroupStatus(group.status)
  const unpaid = order.paymentStatus === '未付款'
  const isCod = isV50CodPayment(order.paymentStatus)

  return (
    <article className="order-detail-card">
      <p className="order-row-group-name">{group.name}</p>
      <div className="order-row-meta">
        <span className={`order-pay-status ${paymentBadgeClass(order.paymentStatus)}`}>
          {order.paymentStatus === '未付款' ? '未付款' : order.paymentStatus || '—'}
        </span>
        <span className={`order-group-status order-group-status--${groupStatus}`}>{groupStatus}</span>
        {lookupCode ? <span className="order-detail-inline-code">{lookupCode}</span> : null}
      </div>

      <div className="order-detail-body">
        <div className={`order-detail-balance${unpaid ? ' order-detail-balance--due' : ''}`}>
          <span className="order-detail-balance-label">{isCod ? '貨到應收' : '尾款'}</span>
          <strong className="order-detail-balance-value">NT${Number(order.balance || 0).toLocaleString()}</strong>
        </div>

        <div className="order-detail-stats">
          <div className="order-detail-stat">
            <span className="order-detail-stat-label">訂單金額</span>
            <strong>NT${Number(order.totalTwd || 0).toLocaleString()}</strong>
          </div>
          <div className="order-detail-stat">
            <span className="order-detail-stat-label">{isCod ? '訂金' : '應付訂金'}</span>
            <strong>{isCod ? '無需訂金' : `NT$${Number(order.deposit || 0).toLocaleString()}`}</strong>
          </div>
          <div className="order-detail-stat">
            <span className="order-detail-stat-label">國內運費</span>
            <strong>NT${Number(order.domesticShip || 0).toLocaleString()}</strong>
          </div>
          <div className="order-detail-stat">
            <span className="order-detail-stat-label">國際運費</span>
            <strong>NT${Number(order.intlShip || 0).toLocaleString()}</strong>
          </div>
        </div>

        <p className="order-detail-section-title">品項明細</p>
        {items.length === 0 ? (
          <p className="order-detail-hint">尚無品項</p>
        ) : (
          <ul className="order-detail-items">
            {items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="order-detail-item">
                <p className="order-detail-item-name">{it.name}</p>
                <p className="order-detail-item-meta">
                  ×{it.qty} · ¥{Number(it.jpy || 0).toLocaleString()} · NT${Number(it.twd || 0).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}

        {order.paymentInfo ? <p className="order-detail-note">備註：{order.paymentInfo}</p> : null}

        <div className="order-detail-actions">
          <Link to={`/groups?group=${encodeURIComponent(group.id)}`} className="order-detail-link">
            前往團務管理
          </Link>
        </div>
      </div>
    </article>
  )
}
