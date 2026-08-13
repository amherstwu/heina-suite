import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Truck } from 'lucide-react'
import type { Group, Order } from '../../daigou/types'
import { classifyDaigouOrder, type DaigouOrderBucket } from '../../modules/groupbuy/v50Utils'
import { parseV50Refs } from '../../modules/groupbuy/v50OrderLookup'
import { openGroupHref } from '../open-groups/openGroupsUtils'
import { itemTotalTwd } from '../../daigou/logic/orderCalc'
import { useDaigouStore } from '../../daigou/store'
import { dash, formatTwd } from '../customer-portal/portalUtils'
import {
  balanceAmountForPreview,
  depositLineForBucket,
  groupStatusLabel,
  paymentLabel,
  pillTone,
  previewShipLineForBucket,
  showBalanceLineInPreview,
} from './previewUtils'

type Props = {
  order: Order
  group?: Group
  open: boolean
  onToggle: () => void
  orderBucket?: DaigouOrderBucket
  variant?: 'member' | 'staff'
  onCopySummary?: (order: Order) => void
  /** 自助查詢頁帶入，返回時可還原該客人的訂單列表 */
  lookupQuery?: string
}

export function StaffLookupPreviewCard({
  order,
  group,
  open,
  onToggle,
  orderBucket,
  variant = 'member',
  onCopySummary,
  lookupQuery,
}: Props) {
  const effectiveBucket =
    orderBucket ?? classifyDaigouOrder(order.paymentStatus, group?.internalNotes, order.orderStatus)
  const groupName = group?.name ?? '—'
  const groupStatus = groupStatusLabel(group)
  const payLabel = paymentLabel(order)
  const payTone = pillTone(payLabel)
  const shipments = useDaigouStore((s) => s.shipments)
  const shipment = shipments.find((s) => s.orderId === order.id)
  const shipLine = previewShipLineForBucket(order, group, effectiveBucket, shipment)
  const depositLine = depositLineForBucket(order, effectiveBucket)
  const balanceAmount = balanceAmountForPreview(order, effectiveBucket)
  const itemsAmount = useMemo(() => itemTotalTwd(order.items), [order.items])
  const grandTotal = order.totalAmount
  const v50GroupId =
    parseV50Refs(group?.internalNotes).v50GroupId ?? parseV50Refs(order.internalNote).v50GroupId ?? null

  return (
    <li className={'slmp-order-card' + (open ? ' is-open' : '')}>
      <button type="button" className="slmp-order-head" aria-expanded={open} onClick={onToggle}>
        <div className="slmp-order-head-inner">
          <div className="slmp-order-badges">
            <span className="slmp-status-badge slmp-status-badge--ship">{groupStatus}</span>
            <span className={'slmp-status-badge slmp-status-badge--pay-' + payTone}>{payLabel}</span>
          </div>
          <div className="slmp-order-main">
            <h3 className="slmp-order-title">{dash(groupName)}</h3>
            <p className="slmp-order-code">{dash(order.lookupCode)}</p>
            <p className="slmp-ship-date">
              {shipLine.label ? (
                <>
                  {shipLine.label} <span>{dash(shipLine.value)}</span>
                </>
              ) : (
                <span>{shipLine.value}</span>
              )}
            </p>
          </div>
          <div className="slmp-order-side">
            <span className="slmp-order-chev" aria-hidden>
              ›
            </span>
            <div className="slmp-order-price-col">
              <span className="slmp-order-price-label">訂單總額</span>
              <strong className="slmp-order-price">{formatTwd(grandTotal)}</strong>
            </div>
          </div>
        </div>
      </button>

      {open ? (
        <div className="slmp-order-body">
          <section className="slmp-section">
            <h4 className="slmp-section-head">
              <span aria-hidden>📦</span> 購買清單
            </h4>
            <div className="slmp-purchase-card">
              {order.items.length === 0 ? (
                <p className="slmp-footnote" style={{ margin: 0 }}>
                  尚無品項
                </p>
              ) : (
                order.items.map((it, i) => {
                  const lineTotal = (Number(it.qty) || 0) * (Number(it.twdUnit) || 0)
                  const unitPrice = Math.round(Number(it.twdUnit) || 0).toLocaleString('zh-TW')
                  return (
                    <div key={`${it.productId}-${i}`} className="slmp-purchase-row">
                      <span className="slmp-purchase-name">{dash(it.name)}</span>
                      <span className="slmp-purchase-calc">
                        {it.qty} × {unitPrice} = {formatTwd(lineTotal)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="slmp-section">
            <h4 className="slmp-section-head slmp-section-head--money">
              <span aria-hidden>$</span> 金額結算
            </h4>
            <div className="slmp-money-card">
              <div className="slmp-money-row">
                <span>商品金額</span>
                <strong>{formatTwd(itemsAmount)}</strong>
              </div>
              <div className="slmp-money-row">
                <span>國內運費</span>
                <strong>{formatTwd(order.domesticShipping)}</strong>
              </div>
              <div className="slmp-money-row">
                <span>國際運費</span>
                <strong>{formatTwd(order.internationalShipping)}</strong>
              </div>
              <div className="slmp-money-row slmp-money-row--total">
                <span>總額</span>
                <strong>{formatTwd(grandTotal)}</strong>
              </div>
              <hr className="slmp-money-divider" />
              <div className="slmp-money-highlight">
                <span>{depositLine.label}</span>
                <strong className="slmp-deposit">{formatTwd(depositLine.amount)}</strong>
              </div>
              {showBalanceLineInPreview(effectiveBucket) ? (
                <div className="slmp-money-highlight">
                  <span>
                    尾款
                    <small className="slmp-balance-note">（抵台時賣貨便下單）</small>
                  </span>
                  <strong
                    className={
                      'slmp-balance' +
                      (variant === 'member' && effectiveBucket !== 'pending' ? ' slmp-balance--emphasis' : '') +
                      (variant === 'staff' ? ' slmp-balance--staff' : '')
                    }
                  >
                    {formatTwd(balanceAmount)}
                  </strong>
                </div>
              ) : (
                <div className="slmp-money-highlight">
                  <span>結清狀態</span>
                  <strong className="slmp-deposit">已結清</strong>
                </div>
              )}
            </div>
          </section>

          {variant === 'staff' && order.notes?.trim() ? (
            <p className="slmp-footnote slmp-pay-note">
              <strong>匯款紀錄：</strong>
              {order.notes.trim()}
            </p>
          ) : null}

          {order.customerNote?.trim() ? (
            <p className="slmp-footnote">備註：{order.customerNote}</p>
          ) : null}

          {v50GroupId ? (
            <Link className="slmp-open-group-link" to={openGroupHref(v50GroupId, lookupQuery, order.id)}>
              查看此團
            </Link>
          ) : null}

          {variant === 'staff' ? (
            <div className="slmp-staff-actions">
              <Link className="slmp-staff-btn" to={`/orders/${order.id}`}>
                查看訂單
              </Link>
              <Link className="slmp-staff-btn" to={`/orders/${order.id}`}>
                記錄付款
              </Link>
              <Link className="slmp-staff-btn" to="/shipping">
                <Truck className="h-3.5 w-3.5" aria-hidden />
                填寫物流
              </Link>
              <button
                type="button"
                className="slmp-staff-btn slmp-staff-btn--ghost"
                onClick={() => onCopySummary?.(order)}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                複製摘要
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
