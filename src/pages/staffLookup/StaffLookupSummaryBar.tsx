import { useMemo } from 'react'
import type { Order } from '../../daigou/types'
import { formatTwd } from '../customer-portal/portalUtils'
import { sumPendingBalanceDue, sumPendingDepositDue } from './previewUtils'

export function StaffLookupSummaryBar({ orders }: { orders: Order[] }) {
  const depositDue = useMemo(() => sumPendingDepositDue(orders), [orders])
  const balanceDue = useMemo(() => sumPendingBalanceDue(orders), [orders])

  return (
    <dl className="slmp-summary slmp-summary--2">
      <div className="slmp-summary-item">
        <dt>待付訂金合計</dt>
        <dd className="slmp-summary-balance">{formatTwd(depositDue)}</dd>
      </div>
      <div className="slmp-summary-item">
        <dt>待付尾款合計</dt>
        <dd className="slmp-summary-balance">{formatTwd(balanceDue)}</dd>
      </div>
    </dl>
  )
}
