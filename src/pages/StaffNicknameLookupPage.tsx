import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'
import { Btn, Card, Chip, Empty, PageHeader } from '../components/ui'
import { DataRowCard } from '../components/app/DataRowCard'
import { SectionHeader } from '../components/app/SectionHeader'
import { cx } from '../components/app/cx'
import { StaffLookupMemberPreview } from './staffLookup/StaffLookupMemberPreview'
import { staffNicknameLookup } from '../daigou/portalSearch'
import { useDaigouStore } from '../daigou/store'
import {
  MEMBERSHIP_TIER_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  TRANSACTION_CATEGORY_LABEL,
  TRANSACTION_TYPE_LABEL,
} from '../daigou/constants'
import type { Customer, Order, OrderStatus, PaymentStatus, Transaction } from '../daigou/types'

type LookupView = 'staff' | 'member'

const ABANDONED_ORDER: OrderStatus[] = ['cancelled', 'stockout_refund', 'risk_flagged']

const DEFERRED_PAYMENT: PaymentStatus[] = ['unpaid', 'deposit_paid', 'balance_due', 'bad_debt']

function isAbandoned(o: Order) {
  return ABANDONED_ORDER.includes(o.orderStatus)
}

function sortOrdersDesc(a: Order, b: Order) {
  return (b.createdAt ?? 0) - (a.createdAt ?? 0)
}

function formatTs(ms: number) {
  try {
    return new Date(ms).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(ms)
  }
}

function orderOutstanding(o: Order) {
  if (o.outstandingAmount != null) return Math.max(0, o.outstandingAmount)
  return Math.max(0, o.totalAmount - (o.totalReceived ?? 0))
}

function orderStatusChipTone(s: OrderStatus): 'info' | 'ok' | 'warn' | 'neutral' | 'bad' {
  if (s === 'completed' || s === 'shipped') return 'ok'
  if (s === 'cancelled' || s === 'risk_flagged') return 'bad'
  if (s === 'waiting_balance' || s === 'waiting_deposit' || s === 'stockout_refund') return 'warn'
  if (s === 'pending_confirmation') return 'neutral'
  return 'info'
}

function paymentChipTone(p: PaymentStatus): 'ok' | 'warn' | 'info' | 'bad' | 'neutral' {
  if (p === 'fully_paid' || p === 'overpaid') return 'ok'
  if (p === 'balance_due' || p === 'deposit_paid') return 'warn'
  if (p === 'refunded' || p === 'bad_debt') return 'bad'
  if (p === 'unpaid') return 'neutral'
  return 'info'
}

