import { Btn, PageHeader } from '../components/ui'
import { DataTable } from '../components/app'
import { useDaigouStore } from '../daigou/store'

export function PurchaseReturnsPage() {
  const returns = useDaigouStore((s) => s.purchaseReturns)
  const po = useDaigouStore((s) => s.purchaseOrders[0])
  const createReturn = useDaigouStore((s) => s.createPurchaseReturn)

  return (
    <div>
      <PageHeader
        title="採購退貨"
        subtitle="建立退貨單並同步沖減庫存與應付"
        action={
          <Btn
            onClick={() => {
              if (!po || po.items.length === 0) return
              const item = po.items[0]
              createReturn({
                poId: po.id,
                supplierId: po.supplierId,
                status: 'draft',
                returnDate: new Date().toISOString().slice(0, 10),
                reason: '品項瑕疵',
                lines: [{ poItemId: item.id, productId: item.productId, qty: 1, unitCost: item.unitCost }],
                totalAmount: item.unitCost,
                refundedAmount: 0,
              })
            }}
          >
            新增退貨單
          </Btn>
        }
      />
      <DataTable
        rows={returns}
        columns={[
          { key: 'id', title: '退貨單', render: (r) => r.id },
          { key: 'poId', title: '採購單', render: (r) => r.poId },
          { key: 'date', title: '日期', render: (r) => r.returnDate },
          { key: 'reason', title: '原因', render: (r) => r.reason },
          { key: 'amount', title: '金額', className: 'text-right', render: (r) => r.totalAmount.toLocaleString() },
          { key: 'status', title: '狀態', render: (r) => r.status },
        ]}
      />
    </div>
  )
}
