import { PageHeader } from '../components/ui'
import { DataTable } from '../components/app'
import { useDaigouStore } from '../daigou/store'
import { procurementReconciliationRows } from '../daigou/selectors'

export function ProcurementReconciliationPage() {
  const rows = useDaigouStore((s) => procurementReconciliationRows(s))

  return (
    <div>
      <PageHeader title="採購對帳" subtitle="比對採購單、應付帳款與實際付款差異" />
      <DataTable
        rows={rows}
        columns={[
          { key: 'poNo', title: '採購單號', render: (r) => r.poNo },
          { key: 'supplier', title: '供應商', render: (r) => r.supplierName },
          { key: 'poAmount', title: '採購金額', className: 'text-right', render: (r) => r.poAmount.toLocaleString() },
          { key: 'payable', title: '應付', className: 'text-right', render: (r) => r.payableAmount.toLocaleString() },
          { key: 'paid', title: '實付', className: 'text-right', render: (r) => r.paidAmount.toLocaleString() },
          { key: 'gap', title: '差異', className: 'text-right', render: (r) => r.gapAmount.toLocaleString() },
          { key: 'status', title: '狀態', render: (r) => r.status },
        ]}
      />
    </div>
  )
}
