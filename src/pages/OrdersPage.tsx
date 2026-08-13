import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Card, Btn, PageHeader, Chip, Modal, Empty } from '../components/ui'
import { useApi } from '../context/useApi'
import type { GroupBuyAppData } from '../api/types'
import { syncV50GroupOrdersToDaigou } from '../modules/groupbuy/v50DaigouSync'
import {
  classifyDaigouOrder,
  groupOrdersByCustomerName,
  groupOrdersByGroupId,
  getOrderShippingReminder,
  isV50CodPayment,
  isV50GroupEnded,
  normalizeGroupStatus,
  ORDER_BUCKET_LABELS,
  type DaigouOrderBucket,
} from '../modules/groupbuy/v50Utils'
import { extractV50OrderIdFromDaigou } from '../modules/groupbuy/v50OrderLookup'
import { isV50CodSyncedOrder } from '../daigou/commercialDashboard'
import { dueDepositAmount } from './staffLookup/previewUtils'
import { useDaigouStore } from '../daigou/store'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../daigou/constants'
import type { OrderItem, Order, OrderStatus, PaymentStatus, Customer } from '../daigou/types'
import { downloadCsv } from '../daigou/csv'
import {
  customerNamesEqual,
  customerRecordMatchesName,
  normalizeCustomerNameKey,
  orderBelongsToCustomerName,
} from '../modules/groupbuy/customerNameKey'
import '../modules/groupbuy/groupbuy.css'

function orderOutstandingAmount(o: { totalAmount: number; totalReceived?: number; outstandingAmount?: number }) {
  if (o.outstandingAmount != null) return Math.max(0, o.outstandingAmount)
  return Math.max(0, o.totalAmount - (o.totalReceived ?? 0))
}

/** 依客人顯示名找出 customerId（僅精確符合，避免「如」誤中其他人） */
function customerIdsMatchingNameExact(customers: Customer[], query: string): Set<string> {
  const ids = new Set<string>()
  if (!normalizeCustomerNameKey(query)) return ids
  for (const c of customers) {
    if (customerRecordMatchesName(c, query, 'exact')) ids.add(c.id)
  }
  return ids
}

/** 催款穿透：以團務未付訂單 ID 為準，且人名必須精確勾稽 */
function orderMatchesDepositCustomer(
  o: Order,
  c: Customer | undefined,
  query: string,
  matchedCustomerIds: Set<string>,
  v50OrderIdsForCustomer: Set<string> | null,
  syncReady: boolean,
) {
  if (!normalizeCustomerNameKey(query)) return true
  // 同步完成後：只准出現團務名單上的未付訂單，且姓名精確相符
  if (syncReady && v50OrderIdsForCustomer) {
    const v50Id = extractV50OrderIdFromDaigou(o)
    const inWhitelist =
      (v50Id != null && v50OrderIdsForCustomer.has(v50Id)) || v50OrderIdsForCustomer.has(o.id)
    if (!inWhitelist) return false
    return orderBelongsToCustomerName(o, query, c, matchedCustomerIds)
  }
  return orderBelongsToCustomerName(o, query, c, matchedCustomerIds)
}

const TAB_LABELS = ORDER_BUCKET_LABELS

function orderPaymentRowLabel(paymentStatus: PaymentStatus): string {
  if (paymentStatus === 'unpaid') return '未付款'
  return PAYMENT_STATUS_LABEL[paymentStatus]
}

function orderPaymentRowTone(paymentStatus: PaymentStatus): 'pending' | 'warn' | 'ok' | 'neutral' {
  if (paymentStatus === 'unpaid') return 'pending'
  if (paymentStatus === 'fully_paid' || paymentStatus === 'overpaid') return 'ok'
  if (paymentStatus === 'balance_due' || paymentStatus === 'deposit_paid') return 'warn'
  return 'neutral'
}

