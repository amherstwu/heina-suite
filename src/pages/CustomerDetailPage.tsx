import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Btn, Card, Chip, Empty, PageHeader } from '../components/ui'
import { DataRowCard } from '../components/app/DataRowCard'
import { ActivityTimeline, type ActivityItem } from '../components/app/ActivityTimeline'
import { useDaigouStore } from '../daigou/store'
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  TRANSACTION_CATEGORY_LABEL,
} from '../daigou/constants'
import {
  CustomerBalanceMemoDetailSection,
} from '../components/customers/CustomerBalanceMemoPanel'
import { normalizeBankLastFiveCodes } from '../daigou/customerBankLastFive'
import { CustomerBankLastFiveEditor } from '../components/customers/CustomerBankLastFiveEditor'
import { isValidLookupPin, normalizeLookupPin, effectiveLookupPin } from '../daigou/portalLookupAuth'

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

export function CustomerDetailPage() {
  const { id } = useParams()
  const customers = useDaigouStore((s) => s.customers)
  const orders = useDaigouStore((s) => s.orders)
  const transactions = useDaigouStore((s) => s.transactions)
  const shipmentRecords = useDaigouStore((s) => s.shipmentRecords)
  const myShipRecords = useDaigouStore((s) => s.myShipRecords)
  const auditLogs = useDaigouStore((s) => s.auditLogs)
  const groups = useDaigouStore((s) => s.groups)
  const updateCustomer = useDaigouStore((s) => s.updateCustomer)
  const addToast = useDaigouStore((s) => s.addToast)
  const [notesDraft, setNotesDraft] = useState('')
  const [customerNoteDraft, setCustomerNoteDraft] = useState('')
  const [lookupPinDraft, setLookupPinDraft] = useState('')

  const c = customers.find((x) => x.id === id)

  const custOrders = useMemo(
    () => orders.filter((o) => o.customerId === id).sort((a, b) => b.createdAt - a.createdAt),
    [orders, id],
  )

  const custTx = useMemo(
    () => transactions.filter((t) => t.customerId === id).sort((a, b) => b.createdAt - a.createdAt),
    [transactions, id],
  )

  const custShip = useMemo(() => shipmentRecords.filter((r) => r.customerId === id), [shipmentRecords, id])

  const custMyShip = useMemo(() => myShipRecords.filter((r) => r.customerId === id), [myShipRecords, id])

  const riskLogs = useMemo(
    () =>
      auditLogs
        .filter((l) => l.entityType === 'order' && custOrders.some((o) => o.id === l.entityId))
        .slice(0, 20),
    [auditLogs, custOrders],
  )

  const activities: ActivityItem[] = useMemo(() => {
    const fromAudit: ActivityItem[] = riskLogs.map((l) => ({
      id: l.id,
      title: l.action,
      subtitle: l.entityType,
      meta: new Date(l.createdAt).toLocaleString(),
      tone: 'neutral' as const,
    }))
    const fromTx: ActivityItem[] = custTx.slice(0, 12).map((t) => ({
      id: t.id,
      title: TRANSACTION_CATEGORY_LABEL[t.category],
      subtitle: `NT$ ${t.amount}`,
      meta: t.date,
      tone: t.type === 'income' ? ('in' as const) : t.type === 'expense' ? ('out' as const) : ('neutral' as const),
    }))
    return [...fromAudit, ...fromTx].slice(0, 18)
  }, [riskLogs, custTx])

  useEffect(() => {
    if (!c) return
    setNotesDraft(c.notes)
    setCustomerNoteDraft(c.customerNote ?? '')
    setLookupPinDraft(effectiveLookupPin(c.lookupPin))
  }, [c?.id, c?.notes, c?.customerNote, c?.lookupPin])

  if (!c) {
    return (
      <div>
        <Link to="/customers" className="mb-4 inline-flex text-sm font-semibold text-ds-primary hover:underline">
          ← 返回客戶
        </Link>
        <Empty title="找不到客戶" hint="請從客戶列表進入。" />
      </div>
    )
  }

  const banks = normalizeBankLastFiveCodes(c.bankLastFiveCodes)

  return (
    <div>
      <Link
        to="/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ds-primary hover:text-ds-highlight hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        返回客戶列表
      </Link>

      <PageHeader
        title={c.name}
        subtitle={`${c.lineDisplayName} · 末三碼 ${c.phoneLast3}${
          banks.length ? ` · 後五碼 ${banks.join(' / ')}` : ''
        }`}
        action={
          <>
            <Btn
              variant="secondary"
              onClick={() => {
                const hasBl = c.tags.includes('blacklist')
                updateCustomer(c.id, {
                  tags: hasBl ? c.tags.filter((t) => t !== 'blacklist') : [...c.tags, 'blacklist'],
                })
                addToast(hasBl ? '已解除黑名單標籤' : '已標記黑名單', 'ok')
              }}
            >
              黑名單切換
            </Btn>
            <Btn to="/orders">建立訂單</Btn>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="!p-5 md:col-span-3">
          <CustomerBalanceMemoDetailSection customerId={c.id} memos={c.balanceMemos} />
        </Card>

        <Card className="!p-5 md:col-span-3">
          <p className="text-meta font-semibold text-ds-text-secondary">訂單自助查詢密碼</p>
          <p className="mt-1 text-sm text-ds-text-secondary">
            客人在「訂單自助查詢」須輸入此 4 位數密碼。未填時，正式站改由 Apps Script 指令碼屬性的預設密碼驗證，網站程式不保存該預設值。
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-meta font-semibold text-ds-text-secondary">
              查單密碼
              <input
                className="mt-1 block w-28 rounded-xl border border-white/[0.1] bg-ds-surface px-3 py-2 font-mono text-lg tracking-widest text-ds-text"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={lookupPinDraft}
                onChange={(e) => setLookupPinDraft(normalizeLookupPin(e.target.value))}
                placeholder="1234"
              />
            </label>
            <Btn
              variant="secondary"
              onClick={() => {
                const pin = normalizeLookupPin(lookupPinDraft)
                if (!isValidLookupPin(pin)) {
                  addToast('請輸入 4 位數密碼', 'err')
                  return
                }
                updateCustomer(c.id, { lookupPin: pin })
                addToast('已儲存查單密碼', 'ok')
              }}
            >
              儲存查單密碼
            </Btn>
            {c.lookupPin ? (
              <span className="text-meta font-mono font-semibold tracking-widest text-ds-success">
                目前密碼：{c.lookupPin}
              </span>
            ) : (
              <span className="text-meta font-mono font-semibold tracking-widest" style={{ color: '#6a635c' }}>
                尚未個別設定（正式站使用伺服器預設）
              </span>
            )}
          </div>
        </Card>

        <Card className="!p-5 md:col-span-3">
          <CustomerBankLastFiveEditor
            codes={c.bankLastFiveCodes}
            onChange={(next) => {
              updateCustomer(c.id, { bankLastFiveCodes: next })
            }}
          />
        </Card>

        <Card className="!p-5 md:col-span-3">
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">加入時間</span>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-ds-surface px-3 py-2.5 text-body text-ds-text"
              value={toJoinedDateInput(c.createdAt)}
              onChange={(e) => updateCustomer(c.id, { createdAt: fromJoinedDateInput(e.target.value) })}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-meta font-semibold text-ds-text-secondary">對客備註</span>
            <textarea
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-ds-surface px-3 py-2.5 text-body text-ds-text"
              rows={2}
              value={customerNoteDraft}
              onChange={(e) => setCustomerNoteDraft(e.target.value)}
              onBlur={() => {
                if (customerNoteDraft !== (c.customerNote ?? '')) {
                  updateCustomer(c.id, { customerNote: customerNoteDraft.trim() })
                }
              }}
              placeholder="客人查單、通知時可看到的備註"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-meta font-semibold text-ds-text-secondary">內部備註</span>
            <textarea
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-ds-surface px-3 py-2.5 text-body text-ds-text"
              rows={2}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== c.notes) updateCustomer(c.id, { notes: notesDraft })
              }}
              placeholder="聯絡習慣、取貨偏好等"
            />
          </label>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="!p-5">
          <h2 className="text-section font-semibold text-ds-text">訂單紀錄</h2>
          <div className="mt-4 space-y-2">
            {custOrders.length === 0 ? (
              <p className="text-meta text-ds-text-muted">尚無訂單</p>
            ) : (
              custOrders.slice(0, 8).map((o) => {
                const g = groups.find((x) => x.id === o.groupId)
                return (
                  <Link key={o.id} to={`/orders/${o.id}`}>
                    <DataRowCard glow="none">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-mono font-semibold text-ds-primary">{o.lookupCode}</span>
                        <span className="text-meta text-ds-text-muted">{g?.name}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Chip tone="neutral">{ORDER_STATUS_LABEL[o.orderStatus]}</Chip>
                        <Chip tone="warn">{PAYMENT_STATUS_LABEL[o.paymentStatus]}</Chip>
                      </div>
                    </DataRowCard>
                  </Link>
                )
              })
            )}
          </div>
        </Card>

        <Card className="!p-5">
          <h2 className="text-section font-semibold text-ds-text">付款／帳務</h2>
          <ul className="mt-4 divide-y divide-white/[0.06] text-body">
            {custTx.length === 0 ? (
              <li className="py-2 text-meta text-ds-text-muted">尚無帳務紀錄</li>
            ) : (
              custTx.slice(0, 10).map((t) => (
                <li key={t.id} className="flex justify-between py-2">
                  <span className="text-ds-text-secondary">{t.date}</span>
                  <span>{TRANSACTION_CATEGORY_LABEL[t.category]}</span>
                  <span className="font-mono tabular-nums">{t.amount}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="!p-5">
          <h2 className="text-section font-semibold text-ds-text">出貨紀錄</h2>
          <ul className="mt-4 space-y-2 text-meta text-ds-text-secondary">
            {custShip.length === 0 ? (
              <li>尚無出貨紀錄</li>
            ) : (
              custShip.map((r) => (
                <li key={r.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  {r.status} · {r.trackingNo || '無單號'} · {r.updatedAt?.slice(0, 10)}
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card className="!p-5">
          <h2 className="text-section font-semibold text-ds-text">賣貨便</h2>
          <ul className="mt-4 space-y-2 text-meta text-ds-text-secondary">
            {custMyShip.length === 0 ? (
              <li>尚無賣貨便紀錄</li>
            ) : (
              custMyShip.map((r) => (
                <li key={r.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  {r.status} · {r.receiverStoreName} · 期限 {r.pickupDeadline ?? '—'}
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card className="!p-5">
        <ActivityTimeline items={activities} title="活動與帳務時間軸" />
      </Card>
    </div>
  )
}
