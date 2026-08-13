import { useParams } from 'react-router-dom'
import { Btn, Card, Empty, PageHeader } from '../components/ui'
import { DataTable } from '../components/app'
import { useDaigouStore } from '../daigou/store'

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const po = useDaigouStore((s) => s.purchaseOrders.find((x) => x.id === id))
  const createPayable = useDaigouStore((s) => s.createPayableForPurchaseOrder)
  const confirmGoodsReceipt = useDaigouStore((s) => s.confirmGoodsReceipt)

  if (!po) return <Empty title="找不到採購單" />

  return (
    <div>
      <PageHeader
        title={`採購單 ${po.poNo}`}
        subtitle={`狀態：${po.status} · 審批：${po.approval.status}`}
        action={
          <>
            <Btn variant="secondary" onClick={() => createPayable(po.id, new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10))}>
              建立應付
            </Btn>
            <Btn
              onClick={() =>
                confirmGoodsReceipt({
                  poId: po.id,
                  receiptNo: `GR-${Date.now()}`,
                  receiptDate: new Date().toISOString().slice(0, 10),
                  lines: po.items.map((it) => ({ poItemId: it.id, qtyReceived: Math.max(0, it.qtyOrdered - it.qtyReceived) })),
                })
              }
            >
              一鍵收貨
            </Btn>
          </>
        }
      />
      <Card className="mb-4 !p-4">
        <div className="grid gap-2 text-sm text-ds-text-secondary md:grid-cols-3">
          <p>下單日：{po.orderDate}</p>
          <p>幣別：{po.currency}</p>
          <p>應付：{po.payableAmount.toLocaleString()}</p>
        </div>
      </Card>
      <DataTable
        rows={po.items}
        columns={[
          { key: 'name', title: '品項', render: (r) => r.name },
          { key: 'qtyOrdered', title: '訂購', render: (r) => r.qtyOrdered },
          { key: 'qtyReceived', title: '到貨', render: (r) => r.qtyReceived },
          { key: 'qtyReturned', title: '退貨', render: (r) => r.qtyReturned },
          { key: 'unitCost', title: '單價', render: (r) => `${r.currency} ${r.unitCost.toLocaleString()}` },
        ]}
      />
    </div>
  )
}
