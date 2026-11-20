import type { GroupBuyOrder } from '../../api/types'
import { isV50CodPayment } from './v50Utils'
import './v50OrderDetailSheet.css'
import './v50OrderEntryModal.css'

type Props = {
  order: GroupBuyOrder
  onClose: () => void
  onEdit: () => void
  onOpenDaigou?: () => void
}

function paymentBadges(status: string) {
  if (status === '未付款') return ['未付款'] as const
  if (status === '已付訂金') return ['已付訂金'] as const
  if (status === '已付款' || status === '已結清') return ['已付清'] as const
  if (status === '貨到付款') return ['貨到付款'] as const
  return [status || '—'] as const
}

export function V50OrderDetailSheet({ order, onClose, onEdit, onOpenDaigou }: Props) {
  const badges = paymentBadges(order.paymentStatus)
  const items = order.items || []
  const isCod = isV50CodPayment(order.paymentStatus)

  return (
    <div className="v50-order-sheet-back" onClick={onClose}>
      <div className="v50-order-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="v50-order-sheet-head">
          <h3 className="v50-order-sheet-title">{order.customerName || '（未填名字）'}</h3>
          <button type="button" className="v50-order-sheet-close" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>

        <div className="v50-order-sheet-badges">
          {badges.map((b) => (
            <span key={b} className="v50-order-sheet-badge">
              {b}
            </span>
          ))}
        </div>

        <div className="v50-order-sheet-grid">
          {isCod ? (
            <div>
              <span className="v50-order-sheet-label">訂金</span>
              <strong>無需訂金</strong>
            </div>
          ) : (
            <div>
              <span className="v50-order-sheet-label">應付訂金</span>
              <strong>${Number(order.deposit || 0).toLocaleString()}</strong>
            </div>
          )}
          <div>
            <span className="v50-order-sheet-label">總額</span>
            <strong>${Number(order.totalTwd || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span className="v50-order-sheet-label">{isCod ? '貨到應收' : '尾款'}</span>
            <strong>${Number(order.balance || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span className="v50-order-sheet-label">國內運費</span>
            <strong>${Number(order.domesticShip || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span className="v50-order-sheet-label">國際運費</span>
            <strong>${Number(order.intlShip || 0).toLocaleString()}</strong>
          </div>
        </div>

        <p className="v50-order-sheet-section">商品品項</p>
        {items.length === 0 ? (
          <p className="v50-order-sheet-hint">尚無品項</p>
        ) : (
          <ul className="v50-order-sheet-items">
            {items.map((it, i) => (
              <li key={`${it.name}-${i}`}>
                {it.name} ×{it.qty} · ¥{it.jpy} · 台幣 ${Number(it.twd).toLocaleString()}
              </li>
            ))}
          </ul>
        )}

        {order.paymentInfo ? (
          <p className="v50-order-sheet-hint">備註：{order.paymentInfo}</p>
        ) : null}

        <div className="v50-order-sheet-actions">
          <button type="button" className="v50-order-btn-cancel" onClick={onEdit}>
            編輯客訂
          </button>
          {onOpenDaigou ? (
            <button type="button" className="v50-order-btn-save" onClick={onOpenDaigou}>
              客單管理
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
