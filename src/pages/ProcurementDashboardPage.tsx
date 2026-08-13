import { Link } from 'react-router-dom'
import { Package, Percent, Truck, Wallet } from 'lucide-react'
import { AppCard, MetricCard, MetricCardGrid, PageHeader } from '../components/app'
import { useDaigouStore } from '../daigou/store'
import { procurementStats } from '../daigou/selectors'

export function ProcurementDashboardPage() {
  const stats = useDaigouStore((s) => procurementStats(s))

  return (
    <div>
      <PageHeader
        title="進貨中心"
        subtitle="採購、到貨、應付、退貨與對帳的一站式流程"
        action={
          <Link to="/procurement/purchase-orders" className="text-sm font-semibold text-ds-primary hover:underline">
            進入採購單管理 →
          </Link>
        }
      />

      <MetricCardGrid className="mb-6">
        <MetricCard label="本月採購額" value={`NT$ ${stats.monthlyPurchaseAmount.toLocaleString()}`} icon={Package} />
        <MetricCard label="未付應付" value={`NT$ ${stats.unpaidPayable.toLocaleString()}`} icon={Wallet} />
        <MetricCard label="到貨率" value={`${stats.receiptRate}%`} icon={Truck} />
        <MetricCard label="退貨率" value={`${stats.returnRate}%`} icon={Percent} />
      </MetricCardGrid>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickCard to="/procurement/suppliers" title="供應商" desc="維護聯絡資訊、付款條件與交期表現" />
        <QuickCard to="/procurement/purchase-orders" title="採購單" desc="建立、審批、下單與追蹤到貨狀態" />
        <QuickCard to="/procurement/receipts" title="到貨驗收" desc="收貨與入庫過帳，更新商品庫存" />
        <QuickCard to="/procurement/payables" title="應付帳款" desc="付款排程、逾期追蹤與記帳連動" />
        <QuickCard to="/procurement/returns" title="退貨管理" desc="建立退貨單與沖減應付" />
        <QuickCard to="/procurement/reconciliation" title="採購對帳" desc="採購金額、應付與實付差異檢查" />
      </div>
    </div>
  )
}

function QuickCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to}>
      <AppCard className="h-full">
        <h3 className="text-base font-semibold text-ds-text">{title}</h3>
        <p className="mt-2 text-sm text-ds-text-secondary">{desc}</p>
      </AppCard>
    </Link>
  )
}
