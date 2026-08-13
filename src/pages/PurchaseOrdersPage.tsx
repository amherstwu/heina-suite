import { Link } from 'react-router-dom'
import { Btn, Card, PageHeader } from '../components/ui'
import { DataTable } from '../components/app'
import { useDaigouStore } from '../daigou/store'

export function PurchaseOrdersPage() {
  const suppliers = useDaigouStore((s) => s.suppliers)
  const purchaseOrders = useDaigouStore((s) => s.purchaseOrders)
  const products = useDaigouStore((s) => s.products)
  const addPurchaseOrder = useDaigouStore((s) => s.addPurchaseOrder)
  const approvePurchaseOrder = useDaigouStore((s) => s.approvePurchaseOrder)

  function createDemoPo() {
    const supplier = suppliers[0]
    const p = products[0]
    if (!supplier || !p) return
    addPurchaseOrder({
      supplierId: supplier.id,
      groupId: p.groupId,
      status: 'draft',
      orderDate: new Date().toISOString().slice(0, 10),
      items: [
        {
          id: `poi_${Date.now()}`,
          productId: p.id,
          sku: p.productCode,
          name: p.name,
          qtyOrdered: 20,
          qtyReceived: 0,
          qtyReturned: 0,
          unitCost: p.jpyPrice,
          currency: 'JPY',
        },
      ],
      shippingCost: 0,
      taxAmount: 0,
      discountAmount: 0,
      otherCost: 0,
      currency: 'JPY',
    })
  }

  return (
    <div>
      <PageHeader
        title="採購單"
        subtitle="建立採購單、送審、下單與追蹤進度"
        action={
          <>
            <Btn variant="secondary" onClick={createDemoPo}>
              建立示範採購單
            </Btn>
          </>
        }
      />
      <Card className="mb-4 !p-4 text-sm text-ds-text-secondary">
        點擊採購單號可進入明細，執行核准、建立應付與收貨流程。
      </Card>
      <DataTable
        rows={purchaseOrders}
        columns={[
          { key: 'poNo', title: '採購單號', render: (r) => <Link to={`/procurement/purchase-orders/${r.id}`} className="text-ds-primary hover:underline">{r.poNo}</Link> },
          { key: 'supplier', title: '供應商', render: (r) => suppliers.find((s) => s.id === r.supplierId)?.name ?? '—' },
          { key: 'status', title: '狀態', render: (r) => r.status },
          { key: 'total', title: '總額', className: 'text-right', render: (r) => r.totalAmount.toLocaleString() },
          {
            key: 'action',
            title: '操作',
            render: (r) => (
              <Btn className="!min-h-0 !px-2 !py-1 text-xs" variant="secondary" onClick={() => approvePurchaseOrder(r.id)}>
                核准
              </Btn>
            ),
          },
        ]}
      />
    </div>
  )
}
