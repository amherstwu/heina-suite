import { useState } from 'react'
import { Btn, Card, PageHeader } from '../components/ui'
import { DataTable, FormField } from '../components/app'
import { useDaigouStore } from '../daigou/store'

export function SuppliersPage() {
  const suppliers = useDaigouStore((s) => s.suppliers)
  const addSupplier = useDaigouStore((s) => s.addSupplier)
  const [name, setName] = useState('')

  return (
    <div>
      <PageHeader title="供應商管理" subtitle="建立供應商主檔，作為採購與應付帳款基礎" />
      <Card className="mb-4 !p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="供應商名稱">
            <input className="mt-1 w-full rounded-xl border border-white/[0.1] bg-ds-surface px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="flex items-end">
            <Btn
              onClick={() => {
                if (!name.trim()) return
                addSupplier({ name: name.trim(), code: name.trim().slice(0, 6).toUpperCase(), currency: 'JPY', paymentTermsDays: 30, active: true })
                setName('')
              }}
            >
              新增供應商
            </Btn>
          </div>
        </div>
      </Card>
      <DataTable
        rows={suppliers}
        columns={[
          { key: 'name', title: '名稱', render: (r) => r.name },
          { key: 'code', title: '代碼', render: (r) => r.code },
          { key: 'currency', title: '幣別', render: (r) => r.currency },
          { key: 'term', title: '帳期', render: (r) => `${r.paymentTermsDays} 天` },
          { key: 'active', title: '狀態', render: (r) => (r.active ? '啟用' : '停用') },
        ]}
      />
    </div>
  )
}
