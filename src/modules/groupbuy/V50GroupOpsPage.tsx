import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Flag, Hand, Package, Plus, RefreshCw, ShoppingCart, Truck, FileDown, FileUp } from 'lucide-react'
import { Btn, PageHeader } from '../../components/ui'
import { useDaigouStore } from '../../daigou/store'
import { GroupSetupModal, type GroupSetupFormValues } from '../../components/groups/GroupSetupModal'
import { useApi } from '../../context/useApi'
import type {
  BankJournalRow,
  GroupBuyAppData,
  GroupBuyGroup,
  GroupBuyOrder,
  GroupBuySavePayload,
} from '../../api/types'
import { V50GroupInfoCard } from './V50GroupInfoCard'
import { syncV50OrderToDaigou, syncV50GroupOrdersToDaigou, findSyncedDaigouOrderId, removeSyncedDaigouOrder, reconcileShippingQueueFromDaigou } from './v50DaigouSync'
import { removePaymentReportsForOrder, syncPaymentReportsForOrderPaymentChange } from './paymentReportLogic'
import { V50OrderMiniCard } from './V50OrderMiniCard'
import { V50OrderDetailSheet } from './V50OrderDetailSheet'
import {
  calcGroupOrdersTotalJpy,
  calcGroupOrdersTotalTwd,
  calcItemsTotalTwd,
  calcOrderBalance,
  summarizeImminentDates,
  resolveV50Deposit,
  suggestDeposit,
  groupOrderCount,
  localTodayIso,
  normalizeGroupStatus,
  matchesV50GroupSearch,
  sortGroups,
  GROUP_SORT_OPTIONS,
  countShippingQueueRows,
  type GroupSortKey,
  type V50GroupStatus,
  V50_GROUP_STATUSES,
} from './v50Utils'
import { V50OrderEntryModal } from './V50OrderEntryModal'
import { V50GroupExcelModal } from './V50GroupExcelModal'
import { V50GroupCostPanel, type GroupCostSavePatch } from './V50GroupCostPanel'
import { useAdminLayoutMode } from '../../layout/adminLayoutPreference'
import { normalizeGroupImageUrls, primaryGroupImageUrl } from '../../pages/open-groups/openGroupImages'
import { isInGroupOps } from './groupLifecycle'
import './v50GroupCard.css'
import './groupbuy.css'
import './v50OrderEntryModal.css'

const STATUS_TAB_MOBILE_MQ = '(max-width: 767.98px)'