function OrderRowLink({ o }: { o: Order }) {
  const outstanding = orderOutstanding(o)
  const noteLine = [o.internalNote, o.notes, o.customerNote].filter(Boolean).join(' · ') || '—'

  return (
    <Link to={`/orders/${o.id}`} className="block">
      <DataRowCard glow="none">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-base font-bold tracking-tight text-ds-primary">{o.lookupCode}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip tone={orderStatusChipTone(o.orderStatus)}>{ORDER_STATUS_LABEL[o.orderStatus]}</Chip>
              <Chip tone={paymentChipTone(o.paymentStatus)}>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</Chip>
              {outstanding > 0 ? (
                <Chip tone="warn">未收 NT$ {outstanding.toLocaleString()}</Chip>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-meta text-ds-text-muted">{noteLine}</p>
          </div>
          <span className="shrink-0 text-meta text-ds-text-muted">{formatTs(o.createdAt)}</span>
        </div>
      </DataRowCard>
    </Link>
  )
}

function TxRowStatic({ t }: { t: Transaction }) {
  return (
    <DataRowCard glow="none" clickable={false} role="presentation">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="neutral">{TRANSACTION_TYPE_LABEL[t.type]}</Chip>
            <span className="text-body text-ds-text">{TRANSACTION_CATEGORY_LABEL[t.category]}</span>
            <span className="font-mono text-body font-semibold tabular-nums text-ds-text">
              {t.amount.toLocaleString()} {t.currency}
            </span>
            {t.orderId ? (
              <Link className="text-meta font-semibold text-ds-primary hover:underline" to={`/orders/${t.orderId}`}>
                訂單
              </Link>
            ) : null}
          </div>
          {t.note ? <p className="mt-2 text-meta text-ds-text-secondary">{t.note}</p> : null}
        </div>
        <span className="shrink-0 text-meta text-ds-text-muted">{t.date}</span>
      </div>
    </DataRowCard>
  )
}

export function StaffNicknameLookupPage() {
  const orders = useDaigouStore((s) => s.orders)
  const customers = useDaigouStore((s) => s.customers)
  const groups = useDaigouStore((s) => s.groups)
  const transactions = useDaigouStore((s) => s.transactions)
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [view, setView] = useState<LookupView>('staff')

  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  const result = useMemo(() => staffNicknameLookup({ orders, customers }, q), [orders, customers, q])

  const byCustomer = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of result.orders) {
      const arr = map.get(o.customerId) ?? []
      arr.push(o)
      map.set(o.customerId, arr)
    }
    for (const arr of map.values()) arr.sort(sortOrdersDesc)
    return map
  }, [result.orders])

  const txByCustomer = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const cid = t.customerId
      if (!cid) continue
      const arr = map.get(cid) ?? []
      arr.push(t)
      map.set(cid, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const da = new Date(a.date).getTime()
        const db = new Date(b.date).getTime()
        if (db !== da) return db - da
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })
    }
    return map
  }, [transactions])

  function runSearch() {
    setQ(draft.trim())
  }

  const customerRows = useMemo((): Customer[] => {
    if (result.customers.length > 0) return result.customers
    const ids = [...new Set(result.orders.map((o) => o.customerId))]
    return ids.map((id) => customers.find((c) => c.id === id)).filter((c): c is Customer => Boolean(c))
  }, [result.customers, result.orders, customers])

  return (
    <div className="space-y-6">
      <PageHeader
        title="暱稱查單（後台）"
        subtitle="後台視圖可看內部備註與金流；會員視圖為站內預覽（摹擬對外查單），無需另開公開查詢頁。"
        action={
          <div
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
            role="group"
            aria-label="查詢結果呈現方式"
          >
            <div className="flex rounded-xl border border-white/[0.08] bg-ds-card/45 p-1 shadow-inner">
              <button
                type="button"
                className={cx(
                  'rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition sm:py-2',
                  view === 'staff'
                    ? 'bg-ds-primary/22 text-ds-text shadow-[0_0_20px_rgba(91,140,255,0.18)]'
                    : 'text-ds-text-secondary hover:bg-white/[0.05] hover:text-ds-text',
                )}
                onClick={() => setView('staff')}
              >
                後台視圖
              </button>
              <button
                type="button"
                className={cx(
                  'rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition sm:py-2',
                  view === 'member'
                    ? 'bg-ds-primary/22 text-ds-text shadow-[0_0_20px_rgba(91,140,255,0.18)]'
                    : 'text-ds-text-secondary hover:bg-white/[0.05] hover:text-ds-text',
                )}
                onClick={() => setView('member')}
              >
                會員視圖（預覽）
              </button>
            </div>
          </div>
        }
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-meta font-semibold text-ds-text-secondary">暱稱、末三碼、查詢碼或社群帳號</span>
          <input
            className="mt-2 w-full"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch()
            }}
            placeholder="例：LINE 暱稱、手機末三碼、查詢碼"
          />
        </label>
        <Btn type="button" onClick={runSearch}>
          <Search className="h-4 w-4" />
          搜尋
        </Btn>
      </Card>

      {!q ? (
        <Empty
          icon={ClipboardList}
          title="輸入關鍵字後搜尋"
          hint="搜尋後可用右上角切換「會員視圖」預覽對外版面（仍在本頁）。對外正式連結請用側欄「暱稱查單（會員）」。"
        />
      ) : result.orders.length === 0 ? (
        <Empty title="查無資料" hint="請確認暱稱、末三碼或查詢碼是否正確。" />
      ) : (
        <div className="space-y-8">
          <p className="text-body text-ds-text-secondary">
            {result.matchKind === 'lookup_code' ? '依查詢碼命中' : '依客戶欄位命中'} · 共 {result.orders.length} 筆訂單
            {customerRows.length > 1 ? ` · ${customerRows.length} 位客戶` : ''}
            {view === 'member' ? ' · 目前為會員視圖預覽' : ''}
          </p>

          {customerRows.map((c) => {
            const custOrders = byCustomer.get(c.id) ?? []
            const purchases = custOrders.filter((o) => !isAbandoned(o))
            const abandoned = custOrders.filter((o) => isAbandoned(o))
            const deferred = custOrders.filter((o) => DEFERRED_PAYMENT.includes(o.paymentStatus))
            const txs = txByCustomer.get(c.id) ?? []
            const tier = c.membershipTierId ?? 'regular'

            return (
              <Card key={c.id} className="space-y-6 !p-4 md:!p-6">
                <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-section font-semibold text-ds-text">{c.lineDisplayName}</h2>
                      <Chip tone="neutral">{MEMBERSHIP_TIER_LABEL[tier]}</Chip>
                      {(c.totalCancelledOrders ?? 0) > 0 ? (
                        <Chip tone="warn">歷史取消 {c.totalCancelledOrders} 單</Chip>
                      ) : null}
                    </div>
                    <p className="mt-1 text-body text-ds-text-secondary">
                      {c.name}
                      {c.realName ? `（${c.realName}）` : ''} · 末三碼 {c.phoneLast3}
                      {c.socialAccount?.trim() ? ` · ${c.socialAccount}` : ''}
                    </p>
                  </div>
                  <Link className="text-body font-semibold text-ds-primary hover:underline" to={`/customers/${c.id}`}>
                    客戶詳情 →
                  </Link>
                </div>

                {view === 'member' ? (
                  <div className="max-h-[min(72vh,860px)] overflow-y-auto overflow-x-hidden rounded-xl">
                    <StaffLookupMemberPreview lineDisplayName={c.lineDisplayName} orders={custOrders} groupsById={groupsById} />
                  </div>
                ) : (
                  <>
                    <div>
                      <SectionHeader title="購買紀錄（未取消／未完成棄單流程）" className="!mb-3 !sm:mb-4" />
                      {purchases.length === 0 ? (
                        <p className="text-body text-ds-text-secondary">無有效訂單。</p>
                      ) : (
                        <div className="space-y-2">
                          {purchases.map((o) => (
                            <OrderRowLink key={o.id} o={o} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <SectionHeader title="棄單／取消／風險" className="!mb-3 !sm:mb-4" />
                      {abandoned.length === 0 ? (
                        <p className="text-body text-ds-text-secondary">無此類訂單。</p>
                      ) : (
                        <div className="space-y-2">
                          {abandoned.map((o) => (
                            <OrderRowLink key={o.id} o={o} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <SectionHeader title="付款與延後／待收尾款" className="!mb-3 !sm:mb-4" />
                      <p className="-mt-4 mb-3 text-meta text-ds-text-muted sm:-mt-6">
                        含未付、訂金已付待尾款、應收尾款、呆帳等（同一筆可能同時列於購買紀錄）。
                      </p>
                      {deferred.length === 0 ? (
                        <p className="text-body text-ds-text-secondary">目前無待處理付款狀態。</p>
                      ) : (
                        <div className="space-y-2">
                          {deferred.map((o) => (
                            <OrderRowLink key={o.id} o={o} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <SectionHeader title="金流入帳紀錄（此客戶）" className="!mb-3 !sm:mb-4" />
                      {txs.length === 0 ? (
                        <p className="text-body text-ds-text-secondary">尚無關聯分錄。</p>
                      ) : (
                        <div className="space-y-2">
                          {txs.slice(0, 40).map((t) => (
                            <TxRowStatic key={t.id} t={t} />
                          ))}
                          {txs.length > 40 ? (
                            <p className="text-meta text-ds-text-muted">僅顯示最近 40 筆；完整列表請至記帳依客戶篩選。</p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
