import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { Btn, PageHeader, Modal, Empty } from '../components/ui'
import { useDaigouStore } from '../daigou/store'
import { CUSTOMER_TAG_LABEL } from '../daigou/constants'
import type { Customer, CustomerTag } from '../daigou/types'
import { computeRiskScore } from '../daigou/logic/risk'
import { downloadCsv } from '../daigou/csv'
import { countLineImportAgainstExisting } from '../daigou/lineCustomerImport'
import { hasOpenBalanceMemos, sumOpenMemoAdjust } from '../daigou/customerBalanceMemo'
import {
  customerMatchesBankLastFiveQuery,
  normalizeBankLastFiveCodes,
} from '../daigou/customerBankLastFive'
import { normalizeLookupPin, isValidLookupPin } from '../daigou/portalLookupAuth'
import { CustomerBankLastFiveEditor } from '../components/customers/CustomerBankLastFiveEditor'
import { CustomerNoteField } from '../components/customers/CustomerNoteField'
import './customersPage.css'

const allTags: CustomerTag[] = [
  'vip',
  'frequent_buyer',
  'new_customer',
  'risk',
  'blacklist',
  'low_pickup',
  'manual_review',
]

function customerSearchHay(c: Customer) {
  const banks = normalizeBankLastFiveCodes(c.bankLastFiveCodes).join(' ')
  return `${c.name} ${c.lineDisplayName} ${c.phoneLast3} ${c.socialAccount || ''} ${banks} ${c.notes || ''} ${c.customerNote || ''}`.toLowerCase()
}

