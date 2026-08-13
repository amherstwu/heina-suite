import { Btn, PageHeader } from '../components/ui'
import { DataTable } from '../components/app'
import { useDaigouStore } from '../daigou/store'

export function PayablesPage() {
  const payables = useDaigouStore((s) => s.accountsPayables)
  const suppliers = useDaigouStore((s) => s.suppliers)
  const addPaymentTerm = useDaigouStore((s) => s.addPaymentTerm)
  const markPaymentTermPaid = useDaigouStore((s) => s.markPaymentTermPaid)
  const paymentTerms = useDaigouStore((s) => s.paymentTerms)

  return (
    <div>
      <PageHeader title="應付帳款" subtitle="付款排程、逾期追蹤與自動記帳" />
      <DataTable
        className="mb-5"
        rows={payables}
        columns={[
          { key: 'supplier', title: '供應商', render: (r) => suppliers.find((s) => s.id === r.supplierId)?.name ?? '—' },
          { key: 'po', title: '採購單', render: (r) => r.poId },
          { key: 'due', title: '到期日', render: (r) => r.dueDate },
          { key: 'remaining', title: '未付', className: 'text-right', render: (r) => `${r.currency} ${r.remainingAmount.toLocaleString()}` },
          {
            key: 'ops',
            title: '操作',
            render: (r) => (
              <Btn className="!min-h-0 !px-2 !py-1 text-xs" variant="secondary" onClick={() => addPaymentTerm({ payableId: r.id, plannedDate: r.dueDate, plannedAmount: r.remainingAmount, status: 'unpaid' })}>
                新增排程
              </Btn>
            ),
          },
        ]}
      />

      <DataTable
        rows={paymentTerms}
        columns={[
          { key: 'payable', title: '應付ID', render: (r) => r.payableId },
          { key: 'plannedDate', title: '預計日', render: (r) => r.plannedDate },
          { key: 'plannedAmount', title: '預計金額', render: (r) => r.plannedAmount.toLocaleString() },
          { key: 'status', title: '狀態', render: (r) => r.status },
          {
            key: 'mark',
            title: '操作',
            render: (r) =>
              r.status !== 'paid' ? (
                <Btn className="!min-h-0 !px-2 !py-1 text-xs" onClick={() => markPaymentTermPaid(r.id, r.plannedAmount)}>
                  標記已付
                </Btn>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </div>
  )
}