function useStackStatusTabs() {
  const { mode } = useAdminLayoutMode()
  const [viewportNarrow, setViewportNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(STATUS_TAB_MOBILE_MQ).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(STATUS_TAB_MOBILE_MQ)
    const onChange = () => setViewportNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (mode === 'mobile') return true
  if (mode === 'desktop') return false
  return viewportNarrow
}

const STATUS_TAB_ICONS: Record<V50GroupStatus, typeof Hand> = {
  已登記: Hand,
  已下單: ShoppingCart,
  官方已發貨: Truck,
  已集運: Package,
  已抵台: Building2,
  已結束: Flag,
}

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`
}

function formToGroup(values: GroupSetupFormValues, existing?: GroupBuyGroup): GroupBuyGroup {
  const today = localTodayIso()
  return {
    id: existing?.id || newId('g'),
    name: values.name.trim(),
    status: normalizeGroupStatus(values.groupStatus || existing?.status),
    /** 團務管理僅通販 */
    channel: '通販',
    /** 從團務管理新建／編輯＝已成團 */
    opsActive: existing ? existing.opsActive !== false : true,
    portalListed: existing?.portalListed !== false,
    closingDate: values.closingDate || today,
    saleEndDate: values.saleEndDate || today,
    officialShipDate: values.officialShipDate || '',
    purchaseDate: values.purchaseDate || '',
    creditCard: values.cardPayNote.trim(),
    jpyAmount: Number(values.jpyAmountTotal) || 0,
    purchaseCosts: existing?.purchaseCosts ?? [],
    orderId: values.orderNumber.trim(),
    logisticsId: values.logisticsNumber.trim(),
    purchaseLink: values.purchaseLink.trim(),
    description: String(existing?.description || '').trim(),
    imageUrls: normalizeGroupImageUrls(existing?.imageUrls, existing?.coverImageUrl),
    coverImageUrl: existing
      ? primaryGroupImageUrl(existing.imageUrls, existing.coverImageUrl)
      : '',
    remarks: values.remarks.trim(),
    orders: existing?.orders || [],
  }
}

function groupToForm(g: GroupBuyGroup): GroupSetupFormValues {
  return {
    name: g.name,
    groupStatus: normalizeGroupStatus(g.status),
    closingDate: g.closingDate,
    saleEndDate: g.saleEndDate,
    purchaseDate: g.purchaseDate || '',
    officialShipDate: g.officialShipDate,
    orderNumber: g.orderId,
    logisticsNumber: g.logisticsId,
    cardPayNote: g.creditCard || '',
    jpyAmountTotal: String(g.jpyAmount ?? ''),
    purchaseLink: g.purchaseLink || '',
    description: g.description || '',
    imageUrls: normalizeGroupImageUrls(g.imageUrls, g.coverImageUrl),
    coverImageUrl: primaryGroupImageUrl(g.imageUrls, g.coverImageUrl),
    remarks: g.remarks || '',
  }
}

export function V50GroupOpsPage() {
  const navigate = useNavigate()
  const stackStatusTabs = useStackStatusTabs()
  const [searchParams, setSearchParams] = useSearchParams()
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<GroupBuyGroup[]>([])
  const [bankJournal, setBankJournal] = useState<BankJournalRow[]>([])
  const [paymentReports, setPaymentReports] = useState<GroupBuyAppData['paymentReports']>([])
  const [portalConfig, setPortalConfig] = useState<GroupBuyAppData['portalConfig'] | null>(null)
  const [exchangeRate, setExchangeRate] = useState(0.22)
  const [statusMsg, setStatusMsg] = useState('')
  const [search, setSearch] = useState('')
  const [groupStatusTab, setGroupStatusTab] = useState<V50GroupStatus>('已登記')
  const [groupSort, setGroupSort] = useState<GroupSortKey>('newest')
  const [viewGroupId, setViewGroupIdState] = useState<string | null>(null)

  const setViewGroupId = useCallback(
    (id: string | null) => {
      setViewGroupIdState(id)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (id) next.set('group', id)
          else next.delete('group')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const [setupOpen, setSetupOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupBuyGroup | null>(null)

  const [viewOrder, setViewOrder] = useState<GroupBuyOrder | null>(null)

  const [orderOpen, setOrderOpen] = useState(false)
  const [orderForm, setOrderForm] = useState<GroupBuyOrder | null>(null)
  const [tempItem, setTempItem] = useState({ name: '', qty: 1, jpy: '', twd: '' })
  const [costSaving, setCostSaving] = useState(false)
  const [excelModal, setExcelModal] = useState<'export' | 'import' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.call<GroupBuyAppData>({ module: 'groupbuy', action: 'getAppData' })
      setGroups(data.groups || [])
      for (const g of data.groups || []) syncV50GroupOrdersToDaigou(g)
      setBankJournal(data.bankJournal || [])
      setPaymentReports(data.paymentReports || [])
      setExchangeRate(data.exchangeRate ?? 0.22)
      setPortalConfig(data.portalConfig)
    } catch (e) {
      console.error(e)
      setStatusMsg('讀取失敗')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const fromUrl = searchParams.get('group')
    if (fromUrl && groups.some((g) => g.id === fromUrl)) {
      setViewGroupIdState(fromUrl)
      return
    }
    if (!fromUrl) setViewGroupIdState(null)
  }, [searchParams, groups])

  const persist = useCallback(
    async (
      nextGroups: GroupBuyGroup[],
      nextJournal = bankJournal,
      nextPaymentReports = paymentReports,
    ) => {
      setStatusMsg('儲存中…')
      try {
        const payload: GroupBuySavePayload = {
          groups: nextGroups,
          bankJournal: nextJournal,
          exchangeRate,
          portalConfig: portalConfig || {
            title: '訂單自助查詢',
            intro: '',
            websiteUrl: '',
            groupUrl: '',
            extraNote: '',
          },
          paymentReports: nextPaymentReports,
        }
        await api.call({ module: 'groupbuy', action: 'saveAppData', payload })
        setGroups(nextGroups)
        setBankJournal(nextJournal)
        setPaymentReports(nextPaymentReports)
        setStatusMsg('已儲存')
      } catch (e) {
        console.error(e)
        setStatusMsg(e instanceof Error ? e.message : '儲存失敗')
      }
      setTimeout(() => setStatusMsg(''), 2200)
    },
    [api, bankJournal, exchangeRate, paymentReports, portalConfig],
  )

  const opsGroups = useMemo(() => groups.filter(isInGroupOps), [groups])

  const deadlineSummary = useMemo(() => summarizeImminentDates(opsGroups), [opsGroups])
  const hasDeadline =
    deadlineSummary.closingGroups.length > 0 || deadlineSummary.saleEndGroups.length > 0

  const groupStatusCounts = useMemo(() => {
    const counts: Record<V50GroupStatus, number> = { 已登記: 0, 已下單: 0, 官方已發貨: 0, 已集運: 0, 已抵台: 0, 已結束: 0 }
    for (const g of opsGroups) {
      counts[normalizeGroupStatus(g.status)] += 1
    }
    return counts
  }, [opsGroups])

  const filteredGroups = useMemo(() => {
    const list = opsGroups.filter((g) => {
      if (normalizeGroupStatus(g.status) !== groupStatusTab) return false
      return matchesV50GroupSearch(g, search)
    })
    return sortGroups(list, groupSort)
  }, [opsGroups, search, groupStatusTab, groupSort])

  const viewGroup = viewGroupId ? groups.find((g) => g.id === viewGroupId) : null
  const daigouOrders = useDaigouStore((s) => s.orders)
  const shipments = useDaigouStore((s) => s.shipments)
  const daigouGroups = useDaigouStore((s) => s.groups)

  useEffect(() => {
    reconcileShippingQueueFromDaigou()
  }, [])

  const viewGroupOrderTotals = useMemo(() => {
    if (!viewGroup) return { jpy: 0, twd: 0, count: 0, pendingShip: 0 }
    const orders = viewGroup.orders || []
    return {
      jpy: calcGroupOrdersTotalJpy(orders),
      twd: calcGroupOrdersTotalTwd(orders),
      count: orders.length,
      pendingShip: countShippingQueueRows(shipments, daigouOrders, daigouGroups, {
        v50GroupId: viewGroup.id,
      }),
    }
  }, [viewGroup, shipments, daigouOrders, daigouGroups])

  const orderDraftTotal = useMemo(() => {
    if (!orderForm) return 0
    const items = orderForm.items || []
    const pending =
      tempItem.name && tempItem.twd
        ? [{ name: tempItem.name, qty: Number(tempItem.qty) || 1, jpy: Number(tempItem.jpy) || 0, twd: Number(tempItem.twd) || 0 }]
        : []
    return calcItemsTotalTwd([...items, ...pending])
  }, [orderForm, tempItem])

  const suggestedDeposit = suggestDeposit(orderDraftTotal)

  async function saveGroupCostFields(groupId: string, patch: GroupCostSavePatch) {
    setCostSaving(true)
    try {
      const logisticsId = patch.purchaseCosts.find((c) => c.logisticsId?.trim())?.logisticsId?.trim() ?? ''
      const next = groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              purchaseCosts: patch.purchaseCosts,
              logisticsId: logisticsId || g.logisticsId,
            }
          : g,
      )
      await persist(next)
    } finally {
      setCostSaving(false)
    }
  }

  function openCreateGroup() {
    setEditingGroup(null)
    setSetupOpen(true)
  }

  function openEditGroup(g: GroupBuyGroup) {
    setEditingGroup(g)
    setSetupOpen(true)
  }

  async function submitGroupForm(values: GroupSetupFormValues) {
    const ng = formToGroup(values, editingGroup || undefined)
    const next = editingGroup
      ? groups.map((g) => (g.id === editingGroup.id ? { ...ng, orders: g.orders } : g))
      : [ng, ...groups]
    setSetupOpen(false)
    await persist(next)
    const saved = editingGroup ? next.find((g) => g.id === editingGroup.id) : next[0]
    if (saved) syncV50GroupOrdersToDaigou(saved)
  }

  async function deleteGroup(g: GroupBuyGroup) {
    const orderCount = groupOrderCount(g)
    const detail =
      orderCount > 0
        ? `\n此團內有 ${orderCount} 筆客訂，刪除後無法復原。`
        : '\n刪除後無法復原。'
    const ok = window.confirm(`確定要刪除「${g.name}」嗎？${detail}`)
    if (!ok) return
    const next = groups.filter((x) => x.id !== g.id)
    if (viewGroupId === g.id) setViewGroupId(null)
    await persist(next)
  }

  function openNewOrder() {
    setOrderForm({
      id: '',
      customerName: '',
      items: [],
      totalTwd: 0,
      deposit: 0,
      domesticShip: 0,
      intlShip: 0,
      balance: 0,
      paymentStatus: '未付款',
      paymentInfo: '',
    })
    setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
    setOrderOpen(true)
  }

  function openOrderDetail(o: GroupBuyOrder) {
    setViewOrder(o)
  }

  function openDaigouOrder(o: GroupBuyOrder) {
    let dgId = findSyncedDaigouOrderId(o.id)
    if (!dgId) {
      const g = groups.find((gr) => gr.orders.some((x) => x.id === o.id))
      if (g) syncV50OrderToDaigou(g, o)
      dgId = findSyncedDaigouOrderId(o.id)
    }
    if (dgId) {
      setViewOrder(null)
      navigate(`/orders/${dgId}`)
    }
  }

  function openEditOrder(o: GroupBuyOrder) {
    setViewOrder(null)
    setOrderForm({ ...o })
    setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
    setOrderOpen(true)
  }

  async function applyExcelImport(groupId: string, nextOrders: GroupBuyOrder[], summary: string) {
    const next = groups.map((g) =>
      g.id === groupId ? { ...g, orders: nextOrders } : g,
    )
    const savedGroup = next.find((g) => g.id === groupId)
    if (savedGroup) {
      for (const o of nextOrders) syncV50OrderToDaigou(savedGroup, o)
    }
    await persist(next)
    setStatusMsg(summary)
    setTimeout(() => setStatusMsg(''), 3200)
  }

  async function saveOrder() {
    if (!viewGroupId || !orderForm) return
    const extra =
      tempItem.name && tempItem.twd
        ? [
            {
              name: tempItem.name,
              qty: Number(tempItem.qty) || 1,
              jpy: Number(tempItem.jpy) || 0,
              twd: Number(tempItem.twd) || 0,
            },
          ]
        : []
    const items = [...orderForm.items, ...extra]
    if (!items.length) {
      alert('請至少加入一項商品（需填品名與台幣單價）')
      return
    }
    if (!orderForm.customerName.trim()) {
      alert('請填寫客人姓名')
      return
    }
    const total = calcItemsTotalTwd(items)
    const deposit = resolveV50Deposit(orderForm.paymentStatus, total, orderForm.deposit)
    const saved: GroupBuyOrder = {
      ...orderForm,
      id: orderForm.id || newId('o'),
      items,
      totalTwd: total,
      deposit,
      balance: calcOrderBalance(total, deposit, orderForm.domesticShip, orderForm.intlShip),
    }
    const previousOrder = orderForm.id
      ? groups.find((g) => g.id === viewGroupId)?.orders.find((o) => o.id === orderForm.id)
      : undefined
    const reportSync = syncPaymentReportsForOrderPaymentChange(
      bankJournal,
      paymentReports || [],
      saved.id,
      previousOrder?.paymentStatus ?? '未付款',
      saved.paymentStatus,
    )
    const next = groups.map((g) => {
      if (g.id !== viewGroupId) return g
      const orders = orderForm.id
        ? g.orders.map((o) => (o.id === orderForm.id ? saved : o))
        : [saved, ...g.orders]
      return { ...g, orders }
    })
    setOrderOpen(false)
    const savedGroup = next.find((g) => g.id === viewGroupId)
    if (savedGroup) syncV50OrderToDaigou(savedGroup, saved)
    await persist(
      next,
      reportSync.bankJournal,
      reportSync.reports,
    )
    if (reportSync.removedCount > 0) {
      setStatusMsg(`已儲存，並同步移除 ${reportSync.removedCount} 筆付款回報`)
      setTimeout(() => setStatusMsg(''), 2800)
    }
  }

  async function deleteOrder(order: GroupBuyOrder) {
    if (!viewGroupId) return
    const name = order.customerName?.trim() || '（未填名字）'
    const pay = String(order.paymentStatus || '').trim()
    const hasPaidDeposit = pay === '已付訂金' || pay === '已付款' || pay === '已結清'
    const relatedReports = (paymentReports || []).filter((r) =>
      (r.orderIds || []).includes(order.id),
    )
    const hasPaymentReport = relatedReports.length > 0

    let confirmMsg = `確定要刪除「${name}」的這筆客訂嗎？\n刪除後無法復原。`
    if (hasPaidDeposit || hasPaymentReport) {
      const reasons: string[] = []
      if (hasPaidDeposit) reasons.push(`付款狀態為「${pay}」（已支付訂金／款項）`)
      if (hasPaymentReport) {
        const pending = relatedReports.filter((r) => r.status === 'pending').length
        const confirmed = relatedReports.filter((r) => r.status === 'confirmed').length
        const parts: string[] = []
        if (confirmed) parts.push(`${confirmed} 筆已確認回報`)
        if (pending) parts.push(`${pending} 筆待審回報`)
        if (!parts.length) parts.push(`${relatedReports.length} 筆訂金回報`)
        reasons.push(`已有${parts.join('、')}`)
      }
      confirmMsg =
        `⚠️ 刪除提醒\n\n此客訂${reasons.join('；')}。\n` +
        `刪除後對應付款回報也會一併移除，且無法復原。\n\n` +
        `仍要刪除「${name}」的這筆客訂嗎？`
    }

    const ok = window.confirm(confirmMsg)
    if (!ok) return

    const reportSync = removePaymentReportsForOrder(bankJournal, paymentReports || [], order.id)
    const next = groups.map((g) =>
      g.id === viewGroupId
        ? { ...g, orders: (g.orders || []).filter((o) => o.id !== order.id) }
        : g,
    )
    if (viewOrder?.id === order.id) setViewOrder(null)
    if (orderForm?.id === order.id) setOrderOpen(false)
    removeSyncedDaigouOrder(order.id)
    await persist(next, reportSync.bankJournal, reportSync.reports)
    setStatusMsg(
      reportSync.removedCount > 0
        ? `已刪除客訂，並移除 ${reportSync.removedCount} 筆付款回報`
        : '已刪除客訂',
    )
    setTimeout(() => setStatusMsg(''), 2800)
  }

  if (loading) {
    return <div className="gb-loading">團務資料載入中…</div>
  }

  return (
    <div className="v50-group-ops-page">
      {statusMsg ? <div className="gb-toast">{statusMsg}</div> : null}

      <PageHeader
        title="團務管理"
        action={
          <>
            <Btn variant="secondary" to="/open-groups-preview">
              開團專區
            </Btn>
            <Btn variant="secondary" onClick={() => setExcelModal('export')}>
              <FileDown className="h-4 w-4" />
              匯出 Excel
            </Btn>
            <Btn variant="secondary" onClick={() => setExcelModal('import')}>
              <FileUp className="h-4 w-4" />
              匯入 Excel
            </Btn>
            <Btn variant="secondary" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              重新載入
            </Btn>
            <Btn onClick={openCreateGroup}>
              <Plus className="h-4 w-4" />
              新增團務
            </Btn>
          </>
        }
      />

      {!viewGroupId && hasDeadline ? (
        <div className="v50-alert-banner">
          {deadlineSummary.closingGroups.length > 0 ? (
            <p className="v50-alert-line v50-alert-line--closing">
              <span className="v50-alert-label v50-alert-label--closing">結單：</span>
              {deadlineSummary.closingGroups.join('、')}
            </p>
          ) : null}
          {deadlineSummary.saleEndGroups.length > 0 ? (
            <p className="v50-alert-line v50-alert-line--sale-end">
              <span className="v50-alert-label v50-alert-label--sale-end">結束販賣：</span>
              {deadlineSummary.saleEndGroups.join('、')}
            </p>
          ) : null}
        </div>
      ) : null}

      {!viewGroupId ? (
        <>
          <div
            className={'v50-status-tabs' + (stackStatusTabs ? ' v50-status-tabs--stack' : '')}
            role="tablist"
            aria-label="團務狀態"
          >
            {V50_GROUP_STATUSES.map((s) => {
              const Icon = STATUS_TAB_ICONS[s]
              const active = groupStatusTab === s
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={'v50-status-tab v50-status-tab--' + s + (active ? ' is-active' : '')}
                  onClick={() => setGroupStatusTab(s)}
                >
                  <Icon className="v50-status-tab-icon" aria-hidden strokeWidth={2} />
                  <span className="v50-status-tab-label">
                    <span className="v50-status-tab-name">{s}</span>
                    <span className="v50-status-tab-count">（{groupStatusCounts[s]}）</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="v50-group-toolbar">
            <input
              className="heina-input gb-search"
              placeholder="搜尋團務名稱、訂單編號、物流編號…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="v50-group-sort">
              <span className="v50-group-sort-label">排序</span>
              <select
                className="v50-group-sort-select"
                value={groupSort}
                onChange={(e) => setGroupSort(e.target.value as GroupSortKey)}
              >
                {GROUP_SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filteredGroups.length === 0 ? (
            <p className="text-body text-ds-text-muted">
              {search.trim() ? `找不到符合「${search.trim()}」的團務。` : '此分類尚無團務。'}
            </p>
          ) : (
            <div className="v50-grid">
              {filteredGroups.map((g) => (
                <V50GroupInfoCard
                  key={g.id}
                  group={g}
                  onOpen={() => setViewGroupId(g.id)}
                  onEdit={() => openEditGroup(g)}
                  onDelete={() => void deleteGroup(g)}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {viewGroup ? (
        <div>
          <button type="button" className="v50-back-to-list" onClick={() => setViewGroupId(null)}>
            ← 返回團務列表
          </button>
          <div className="v50-group-detail-head">
            <h2 className="v50-group-detail-title">{viewGroup.name}</h2>
            <button type="button" className="v50-gcard-edit-btn" onClick={() => openEditGroup(viewGroup)}>
              編輯
            </button>
          </div>
          <V50GroupCostPanel
            group={viewGroup}
            saving={costSaving}
            onSave={(patch) => saveGroupCostFields(viewGroup.id, patch)}
          />
          <div className="v50-order-totals mb-4">
            <div className="v50-order-totals-item">
              <span className="v50-order-totals-label">客訂總日幣</span>
              <strong className="v50-order-totals-value">¥{viewGroupOrderTotals.jpy.toLocaleString()}</strong>
            </div>
            <div className="v50-order-totals-item">
              <span className="v50-order-totals-label">客訂總台幣</span>
              <strong className="v50-order-totals-value">${viewGroupOrderTotals.twd.toLocaleString()}</strong>
            </div>
            <div className="v50-order-totals-meta-group">
              <span className="v50-order-totals-meta">{viewGroupOrderTotals.count} 筆客訂</span>
              <span className="v50-order-totals-meta v50-order-totals-meta--ship">
                待出貨 {viewGroupOrderTotals.pendingShip} 筆
              </span>
            </div>
          </div>
          <Btn className="mb-4" onClick={openNewOrder}>
            新增客訂
          </Btn>
          <div className="v50-order-mini-list">
            {(viewGroup.orders || []).map((o) => (
              <V50OrderMiniCard
                key={o.id}
                order={o}
                onOpen={() => openOrderDetail(o)}
                onEdit={() => openEditOrder(o)}
                onDelete={() => void deleteOrder(o)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <GroupSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSubmit={submitGroupForm}
        initialValues={editingGroup ? groupToForm(editingGroup) : null}
        title={editingGroup ? '編輯開團資訊' : '設定開團資訊'}
        groupId={editingGroup?.id ?? null}
      />

      {viewOrder ? (
        <V50OrderDetailSheet
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onEdit={() => openEditOrder(viewOrder)}
          onOpenDaigou={() => openDaigouOrder(viewOrder)}
        />
      ) : null}

      {excelModal === 'export' ? (
        <V50GroupExcelModal mode="export" groups={groups} onClose={() => setExcelModal(null)} />
      ) : null}
      {excelModal === 'import' ? (
        <V50GroupExcelModal
          mode="import"
          groups={groups}
          onClose={() => setExcelModal(null)}
          onImport={(groupId, nextOrders, summary) => void applyExcelImport(groupId, nextOrders, summary)}
        />
      ) : null}

      {orderOpen && orderForm ? (
        <V50OrderEntryModal
          open={orderOpen}
          order={orderForm}
          tempItem={tempItem}
          draftTotal={orderDraftTotal}
          suggestedDeposit={suggestedDeposit}
          onClose={() => setOrderOpen(false)}
          onChangeOrder={setOrderForm}
          onChangeTempItem={setTempItem}
          onSave={() => void saveOrder()}
        />
      ) : null}
    </div>
  )
}