function toJoinedDateInput(ms?: number) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromJoinedDateInput(value: string) {
  const v = value.trim()
  if (!v) return undefined
  const ms = new Date(`${v}T12:00:00`).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

export function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dashHighRisk = searchParams.get('dash') === 'high-risk'

  const customers = useDaigouStore((s) => s.customers)
  const orders = useDaigouStore((s) => s.orders)
  const myShipRecords = useDaigouStore((s) => s.myShipRecords)
  const addCustomer = useDaigouStore((s) => s.addCustomer)
  const updateCustomer = useDaigouStore((s) => s.updateCustomer)
  const bulkImportCustomersFromLinePaste = useDaigouStore((s) => s.bulkImportCustomersFromLinePaste)
  const addToast = useDaigouStore((s) => s.addToast)
  const [q, setQ] = useState('')
  const [linePaste, setLinePaste] = useState('')
  const [skipDupLineImport, setSkipDupLineImport] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Customer>>({
    name: '',
    lineDisplayName: '',
    phoneLast3: '000',
    socialAccount: '',
    tags: [],
    riskScore: 20,
    pickupReliability: 80,
    totalOrders: 0,
    totalUnpaidBalance: 0,
    notes: '',
    lookupPin: '',
    bankLastFiveCodes: [],
  })

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return customers.filter((c) => {
      if (needle) {
        const hay = customerSearchHay(c)
        const textOk = hay.includes(needle)
        const bankOk = customerMatchesBankLastFiveQuery(c.bankLastFiveCodes, q)
        if (!textOk && !bankOk) return false
      }
      if (dashHighRisk && computeRiskScore(c, orders, myShipRecords) < 55) return false
      return true
    })
  }, [customers, q, dashHighRisk, orders, myShipRecords])

  const lineImportPreview = useMemo(
    () => countLineImportAgainstExisting(linePaste, customers, skipDupLineImport),
    [linePaste, customers, skipDupLineImport],
  )

  function runLineImport() {
    if (!linePaste.trim()) {
      addToast('請先貼上名單', 'err')
      return
    }
    bulkImportCustomersFromLinePaste(linePaste, { skipDuplicates: skipDupLineImport })
    setLinePaste('')
  }

  function exportBalances() {
    const rows: (string | number)[][] = [
      ['客戶姓名', 'LINE 顯示名', '手機末三碼', '銀行後五碼', '風險分數', '未結餘額', '備註'],
      ...filtered.map((c) => [
        c.name,
        c.lineDisplayName,
        c.phoneLast3,
        normalizeBankLastFiveCodes(c.bankLastFiveCodes).join(' / '),
        computeRiskScore(c, orders, myShipRecords),
        c.totalUnpaidBalance,
        c.notes,
      ]),
    ]
    downloadCsv('客戶餘額.csv', rows)
    addToast('已匯出客戶餘額 CSV', 'ok')
  }

  function toggleTag(tag: CustomerTag) {
    setForm((f) => {
      const cur = f.tags ?? []
      const has = cur.includes(tag)
      return { ...f, tags: has ? cur.filter((t) => t !== tag) : [...cur, tag] }
    })
  }

  function submit() {
    if (!form.name?.trim()) {
      addToast('請填姓名', 'err')
      return
    }
    const pin = normalizeLookupPin(form.lookupPin ?? '')
    if (pin && !isValidLookupPin(pin)) {
      addToast('查單密碼須為 4 位數字', 'err')
      return
    }
    addCustomer({
      name: form.name!,
      lineDisplayName: form.lineDisplayName || `LINE_${form.name}`,
      phoneLast3: form.phoneLast3 || '000',
      socialAccount: form.socialAccount || '',
      tags: form.tags ?? [],
      riskScore: Number(form.riskScore) || 0,
      pickupReliability: Number(form.pickupReliability) || 50,
      totalOrders: Number(form.totalOrders) || 0,
      totalUnpaidBalance: Number(form.totalUnpaidBalance) || 0,
      notes: form.notes || '',
      lookupPin: isValidLookupPin(pin) ? pin : undefined,
      bankLastFiveCodes: normalizeBankLastFiveCodes(form.bankLastFiveCodes),
    })
    setOpen(false)
  }

  return (
    <div className="customers-page">
      <PageHeader
        title="客戶列表"
        subtitle="可搜尋姓名、LINE、末三碼、銀行後五碼。查單密碼為 4 位數字；未填則沿用伺服器預設（不寫在網站程式裡）。"
        action={
          <>
            <Btn variant="secondary" onClick={exportBalances}>
              匯出餘額 CSV
            </Btn>
            <Btn onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              新增客戶
            </Btn>
          </>
        }
      />

      {dashHighRisk ? (
        <div className="customers-import mb-4" style={{ borderColor: '#ecd4a8', background: '#fffaf0' }}>
          已套用總覽穿透篩選：高風險客戶（分數≥55）
          <Link to="/customers" className="ml-3 font-semibold underline" style={{ color: '#3d6f96' }}>
            清除
          </Link>
        </div>
      ) : null}

      <div className="customers-toolbar">
        <div className="customers-search">
          <Search className="customers-search-icon" aria-hidden />
          <input
            placeholder="搜尋姓名、LINE、末三碼、銀行後五碼…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="customers-import">
        <div className="flex flex-wrap items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: '#eaf4fc', color: 'var(--cu-accent)' }}
          >
            <Users className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="customers-import-title">從 LINE 群組／名單匯入</h2>
            <p className="customers-import-desc">
              一行一位顯示名；或 Tab／逗號分隔「顯示名、本名、手機末三碼」。新客戶未填查單密碼時，正式站沿用 Apps Script 的預設密碼。
            </p>
            <textarea
              placeholder={'小葵\n阿哲 678\n熊貓哥\t王小明\t0912345678'}
              value={linePaste}
              onChange={(e) => setLinePaste(e.target.value)}
              spellCheck={false}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--cu-muted)' }}>
              <input
                type="checkbox"
                checked={skipDupLineImport}
                onChange={(e) => setSkipDupLineImport(e.target.checked)}
              />
              略過與現有客戶重複的 LINE 顯示名
            </label>
            {linePaste.trim() ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--cu-soft)' }}>
                解析 {lineImportPreview.parsed} 筆 → 將新增 {lineImportPreview.wouldAdd} 人
                {lineImportPreview.duplicatesVsExisting > 0
                  ? `，略過重複 ${lineImportPreview.duplicatesVsExisting}`
                  : ''}
              </p>
            ) : null}
            <Btn variant="secondary" className="mt-2" onClick={runLineImport} disabled={!linePaste.trim()}>
              <Users className="h-4 w-4" />
              匯入客戶
            </Btn>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty title="沒有客戶" description="建立第一位客戶以開始接單。" action={<Btn onClick={() => setOpen(true)}>新增客戶</Btn>} />
      ) : (
        <div className="customers-grid">
          {filtered.map((c) => {
            const initial = (c.name?.trim()?.[0] ?? '?').toUpperCase()
            const banks = normalizeBankLastFiveCodes(c.bankLastFiveCodes)
            const memoAdj = hasOpenBalanceMemos(c.balanceMemos) ? sumOpenMemoAdjust(c.balanceMemos) : 0

            return (
              <article
                key={c.id}
                className="customer-card"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a, button, input, textarea, label, .cu-bank')) return
                  navigate(`/customers/${c.id}`)
                }}
              >
                <div className="customer-card-top">
                  <div className="customer-avatar" aria-hidden>
                    {initial}
                  </div>
                  <div className="customer-main">
                    <p className="customer-name">{c.name}</p>
                    <p className="customer-sub">
                      {c.lineDisplayName}
                      {c.phoneLast3 ? ` · 末三碼 ${c.phoneLast3}` : ''}
                    </p>
                    <div className="customer-chips">
                      <label className="customer-joined-edit" onClick={(e) => e.stopPropagation()}>
                        <span>加入</span>
                        <input
                          type="date"
                          value={toJoinedDateInput(c.createdAt)}
                          onChange={(e) => updateCustomer(c.id, { createdAt: fromJoinedDateInput(e.target.value) })}
                          aria-label="加入時間"
                        />
                      </label>
                      {hasOpenBalanceMemos(c.balanceMemos) ? (
                        <span className="customer-chip customer-chip--warn">
                          帳務
                          {memoAdj !== 0
                            ? memoAdj > 0
                              ? ` +NT$${memoAdj.toLocaleString()}`
                              : ` -NT$${Math.abs(memoAdj).toLocaleString()}`
                            : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {c.totalUnpaidBalance > 0 ? (
                    <div className="customer-stats">
                      <p className="customer-stats-due">未結 NT$ {c.totalUnpaidBalance.toLocaleString()}</p>
                    </div>
                  ) : null}
                </div>

                <CustomerBankLastFiveEditor
                  variant="compact"
                  codes={banks}
                  onChange={(next) => updateCustomer(c.id, { bankLastFiveCodes: next })}
                />

                <CustomerNoteField
                  compact
                  value={c.customerNote}
                  onSave={(next) => updateCustomer(c.id, { customerNote: next })}
                />

                <div className="customer-actions">
                  <Btn to={`/customers/${c.id}`} variant="secondary" className="!py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    開啟詳情
                  </Btn>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal open={open} title="新增客戶" onClose={() => setOpen(false)}>
        <div className="space-y-4 text-body">
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">姓名</span>
            <input className="mt-2 w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">LINE 顯示名</span>
            <input
              className="mt-2 w-full"
              value={form.lineDisplayName}
              onChange={(e) => setForm((f) => ({ ...f, lineDisplayName: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">手機末三碼</span>
            <input className="mt-2 w-full" maxLength={3} value={form.phoneLast3} onChange={(e) => setForm((f) => ({ ...f, phoneLast3: e.target.value }))} />
          </label>
          <CustomerBankLastFiveEditor
            codes={form.bankLastFiveCodes}
            onChange={(next) => setForm((f) => ({ ...f, bankLastFiveCodes: next }))}
          />
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">查單密碼（4 位數，可留空）</span>
            <input
              className="mt-2 w-full max-w-[8rem] font-mono text-lg tracking-widest text-ds-text"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="4 位數"
              value={form.lookupPin ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, lookupPin: normalizeLookupPin(e.target.value) }))}
            />
          </label>
          <div>
            <p className="text-meta font-semibold text-ds-text-secondary">標籤</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allTags.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-meta text-ds-text-secondary">
                  <input type="checkbox" checked={(form.tags ?? []).includes(t)} onChange={() => toggleTag(t)} />
                  {CUSTOMER_TAG_LABEL[t]}
                </label>
              ))}
            </div>
          </div>
          <Btn className="w-full" onClick={submit}>
            建立客戶
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
