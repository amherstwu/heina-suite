import { Btn, PageHeader } from '../components/ui'
import { DataTable } from '../components/app'
import { useDaigouStore } from '../daigou/store'

export function ReceiptsPage() {
  const receipts = useDaigouStore((s) => s.goodsReceipts)
  const purchaseOrders = useDaigouStore((s) => s.purchaseOrders)
  const confirmGoodsReceipt = useDaigouStore((s) => s.confirmGoodsReceipt)

  return (
    <div>
      <PageHeader
        title="到貨驗收"
        subtitle="確認到貨後會同步入庫並更新採購單進度"
        action={
          <Btn
            onClick={() => {
              const po = purchaseOrders[0]
              if (!po) return
              confirmGoodsReceipt({
                poId: po.id,
                receiptNo: `GR-${Date.now()}`,
                receiptDate: new Date().toISOString().slice(0, 10),
                lines: po.items.map((it) => ({ poItemId: it.id, qtyReceived: 1 })),
              })
            }}
          >
            新增驗收單
          </Btn>
        }
      />
      <DataTable
        rows={receipts}
        columns={[
          { key: 'receiptNo', title: '驗收單號', render: (r) => r.receiptNo },
          { key: 'poId', title: '採購單', render: (r) => purchaseOrders.find((x) => x.id === r.poId)?.poNo ?? r.poId },
          { key: 'date', title: '日期', render: (r) => r.receiptDate },
          { key: 'status', title: '狀態', render: (r) => r.status },
          { key: 'lines', title: '品項數', render: (r) => r.lines.length },
        ]}
      />
    </div>
  )
}