function orderRowAmount(o: Order, tab: DaigouOrderBucket) {
  if (tab === 'ended') {
    return {
      label: '已結清',
      amount: Number(o.totalReceived ?? o.totalAmount) || 0,
      tone: 'ok' as const,
    }
  }
  if (tab === 'pending') {
    return {
      label: '應付訂金',
      amount: dueDepositAmount(o),
      tone: o.paymentStatus === 'unpaid' ? ('due' as const) : ('balance' as const),
    }
  }
  return {
    label: '尾款',
    amount: Number(o.balance) || 0,
    tone: o.paymentStatus === 'unpaid' ? ('due' as const) : ('balance' as const),
  }
}

function tabMetricThirdLabel(tab: DaigouOrderBucket) {
  if (tab === 'pending') return '待付訂金合計'
  if (tab === 'ended') return '已結清合計'
  return '待補尾款合計'
}

export function OrdersPage() {
  const navigate = useNavigate()
  const api = useApi()
  const [searchParams] = useSearchParams()
  const dash = searchParams.get('dash') ?? ''
  const statusDash = (searchParams.get('st') ?? '') as OrderStatus | ''
  const queryFromUrl = searchParams.get('q')?.trim() || ''
  const customerFromUrl = searchParams.get('customer')?.trim() || ''

  const orders = useDaigouStore((s) => s.orders)
  const customers = useDaigouStore((s) => s.customers)
  const groups = useDaigouStore((s) => s.groups)
  const products = useDaigouStore((s) => s.products)
  const shipments = useDaigouStore((s) => s.shipments)
  const addOrder = useDaigouStore((s) => s.addOrder)
  const addToast = useDaigouStore((s) => s.addToast)
  const [q, setQ] = useState(queryFromUrl || customerFromUrl)
  const [customerFilter, setCustomerFilter] = useState(customerFromUrl)
  const [orderTab, setOrderTab] = useState<DaigouOrderBucket>('pending')
  /** 團務端「此客人未付款」的 V50 訂單 id，供穿透時對齊（不依賴客單名字欄位） */
  const [v50UnpaidIdsForCustomer, setV50UnpaidIdsForCustomer] = useState<Set<string> | null>(null)
  const [syncReady, setSyncReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [custId, setCustId] = useState(customers[0]?.id ?? '')
  const [grpId, setGrpId] = useState(groups[0]?.id ?? '')
  const [dom, setDom] = useState(0)
  const [intl, setIntl] = useState(80)
  const [notes, setNotes] = useState('')
  const [pay, setPay] = useState<PaymentStatus>('unpaid')
  const [ord, setOrd] = useState<OrderStatus>('pending_confirmation')
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([{ productId: '', qty: 1 }])
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())

  const refreshFromGroupbuy = useCallback(async () => {
    setSyncReady(false)
    try {
      const data = await api.call<GroupBuyAppData>({ module: 'groupbuy', action: 'getAppData' })
      for (const g of data.groups || []) syncV50GroupOrdersToDaigou(g)

      const want = (customerFromUrl || '').trim()
      if (want && dash === 'wait-deposit') {
        const ids = new Set<string>()
        for (const g of data.groups || []) {
          if (normalizeGroupStatus(g.status) === '已結束') continue
          for (const o of g.orders || []) {
            const pay = String(o.paymentStatus || '').trim()
            if (isV50CodPayment(pay) || pay !== '未付款') continue
            // 只精確符合客人姓名（「如」不可誤中「小聖」或其他人）
            if (!customerNamesEqual(o.customerName, want)) continue
            ids.add(String(o.id))
          }
        }
        setV50UnpaidIdsForCustomer(ids)
      } else {
        setV50UnpaidIdsForCustomer(null)
      }
    } catch (e) {
      console.error(e)
      setV50UnpaidIdsForCustomer(null)
    } finally {
      setSyncReady(true)
    }
  }, [api, customerFromUrl, dash])

  useEffect(() => {
    void refreshFromGroupbuy()
  }, [refreshFromGroupbuy])

  useEffect(() => {
    if (queryFromUrl || customerFromUrl) setQ(queryFromUrl || customerFromUrl)
    setCustomerFilter(customerFromUrl)
    if (dash === 'wait-deposit' || dash === 'pending') setOrderTab('pending')
    if (dash === 'wait-balance') setOrderTab('processed')
  }, [dash, queryFromUrl, customerFromUrl])

  const grpProducts = useMemo(() => products.filter((p) => p.groupId === grpId), [products, grpId])
  const grpById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const customersById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const matchedCustomerIds = useMemo(
    () => customerIdsMatchingNameExact(customers, customerFilter),
    [customers, customerFilter],
  )

  const bucketCounts = useMemo(() => {
    const counts: Record<DaigouOrderBucket, number> = { pending: 0, processed: 0, ended: 0 }
    for (const o of orders) {
      const g = grpById.get(o.groupId)
      const bucket = classifyDaigouOrder(o.paymentStatus, g?.internalNotes, o.orderStatus)
      counts[bucket] += 1
    }
    return counts
  }, [orders, grpById])

  const filtered = useMemo(() => {
    const qn = normalizeCustomerNameKey(q)
    const customerWant = normalizeCustomerNameKey(customerFilter)
    const waitDeposit = dash === 'wait-deposit'

    return orders.filter((o) => {
      const c = customersById.get(o.customerId)
      const g = grpById.get(o.groupId)
      const bucket = classifyDaigouOrder(o.paymentStatus, g?.internalNotes, o.orderStatus)

      // 待收訂金／催款：只看未付款；排除貨到付款、已結束團務
      if (waitDeposit) {
        if (o.paymentStatus !== 'unpaid' || isV50CodSyncedOrder(o)) return false
        if (isV50GroupEnded(g?.internalNotes)) return false
      } else if (bucket !== orderTab) {
        return false
      }

      if (customerWant) {
        if (
          !orderMatchesDepositCustomer(
            o,
            c,
            customerFilter,
            matchedCustomerIds,
            v50UnpaidIdsForCustomer,
            syncReady,
          )
        ) {
          return false
        }
      } else if (qn) {
        // 人名搜尋：優先精確勾稽；單字元僅精確，避免誤中
        if (qn.length <= 1) {
          if (!orderBelongsToCustomerName(o, q, c, matchedCustomerIds)) return false
        } else {
          const exactPerson = orderBelongsToCustomerName(o, q, c, matchedCustomerIds)
          if (exactPerson) {
            // 精確人名命中即可
          } else {
            const hay = normalizeCustomerNameKey(
              `${o.lookupCode} ${c?.name ?? ''} ${c?.lineDisplayName ?? ''} ${g?.name ?? ''}`,
            )
            const looseName = customerRecordMatchesName(c, q, 'includes')
            if (!hay.includes(qn) && !looseName) return false
          }
        }
      }

      if (dash === 'pending' && o.orderStatus !== 'pending_confirmation') return false
      if (
        dash === 'wait-balance' &&
        (!['balance_due', 'deposit_paid'].includes(o.paymentStatus) || isV50CodSyncedOrder(o))
      )
        return false
      if (
        dash === 'unshipped' &&
        !(
          ['fully_paid', 'ready_to_ship'].includes(o.orderStatus) &&
          !['shipped', 'completed', 'cancelled'].includes(o.orderStatus)
        )
      )
        return false
      if (dash === 'outstanding' && orderOutstandingAmount(o) <= 0) return false
      if (dash === 'collect' && o.balance <= 0) return false
      if (dash === 'status' && statusDash && o.orderStatus !== statusDash) return false
      return true
    })
  }, [
    orders,
    customersById,
    grpById,
    q,
    customerFilter,
    matchedCustomerIds,
    v50UnpaidIdsForCustomer,
    syncReady,
    dash,
    statusDash,
    orderTab,
  ])

  const customerGroups = useMemo(() => {
    const groups = groupOrdersByCustomerName(filtered, customers)
    // 總覽穿透：卡片標題也必須精確符合搜尋的客人名
    if (!normalizeCustomerNameKey(customerFilter)) return groups
    return groups.filter((g) => customerNamesEqual(g.name, customerFilter))
  }, [filtered, customers, customerFilter])

  const tabMetrics = useMemo(() => {
    const custSet = new Set(filtered.map((o) => o.customerId))
    let thirdSum = 0
    for (const o of filtered) {
      if (orderTab === 'pending') thirdSum += dueDepositAmount(o)
      else if (orderTab === 'ended') thirdSum += Number(o.totalReceived ?? o.totalAmount) || 0
      else thirdSum += Number(o.balance) || 0
    }
    return {
      customers: custSet.size,
      orders: filtered.length,
      thirdSum,
    }
  }, [filtered, orderTab])

  useEffect(() => {
    setExpandedCustomers(new Set(customerGroups.map((g) => g.name.toLowerCase())))
  }, [customerGroups])

  function toggleCustomerExpand(name: string) {
    const key = name.toLowerCase()
    setExpandedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['查詢碼', '客戶', '團名', '付款狀態', '訂單狀態', '訂金', '尾款', '國內運', '國際運', '應付總額', '備註'],
      ...filtered.map((o) => {
        const c = customers.find((x) => x.id === o.customerId)
        const g = grpById.get(o.groupId)
        return [
          o.lookupCode,
          c?.name ?? '',
          g?.name ?? '',
          PAYMENT_STATUS_LABEL[o.paymentStatus],
          ORDER_STATUS_LABEL[o.orderStatus],
          o.deposit,
          o.balance,
          o.domesticShipping,
          o.internationalShipping,
          o.totalAmount,
          o.notes,
        ]
      }),
    ]
    downloadCsv('訂單匯出.csv', rows)
    addToast('已匯出訂單 CSV', 'ok')
  }

  function submitOrder() {
    const items: OrderItem[] = []
    for (const ln of lines) {
      const p = products.find((x) => x.id === ln.productId)
      if (!p || ln.qty < 1) continue
      items.push({
        productId: p.id,
        name: p.name,
        qty: ln.qty,
        jpyUnit: p.jpyPrice,
        twdUnit: p.twdPrice,
      })
    }
    if (!custId || !grpId) {
      addToast('請選擇客戶與團別', 'err')
      return
    }
    if (items.length === 0) {
      addToast('請至少選擇一項商品', 'err')
      return
    }
    addOrder({
      customerId: custId,
      groupId: grpId,
      items,
      domesticShipping: dom,
      internationalShipping: intl,
      paymentStatus: pay,
      orderStatus: ord,
      notes,
    })
    setOpen(false)
    setLines([{ productId: '', qty: 1 }])
  }

  return (
    <div className="orders-page">
      <PageHeader
        title="客單管理"
        subtitle="依客人統整訂單；待付款、已處理與已結束分類，與團務及出貨物流連動"
        action={
          <>
            <Btn variant="secondary" onClick={exportCsv}>
              匯出 CSV
            </Btn>
            <Btn onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              新增訂單
            </Btn>
          </>
        }
      />

      {dash || customerFilter ? (
        <Card className="orders-dash-filter mb-4 !p-3">
          {dash === 'wait-deposit'
            ? '目前只顯示：待收訂金'
            : dash
              ? `已套用儀表板篩選（${dash}）`
              : '已套用客人篩選'}
          {customerFilter ? (
            <span>
              {' '}
              · 客人「<strong>{customerFilter}</strong>」
            </span>
          ) : null}
          <Link
            to="/orders"
            className="orders-dash-filter-clear ml-3 font-semibold underline"
            onClick={() => {
              setQ('')
              setCustomerFilter('')
            }}
          >
            清除
          </Link>
        </Card>
      ) : null}

      <div className="orders-bucket-tabs mb-4 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as DaigouOrderBucket[]).map((key) => (
          <button
            key={key}
            type="button"
            className={orderTab === key ? 'orders-bucket-tab orders-bucket-tab--active' : 'orders-bucket-tab'}
            onClick={() => setOrderTab(key)}
          >
            {TAB_LABELS[key]}（{bucketCounts[key]}）
          </button>
        ))}
      </div>

      <div className="oc-metric-blocks oc-metric-blocks--triple mb-4">
        <div className="oc-metric-card oc-metric-card--blue">
          <p className="oc-metric-label">{TAB_LABELS[orderTab]}客人</p>
          <p className="oc-metric-value">{tabMetrics.customers}</p>
        </div>
        <div className="oc-metric-card oc-metric-card--teal">
          <p className="oc-metric-label">{TAB_LABELS[orderTab]}筆數</p>
          <p className="oc-metric-value oc-metric-value--teal">{tabMetrics.orders}</p>
        </div>
        <div className={`oc-metric-card ${orderTab === 'ended' ? 'oc-metric-card--sage' : 'oc-metric-card--amber'}`}>
          <p className="oc-metric-label">{tabMetricThirdLabel(orderTab)}</p>
          <p
            className={
              orderTab === 'ended'
                ? 'oc-metric-value oc-metric-value--teal'
                : 'oc-metric-value oc-metric-value--warn'
            }
          >
            NT$ {Math.round(tabMetrics.thirdSum).toLocaleString()}
          </p>
        </div>
      </div>

      <Card className="orders-search-panel mb-6 !p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted" />
          <input
            className="w-full rounded-xl border border-white/[0.1] bg-ds-surface py-2.5 pl-10 pr-3 text-body text-ds-text outline-none transition focus:border-ds-primary/45 focus:ring-2 focus:ring-ds-primary/20"
            placeholder="搜尋查詢碼、客戶、團名…"
            value={q}
            onChange={(e) => {
              const next = e.target.value
              setQ(next)
              // 手動改搜尋時解除總覽帶來的精確客人鎖定
              if (customerFilter) setCustomerFilter('')
            }}
          />
        </div>
      </Card>

      {!syncReady ? (
        <Empty title="同步團務客單中…" description="正在對齊開團／團務未付訂金資料，請稍候。" />
      ) : filtered.length === 0 ? (
        <Empty
          title={
            customerFilter
              ? `找不到「${customerFilter}」的待收訂金訂單`
              : dash === 'wait-deposit'
                ? '目前沒有待收訂金訂單'
                : `沒有${TAB_LABELS[orderTab]}`
          }
          description={
            customerFilter
              ? '若總覽仍有筆數，請按清除後再搜尋客人姓名；或至團務管理確認該客付款狀態。'
              : '調整搜尋條件，或至團務管理新增客訂。'
          }
          action={<Btn onClick={() => setOpen(true)}>新增訂單</Btn>}
        />
      ) : (
        <div className="space-y-3">
          {customerGroups.map((group) => {
            const expanded = expandedCustomers.has(group.name.toLowerCase())
            const groupSections = groupOrdersByGroupId(group.orders, grpById)
            const groupNames = groupSections
              .map((s) => (s.groupStatus ? `${s.groupName}（${s.groupStatus}）` : s.groupName))
              .join('、')

            return (
            <Card key={group.name} className="order-customer-card" hover={false}>
              <div
                className="order-customer-card-head order-customer-card-head--clickable flex flex-wrap items-center justify-between gap-2"
                role="button"
                tabIndex={0}
                onClick={() => toggleCustomerExpand(group.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleCustomerExpand(group.name)
                  }
                }}
              >
                <div className="min-w-0">
                  <p className="orders-customer-name">{group.name}</p>
                  {!expanded ? (
                    <p className="order-card-customer-meta">
                      {groupSections.length} 個團務：{groupNames}
                    </p>
                  ) : null}
                </div>
                <Chip tone="neutral" className="order-card-chip">{group.orders.length} 筆訂單</Chip>
              </div>
              {expanded
                ? groupSections.map((section) => (
                    <div key={section.groupId} className="order-group-section">
                      {section.orders.map((o) => {
                        const unpaid = o.paymentStatus === 'unpaid'
                        const shipReminder = getOrderShippingReminder(o.id, o.orderStatus, shipments)
                        const amountRow = orderRowAmount(o, orderTab)

                        return (
                          <div
                            key={o.id}
                            className={`order-customer-card-row${unpaid ? ' order-customer-card-row--unpaid' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/orders/${o.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                navigate(`/orders/${o.id}`)
                              }
                            }}
                          >
                            <p className="order-row-group-name">{section.groupName}</p>
                            <div className="order-row-meta">
                              <span
                                className={`order-pay-status order-pay-status--${orderPaymentRowTone(o.paymentStatus)}`}
                              >
                                {orderPaymentRowLabel(o.paymentStatus)}
                              </span>
                              {section.groupStatus ? (
                                <span className={`order-group-status order-group-status--${section.groupStatus}`}>
                                  {section.groupStatus}
                                </span>
                              ) : null}
                              {shipReminder ? (
                                <span className={`order-ship-reminder order-ship-reminder--${shipReminder.tone}`}>
                                  {shipReminder.label}
                                </span>
                              ) : null}
                            </div>
                            <div className="order-customer-card-row-body">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="order-card-code">{o.lookupCode}</p>
                                  {o.notes?.trim() ? (
                                    <p className="order-card-remittance">{o.notes.trim()}</p>
                                  ) : null}
                                </div>
                                <p
                                  className={`order-amount-xl mt-0 text-right${
                                    amountRow.tone === 'due'
                                      ? ' order-amount-xl--due'
                                      : amountRow.tone === 'ok'
                                        ? ' order-amount-xl--ok'
                                        : ''
                                  }`}
                                >
                                  {amountRow.label} NT${amountRow.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                : null}
            </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} title="新增訂單" onClose={() => setOpen(false)}>
        <div className="space-y-4 text-body">
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">客戶</span>
            <select className="mt-2 w-full" value={custId} onChange={(e) => setCustId(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.lineDisplayName}）
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">團別</span>
            <select
              className="mt-2 w-full"
              value={grpId}
              onChange={(e) => {
                setGrpId(e.target.value)
                setLines([{ productId: '', qty: 1 }])
              }}
            >
              {groups.map((gr) => (
                <option key={gr.id} value={gr.id}>
                  {gr.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-meta font-semibold text-ds-text-secondary">品項</p>
          {lines.map((ln, idx) => (
            <div key={idx} className="flex flex-wrap gap-2">
              <select
                className="min-w-[140px] flex-1"
                value={ln.productId}
                onChange={(e) => {
                  const v = e.target.value
                  setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, productId: v } : x)))
                }}
              >
                <option value="">選擇商品</option>
                {grpProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（NT${p.twdPrice}）
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="w-20"
                value={ln.qty}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: v } : x)))
                }}
              />
              <Btn variant="ghost" className="!px-2" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
                刪列
              </Btn>
            </div>
          ))}
          <Btn variant="secondary" className="w-full !py-2 text-xs" onClick={() => setLines((p) => [...p, { productId: '', qty: 1 }])}>
            ＋ 新增品項列
          </Btn>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-meta font-semibold text-ds-text-secondary">國內運費</span>
              <input type="number" className="mt-2 w-full" value={dom} onChange={(e) => setDom(Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="text-meta font-semibold text-ds-text-secondary">國際運費</span>
              <input type="number" className="mt-2 w-full" value={intl} onChange={(e) => setIntl(Number(e.target.value))} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-meta font-semibold text-ds-text-secondary">付款狀態</span>
              <select className="mt-2 w-full" value={pay} onChange={(e) => setPay(e.target.value as PaymentStatus)}>
                {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-meta font-semibold text-ds-text-secondary">訂單狀態</span>
              <select className="mt-2 w-full" value={ord} onChange={(e) => setOrd(e.target.value as OrderStatus)}>
                {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {ORDER_STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-meta font-semibold text-ds-text-secondary">備註</span>
            <textarea className="mt-2 w-full" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <Btn className="w-full" onClick={submitOrder}>
            建立訂單（自動算訂金／尾款）
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
