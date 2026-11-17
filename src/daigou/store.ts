import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { KEYS } from '../adapters/mockStorage'
import { HEINA_DEFAULT_WORKBOOK_PROFILE } from './heinaWorkbookSheetProfile'
import {
  gatherPreorderBlocksFromSheets,
  inferOrderStatusFromRegisterRemark,
  inferPaymentStatusFromRegisterRemark,
  totalReceivedForInferredPayment,
} from './kaitoWorkbookPreorderImport'
import {
  buildRegistrationSheetToGroupId,
  extractPreorderSheetTagFromRemark,
  gatherKaitoMasterRowsFromWorkbookBuffer,
  masterParsedRowToGroupDraft,
  masterSummaryForOrderNote,
} from './kaitoMasterSheetImport'
import { createEmptyDaigouState, createSeedState, defaultDaigouSettings } from './seed'
import { procurementActions } from './procurementActions'
import {
  computeMembershipSpendTwd,
  normalizeCustomerMembership,
  tierDef,
  tierFromSpend,
} from './membershipTiers'
import { isValidLookupPin, normalizeLookupPin } from './portalLookupAuth'
import { syncPortalLookupCustomersToGroupbuy } from './portalLookupSync'
import { buildOrderFinancials } from './logic/orderCalc'
import { parseLineGroupMemberList } from './lineCustomerImport'
import { parseRegisterSheetOrderBlocks } from './registerSheetImport'
import type {
  AuditLogEntry,
  Customer,
  DaigouState,
  GoodsReceipt,
  Group,
  PaymentTerm,
  PurchaseOrder,
  PurchaseReturn,
  MyShipRecord,
  MyShipStatus,
  NotificationTemplate,
  OnboardingTask,
  Order,
  OrderStatus,
  Product,
  Settings,
  Shipment,
  ShipmentRecord,
  ShipmentRecordStatus,
  SpotProduct,
  Supplier,
  ToastMessage,
  Transaction,
  MembershipTierId,
} from './types'

let idSeq = 100000
function rid(prefix: string) {
  idSeq += 1
  return `${prefix}_${idSeq}`
}

function nowIso() {
  return new Date().toISOString()
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export type DaigouStore = DaigouState & {
  addToast: (message: string, tone?: ToastMessage['tone']) => void
  dismissToast: (id: string) => void
  /** 清空本機 persist 與 Mock（開團／預購／記帳）快取，還原空白資料並重新整理 */
  resetDemo: () => void
  updateSettings: (p: Partial<Settings>) => void
  addGroup: (g: Omit<Group, 'id' | 'createdAt'>) => void
  updateGroup: (id: string, p: Partial<Group>) => void
  addProduct: (p: Omit<Product, 'id'>) => void
  updateProduct: (id: string, p: Partial<Product>) => void
  addSpotProduct: (p: Omit<SpotProduct, 'id' | 'createdAt'>) => void
  updateSpotProduct: (id: string, p: Partial<SpotProduct>) => void
  adjustSpotStock: (id: string, delta: number) => void
  addCustomer: (c: Omit<Customer, 'id'>) => void
  updateCustomer: (id: string, p: Partial<Customer>) => void
  addOrder: (o: Omit<Order, 'id' | 'lookupCode' | 'createdAt' | 'deposit' | 'balance' | 'totalAmount'> & Partial<Pick<Order, 'deposit'>>) => void
  saveTransaction: (t: Transaction) => void
  updateOrder: (id: string, p: Partial<Order>) => void
  recalcOrder: (id: string) => void
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateShipment: (id: string, p: Partial<Shipment>) => void
  revertShipmentToPending: (id: string) => void
  /** 刪除出貨佇列項目，並一併移除對應客單與相關出貨／賣貨便紀錄（避免自動加回） */
  deleteShipments: (ids: string[]) => void
  batchShipPacked: (ids: string[]) => void
  batchShipShipped: (ids: string[], shipDateByShipmentId?: Record<string, string>) => void
  addShipmentRecord: (r: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  addShipmentRecordForOrder: (orderId: string) => void
  createShipmentRecordsFromOrders: (orderIds: string[]) => void
  updateShipmentRecord: (id: string, p: Partial<ShipmentRecord>) => void
  batchShipmentRecordsPacked: (ids: string[]) => void
  batchShipmentRecordsShipped: (ids: string[]) => void
  batchShipmentRecordsTracking: (ids: string[], trackingNo: string) => void
  addMyShipRecord: (r: Omit<MyShipRecord, 'id'>) => void
  addMyShipRecordForOrder: (orderId: string, shipmentRecordId?: string) => void
  updateMyShipRecord: (id: string, p: Partial<MyShipRecord>) => void
  linkMyShipToShipment: (myShipId: string, shipmentRecordId: string) => void
  batchMyShipPickupDeadline: (ids: string[], pickupDeadline: string) => void
  batchMyShipSetStatus: (ids: string[], status: MyShipStatus) => void
  batchMyShipArrivedStore: (ids: string[]) => void
  batchMyShipPickedUp: (ids: string[]) => void
  batchMyShipOverdue: (ids: string[]) => void
  batchMyShipReturned: (ids: string[]) => void
  importMyShipPaste: (text: string) => void
  appendAuditLog: (e: Omit<AuditLogEntry, 'id' | 'createdAt'>) => void
  duplicateGroup: (id: string) => string | null
  archiveGroup: (id: string) => void
  duplicateProduct: (id: string) => string | null
  updateNotificationTemplate: (id: string, p: Partial<NotificationTemplate>) => void
  resetNotificationTemplates: () => void
  completeOnboardingTask: (id: string) => void
  bulkImportProducts: (items: Omit<Product, 'id'>[]) => void
  bulkImportCustomersFromLinePaste: (
    text: string,
    opts?: { skipDuplicates?: boolean },
  ) => { imported: number; duplicatesVsExisting: number }
  /** 將 Google／Excel「登記表」列（名字分組＋多品項）批次轉成訂單 */
  bulkImportRegisterSheetOrders: (opts: {
    groupId: string
    rows: Record<string, unknown>[]
    paymentStatus?: Order['paymentStatus']
    orderStatus?: Order['orderStatus']
  }) => { imported: number; warnings: string[] }
  /** 開團明細多分頁 xlsx：依 `HEINA_DEFAULT_WORKBOOK_PROFILE` 掃描登記表並建立新團＋訂單（預購／抵達／付款備註寫入 customerNote） */
  importKaitoPreorderWorkbook: (opts: {
    sheets: { name: string; rows: Record<string, unknown>[] }[]
    /** 與 sheets 同源之 xlsx ArrayBuffer，用於主表 AoA 解析（結單日／物流／連結等欄） */
    workbookBuffer?: ArrayBuffer
    groupName?: string
    maxSheets?: number
    maxOrderBlocks?: number
    maxMasterRows?: number
  }) => {
    imported: number
    warnings: string[]
    groupId: string | null
    sheetsUsed: number
    mastersImported: number
  }
  syncCustomerMembershipFromOrders: (customerId: string) => void
  syncAllMembershipFromOrders: () => void
  setCustomerMembershipTier: (
    customerId: string,
    tierId: MembershipTierId,
    opts?: { lock?: boolean },
  ) => void
  addCustomerBalanceMemo: (customerId: string, amountTwd: number) => void
  settleCustomerBalanceMemos: (customerId: string, memoIds: string[], settledNote?: string) => void
  settleBalanceMemosByIds: (memoIds: string[], settledNote?: string) => number
  reopenBalanceMemosByIds: (memoIds: string[]) => number
  deleteCustomerBalanceMemo: (customerId: string, memoId: string) => void
  addSupplier: (s: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSupplier: (id: string, p: Partial<Supplier>) => void
  addPurchaseOrder: (
    po: Omit<PurchaseOrder, 'id' | 'poNo' | 'subtotalAmount' | 'totalAmount' | 'payableAmount' | 'approval' | 'createdAt' | 'updatedAt'>,
  ) => string
  updatePurchaseOrder: (id: string, patch: Partial<PurchaseOrder>) => void
  approvePurchaseOrder: (id: string, approvedBy?: string) => void
  rejectPurchaseOrder: (id: string, reason: string, rejectedBy?: string) => void
  confirmGoodsReceipt: (r: Omit<GoodsReceipt, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void
  createPayableForPurchaseOrder: (poId: string, dueDate: string) => void
  addPaymentTerm: (pt: Omit<PaymentTerm, 'id'>) => void
  markPaymentTermPaid: (id: string, actualAmount: number, actualDate?: string, method?: string) => void
  createPurchaseReturn: (ret: Omit<PurchaseReturn, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export const useDaigouStore = create<DaigouStore>()(
  persist(
    (set, get) => ({
      ...createEmptyDaigouState(),

      addToast(message, tone = 'info') {
        const id = rid('toast')
        set((s) => ({ ...s, toasts: [...s.toasts, { id, message, tone }] }))
        setTimeout(() => get().dismissToast(id), 3200)
      },

      dismissToast(id) {
        set((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }))
      },

      resetDemo() {
        try {
          localStorage.removeItem(KEYS.groupbuy)
          localStorage.removeItem(KEYS.ledger)
          localStorage.removeItem(KEYS.preorder)
          localStorage.removeItem('heina_suite_ledger_cid_v1')
        } catch {
          /* ignore */
        }
        try {
          useDaigouStore.persist.clearStorage()
        } catch {
          /* ignore */
        }
        set({ ...createEmptyDaigouState(), toasts: [] })
        get().addToast('已清空本機資料，即將重新整理…', 'info')
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            window.location.reload()
          }, 550)
        }
      },

      updateSettings(p) {
        set((s) => ({ ...s, settings: { ...s.settings, ...p } }))
        get().addToast('設定已更新', 'ok')
      },

      addGroup(g) {
        const ng: Group = { ...g, id: rid('g'), createdAt: Date.now() }
        set((s) => ({ ...s, groups: [ng, ...s.groups] }))
        get().addToast(`已建立團：${ng.name}`, 'ok')
      },

      updateGroup(id, p) {
        set((s) => ({ ...s, groups: s.groups.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
        get().addToast('團務已更新', 'ok')
      },

      addProduct(p) {
        const np: Product = { ...p, id: rid('p') }
        set((s) => ({ ...s, products: [np, ...s.products] }))
        get().addToast(`已新增商品：${np.name}`, 'ok')
      },

      updateProduct(id, p) {
        set((s) => ({ ...s, products: s.products.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
        get().addToast('商品已更新', 'ok')
      },

      addSpotProduct(p) {
        const np: SpotProduct = { ...p, id: rid('sp'), createdAt: Date.now() }
        set((s) => ({ ...s, spotProducts: [np, ...s.spotProducts] }))
        get().addToast(`已上架現貨：${np.name}`, 'ok')
      },

      updateSpotProduct(id, p) {
        set((s) => ({ ...s, spotProducts: s.spotProducts.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
        get().addToast('現貨商品已更新', 'ok')
      },

      adjustSpotStock(id, delta) {
        set((s) => ({
          ...s,
          spotProducts: s.spotProducts.map((x) => {
            if (x.id !== id) return x
            const n = Math.max(0, x.stockQty + delta)
            let status = x.status
            if (n === 0) status = 'sold_out'
            else if (status === 'sold_out' && n > 0) status = 'on_sale'
            return { ...x, stockQty: n, status }
          }),
        }))
        get().addToast(delta >= 0 ? '已入庫' : '已扣庫存', 'ok')
      },

      addCustomer(c) {
        const nc: Customer = normalizeCustomerMembership({
          ...c,
          id: rid('c'),
          createdAt: c.createdAt ?? Date.now(),
          membershipTierId: c.membershipTierId ?? 'regular',
          membershipSpendTwd: c.membershipSpendTwd ?? 0,
          membershipTierLocked: c.membershipTierLocked ?? false,
          lookupPin: (() => {
            const pin = normalizeLookupPin(c.lookupPin || '')
            return isValidLookupPin(pin) ? pin : undefined
          })(),
        })
        set((s) => ({ ...s, customers: [nc, ...s.customers] }))
        syncPortalLookupCustomersToGroupbuy(get().customers)
        get().addToast(`已新增客戶：${nc.name}`, 'ok')
      },

      bulkImportCustomersFromLinePaste(text: string, opts?: { skipDuplicates?: boolean }) {
        const skipDuplicates = opts?.skipDuplicates !== false
        const rows = parseLineGroupMemberList(text)
        if (!rows.length) {
          get().addToast('沒有解析到任何筆名。可貼「一行一位顯示名」，或 顯示名、姓名、末三碼（Tab／逗號分隔）', 'err')
          return { imported: 0, duplicatesVsExisting: 0 }
        }
        const existing = get().customers
        const batch: Customer[] = []
        let duplicatesVsExisting = 0
        for (const row of rows) {
          const key = row.lineDisplayName.trim().toLowerCase()
          if (
            skipDuplicates &&
            existing.some((c) => c.lineDisplayName.trim().toLowerCase() === key)
          ) {
            duplicatesVsExisting += 1
            continue
          }
          batch.push(
            normalizeCustomerMembership({
              id: rid('c'),
              name: row.name.trim() || row.lineDisplayName.trim(),
              lineDisplayName: row.lineDisplayName.trim(),
              phoneLast3: row.phoneLast3 || '000',
              socialAccount: '',
              tags: ['new_customer'],
              riskScore: 20,
              pickupReliability: 80,
              totalOrders: 0,
              totalUnpaidBalance: 0,
              notes: '',
              createdAt: Date.now(),
              membershipTierId: 'regular',
              membershipSpendTwd: 0,
              membershipTierLocked: false,
              lookupPin: undefined,
            }),
          )
        }
        if (!batch.length) {
          get().addToast(
            skipDuplicates ? '與現有客戶 LINE 顯示名皆重複，未新增' : '沒有可新增的客戶',
            'info',
          )
          return { imported: 0, duplicatesVsExisting }
        }
        set((s) => ({ ...s, customers: [...batch, ...s.customers] }))
        syncPortalLookupCustomersToGroupbuy(get().customers)
        get().appendAuditLog({
          action: 'customers_line_group_import',
          entityType: 'customer',
          entityId: 'batch',
          after: `${batch.length} names`,
          createdBy: 'u1',
        })
        get().addToast(
          `已匯入 ${batch.length} 位客戶（標籤：新客）${duplicatesVsExisting ? `，略過 ${duplicatesVsExisting} 筆重複` : ''}`,
          'ok',
        )
        return { imported: batch.length, duplicatesVsExisting }
      },

      updateCustomer(id, p) {
        const patch = { ...p }
        if (patch.lookupPin != null) {
          const pin = normalizeLookupPin(patch.lookupPin)
          patch.lookupPin = pin.length === 4 ? pin : undefined
        }
        set((s) => ({
          ...s,
          customers: s.customers.map((x) => (x.id === id ? normalizeCustomerMembership({ ...x, ...patch }) : x)),
        }))
        syncPortalLookupCustomersToGroupbuy(get().customers)
        get().addToast('客戶已更新', 'ok')
      },

      syncCustomerMembershipFromOrders(customerId) {
        const s = get()
        const cust = s.customers.find((x) => x.id === customerId)
        if (!cust) return
        if (cust.membershipTierLocked) {
          get().addToast('此客戶會員等級已鎖定，未依訂單重算', 'info')
          return
        }
        const spend = computeMembershipSpendTwd(customerId, s.orders)
        const tier = tierFromSpend(spend)
        set((st) => ({
          ...st,
          customers: st.customers.map((x) =>
            x.id === customerId ? normalizeCustomerMembership({ ...x, membershipSpendTwd: spend, membershipTierId: tier }) : x,
          ),
        }))
        get().appendAuditLog({
          action: 'membership_sync',
          entityType: 'customer',
          entityId: customerId,
          after: `${tierDef(tier).label} · 認列 ${spend.toLocaleString()} TWD`,
          createdBy: 'u1',
        })
        get().addToast(`已重算會員：${tierDef(tier).label}`, 'ok')
      },

      syncAllMembershipFromOrders() {
        const s = get()
        const unlocked = s.customers.filter((c) => !c.membershipTierLocked).length
        set((st) => ({
          ...st,
          customers: st.customers.map((c) => {
            if (c.membershipTierLocked) return c
            const spend = computeMembershipSpendTwd(c.id, st.orders)
            return normalizeCustomerMembership({
              ...c,
              membershipSpendTwd: spend,
              membershipTierId: tierFromSpend(spend),
            })
          }),
        }))
        get().appendAuditLog({
          action: 'membership_sync_all',
          entityType: 'customer',
          entityId: 'batch',
          after: `${unlocked} 位已重算（已鎖定者略過）`,
          createdBy: 'u1',
        })
        get().addToast(`已批次同步會員等級（${unlocked} 位）`, 'ok')
      },

      setCustomerMembershipTier(customerId, tierId, opts) {
        const lockOpt = opts?.lock
        set((st) => ({
          ...st,
          customers: st.customers.map((x) =>
            x.id === customerId
              ? normalizeCustomerMembership({
                  ...x,
                  membershipTierId: tierId,
                  membershipTierLocked: lockOpt === undefined ? x.membershipTierLocked : lockOpt,
                })
              : x,
          ),
        }))
        const cust = get().customers.find((x) => x.id === customerId)
        const locked = !!cust?.membershipTierLocked
        get().appendAuditLog({
          action: 'membership_manual',
          entityType: 'customer',
          entityId: customerId,
          after: `${tierDef(tierId).label}${locked ? '（鎖定）' : ''}`,
          createdBy: 'u1',
        })
        get().addToast(`已設定會員等級：${tierDef(tierId).label}`, 'ok')
      },

      addCustomerBalanceMemo(customerId, amountTwd) {
        const amount = Number(amountTwd)
        if (!Number.isFinite(amount) || amount === 0) {
          get().addToast('請輸入金額（正數＝客人欠我，負數＝我欠客人）', 'err')
          return
        }
        const entry = {
          id: rid('bm'),
          amountTwd: amount,
          createdAt: Date.now(),
          status: 'open' as const,
        }
        set((st) => ({
          ...st,
          customers: st.customers.map((x) =>
            x.id === customerId
              ? normalizeCustomerMembership({
                  ...x,
                  balanceMemos: [...(x.balanceMemos ?? []), entry],
                })
              : x,
          ),
        }))
        get().addToast('已新增帳務備註', 'ok')
      },

      settleCustomerBalanceMemos(customerId, memoIds, settledNote) {
        if (memoIds.length === 0) return
        const ts = Date.now()
        const note = settledNote || '出貨抵銷'
        let settled = 0
        set((st) => ({
          ...st,
          customers: st.customers.map((x) => {
            if (x.id !== customerId) return x
            const ids = new Set(memoIds)
            const nextMemos = (x.balanceMemos ?? []).map((m) => {
              if (m.status !== 'open' || !ids.has(m.id)) return m
              settled += 1
              return { ...m, status: 'settled' as const, settledAt: ts, settledNote: note }
            })
            return normalizeCustomerMembership({ ...x, balanceMemos: nextMemos })
          }),
        }))
        if (settled > 0) get().addToast(`已抵銷 ${settled} 筆帳務備註`, 'ok')
      },

      settleBalanceMemosByIds(memoIds, settledNote) {
        if (!memoIds.length) return 0
        const ts = Date.now()
        const note = settledNote || '付款回報抵銷'
        const ids = new Set(memoIds)
        let settled = 0
        set((st) => ({
          ...st,
          customers: st.customers.map((x) => {
            let changed = false
            const nextMemos = (x.balanceMemos ?? []).map((m) => {
              if (m.status !== 'open' || !ids.has(m.id)) return m
              settled += 1
              changed = true
              return { ...m, status: 'settled' as const, settledAt: ts, settledNote: note }
            })
            return changed ? normalizeCustomerMembership({ ...x, balanceMemos: nextMemos }) : x
          }),
        }))
        if (settled > 0) get().addToast(`已抵銷 ${settled} 筆帳務備註`, 'ok')
        return settled
      },

      reopenBalanceMemosByIds(memoIds) {
        if (!memoIds.length) return 0
        const ids = new Set(memoIds)
        let reopened = 0
        set((st) => ({
          ...st,
          customers: st.customers.map((x) => {
            let changed = false
            const nextMemos = (x.balanceMemos ?? []).map((m) => {
              if (m.status !== 'settled' || !ids.has(m.id)) return m
              reopened += 1
              changed = true
              return { ...m, status: 'open' as const, settledAt: undefined, settledNote: undefined }
            })
            return changed ? normalizeCustomerMembership({ ...x, balanceMemos: nextMemos }) : x
          }),
        }))
        return reopened
      },

      deleteCustomerBalanceMemo(customerId, memoId) {
        set((st) => ({
          ...st,
          customers: st.customers.map((x) =>
            x.id === customerId
              ? normalizeCustomerMembership({
                  ...x,
                  balanceMemos: (x.balanceMemos ?? []).filter((m) => m.id !== memoId),
                })
              : x,
          ),
        }))
        get().addToast('已刪除帳務備註', 'ok')
      },

      addOrder(o) {
        const discount = o.discount ?? 0
        const packagingFee = o.packagingFee ?? 0
        const otherFee = o.otherFee ?? 0
        const { deposit, balance, totalAmount } = buildOrderFinancials(
          o.items,
          o.domesticShipping,
          o.internationalShipping,
          o.deposit,
          packagingFee,
          otherFee,
          discount,
        )
        const totalReceived = o.totalReceived ?? 0
        const outstandingAmount = Math.max(0, totalAmount - totalReceived)
        const ts = Date.now()
        const no: Order = {
          ...o,
          discount,
          packagingFee,
          otherFee,
          deposit,
          balance,
          totalAmount,
          totalReceived,
          outstandingAmount,
          customerNote: o.customerNote ?? '',
          internalNote: o.internalNote ?? '',
          id: rid('o'),
          lookupCode: `HMB-${10000 + get().orders.length + 1}`,
          createdAt: ts,
          updatedAt: ts,
        }
        set((s) => ({ ...s, orders: [no, ...s.orders] }))
        get().appendAuditLog({
          action: 'order_created',
          entityType: 'order',
          entityId: no.id,
          after: no.lookupCode,
          createdBy: 'u1',
        })
        get().addToast(`已建立訂單 ${no.lookupCode}`, 'ok')
      },

      saveTransaction(t) {
        set((s) => ({
          ...s,
          transactions: s.transactions.some((x) => x.id === t.id)
            ? s.transactions.map((x) => (x.id === t.id ? t : x))
            : [t, ...s.transactions],
        }))
        get().addToast('帳務已儲存', 'ok')
      },

      updateOrder(id, p) {
        const prev = get().orders.find((x) => x.id === id)
        set((s) => ({
          ...s,
          orders: s.orders.map((x) => (x.id === id ? { ...x, ...p, updatedAt: Date.now() } : x)),
        }))
        if (prev) {
          get().appendAuditLog({
            action: 'order_edited',
            entityType: 'order',
            entityId: id,
            before: JSON.stringify(prev).slice(0, 400),
            after: JSON.stringify({ ...prev, ...p }).slice(0, 400),
            createdBy: 'u1',
          })
        }
        get().addToast('訂單已更新', 'ok')
      },

      recalcOrder(id) {
        const o = get().orders.find((x) => x.id === id)
        if (!o) return
        const fin = buildOrderFinancials(
          o.items,
          o.domesticShipping,
          o.internationalShipping,
          o.deposit,
          o.packagingFee ?? 0,
          o.otherFee ?? 0,
          o.discount ?? 0,
        )
        const recv = o.totalReceived ?? 0
        const outstandingAmount = Math.max(0, fin.totalAmount - recv)
        set((s) => ({
          ...s,
          orders: s.orders.map((x) =>
            x.id === id
              ? {
                  ...x,
                  deposit: fin.deposit,
                  balance: fin.balance,
                  totalAmount: fin.totalAmount,
                  outstandingAmount,
                  updatedAt: Date.now(),
                }
              : x,
          ),
        }))
        get().addToast('訂單金額已依公式重算', 'ok')
      },

      addTransaction(t) {
        const nt: Transaction = { ...t, id: rid('t'), createdAt: Date.now() }
        set((s) => ({ ...s, transactions: [nt, ...s.transactions] }))
        get().appendAuditLog({
          action: 'transaction_added',
          entityType: 'transaction',
          entityId: nt.id,
          after: `${nt.type} ${nt.amount}`,
          createdBy: nt.createdBy ?? 'u1',
        })
        get().addToast('已新增一筆帳務', 'ok')
      },

      updateShipment(id, p) {
        const prev = get().shipments.find((x) => x.id === id)
        const nextStatus = (p.status ?? prev?.status) as Shipment['status'] | undefined
        const merged: Shipment | undefined = prev ? { ...prev, ...p } : undefined
        if (
          merged &&
          (merged.status === 'shipped' || merged.status === 'delivered') &&
          !String(merged.shipDate || '').trim()
        ) {
          merged.shipDate = new Date().toISOString().slice(0, 10)
        }
        const shouldCompleteOrder =
          !!prev &&
          !!nextStatus &&
          (nextStatus === 'shipped' || nextStatus === 'delivered') &&
          prev.status !== nextStatus

        set((s) => ({
          ...s,
          shipments: s.shipments.map((x) => (x.id === id ? (merged ?? { ...x, ...p }) : x)),
          orders:
            shouldCompleteOrder && prev
              ? s.orders.map((o) =>
                  o.id === prev.orderId &&
                  !['completed', 'shipped', 'cancelled'].includes(o.orderStatus)
                    ? { ...o, orderStatus: 'completed' as const, updatedAt: Date.now() }
                    : o,
                )
              : s.orders,
        }))
        get().addToast(shouldCompleteOrder ? '已標記出貨，客單已同步為已結束' : '出貨狀態已更新', 'ok')
      },

      revertShipmentToPending(id) {
        const prev = get().shipments.find((x) => x.id === id)
        if (!prev) {
          get().addToast('找不到出貨紀錄', 'err')
          return
        }
        const order = get().orders.find((o) => o.id === prev.orderId)
        const restoreOrderStatus = (): OrderStatus => {
          if (!order) return 'ready_to_ship'
          if (order.paymentStatus === 'unpaid') return 'waiting_deposit'
          if (order.paymentStatus === 'deposit_paid') return 'deposit_paid'
          return 'ready_to_ship'
        }

        set((s) => ({
          ...s,
          shipments: s.shipments.map((x) =>
            x.id === id ? { ...x, status: 'not_packed' as const, shipDate: '' } : x,
          ),
          orders: s.orders.map((o) =>
            o.id === prev.orderId && ['completed', 'shipped'].includes(o.orderStatus)
              ? { ...o, orderStatus: restoreOrderStatus(), updatedAt: Date.now() }
              : o,
          ),
        }))
        get().addToast('已退回待出貨，客單已同步', 'ok')
      },

      deleteShipments(ids) {
        const uniqueIds = [...new Set(ids.filter(Boolean))]
        if (!uniqueIds.length) {
          get().addToast('請先選擇要刪除的出貨項目', 'err')
          return
        }
        const st = get()
        const targetShipments = st.shipments.filter((x) => uniqueIds.includes(x.id))
        if (!targetShipments.length) {
          get().addToast('找不到要刪除的出貨項目', 'err')
          return
        }
        const orderIdSet = new Set(targetShipments.map((x) => x.orderId))
        const shipmentRecordIds = st.shipmentRecords
          .filter((x) => orderIdSet.has(x.orderId))
          .map((x) => x.id)
        const shipmentRecordIdSet = new Set(shipmentRecordIds)

        set((s) => ({
          ...s,
          shipments: s.shipments.filter((x) => !uniqueIds.includes(x.id) && !orderIdSet.has(x.orderId)),
          orders: s.orders.filter((o) => !orderIdSet.has(o.id)),
          shipmentRecords: s.shipmentRecords.filter((x) => !orderIdSet.has(x.orderId)),
          myShipRecords: s.myShipRecords.filter(
            (x) => !orderIdSet.has(x.orderId) && !shipmentRecordIdSet.has(x.shipmentId || ''),
          ),
        }))
        get().addToast(`已刪除 ${targetShipments.length} 筆出貨（含對應客單）`, 'ok')
      },

      batchShipPacked(ids) {
        set((s) => ({
          ...s,
          shipments: s.shipments.map((x) => (ids.includes(x.id) ? { ...x, status: 'packed' as const } : x)),
        }))
        get().addToast(`已標記 ${ids.length} 筆為已包貨`, 'ok')
      },

      batchShipShipped(ids, shipDateByShipmentId) {
        const orderIds = get()
          .shipments.filter((x) => ids.includes(x.id))
          .map((x) => x.orderId)
        const today = todayStr()
        set((s) => ({
          ...s,
          shipments: s.shipments.map((x) => {
            if (!ids.includes(x.id)) return x
            const shipDate =
              shipDateByShipmentId?.[x.id]?.trim() || x.shipDate?.trim() || today
            return {
              ...x,
              status: 'shipped' as const,
              shipDate,
            }
          }),
          orders: s.orders.map((o) =>
            orderIds.includes(o.id) && !['completed', 'shipped', 'cancelled'].includes(o.orderStatus)
              ? { ...o, orderStatus: 'completed' as const, updatedAt: Date.now() }
              : o,
          ),
        }))
        get().addToast(`已標記 ${ids.length} 筆為已出貨，客單已同步為已結束`, 'ok')
      },

      addShipmentRecord(rec) {
        const t = nowIso()
        const nr: ShipmentRecord = { ...rec, id: rid('sr'), createdAt: t, updatedAt: t }
        set((s) => ({ ...s, shipmentRecords: [nr, ...s.shipmentRecords] }))
        get().addToast('已建立出貨紀錄', 'ok')
      },

      addShipmentRecordForOrder(orderId) {
        const o = get().orders.find((x) => x.id === orderId)
        if (!o) {
          get().addToast('找不到訂單', 'err')
          return
        }
        const c = get().customers.find((x) => x.id === o.customerId)
        get().addShipmentRecord({
          orderId: o.id,
          customerId: o.customerId,
          groupId: o.groupId,
          shippingMethod: '賣貨便',
          carrier: '7-ELEVEN',
          trackingNo: '',
          packageCount: 1,
          packageWeight: 0.5,
          shippingFee: 65,
          packagingFee: 0,
          status: '未包裝',
          receiverName: c?.name ?? '（請補收件人）',
          receiverPhone: c ? `0900${c.phoneLast3}000` : '',
          receiverStoreName: '',
          receiverStoreId: '',
          notes: `訂單 ${o.lookupCode}`,
        })
      },

      createShipmentRecordsFromOrders(orderIds) {
        const t = nowIso()
        const newRecs: ShipmentRecord[] = []
        for (const oid of orderIds) {
          const o = get().orders.find((x) => x.id === oid)
          if (!o) continue
          const c = get().customers.find((x) => x.id === o.customerId)
          newRecs.push({
            id: rid('sr'),
            orderId: o.id,
            customerId: o.customerId,
            groupId: o.groupId,
            shippingMethod: '賣貨便',
            carrier: '7-ELEVEN',
            trackingNo: '',
            packageCount: 1,
            packageWeight: 0.5,
            shippingFee: 65,
            packagingFee: 0,
            status: '未包裝',
            receiverName: c?.name ?? '（請補收件人）',
            receiverPhone: c ? `0900${c.phoneLast3}000` : '',
            receiverStoreName: '',
            receiverStoreId: '',
            notes: `訂單 ${o.lookupCode}`,
            createdAt: t,
            updatedAt: t,
          })
        }
        if (newRecs.length) {
          set((s) => ({ ...s, shipmentRecords: [...newRecs, ...s.shipmentRecords] }))
        }
        get().addToast(`已為 ${newRecs.length} 筆訂單建立出貨紀錄`, 'ok')
      },

      updateShipmentRecord(id, p) {
        const prev = get().shipmentRecords.find((x) => x.id === id)
        const nextStatus = (p.status ?? prev?.status) as ShipmentRecordStatus | undefined
        if (prev && nextStatus && ['退回', '逾期未取'].includes(nextStatus) && !['退回', '逾期未取'].includes(prev.status)) {
          const c = get().customers.find((x) => x.id === prev.customerId)
          if (c) {
            set((s) => ({
              ...s,
              customers: s.customers.map((x) =>
                x.id === prev.customerId
                  ? {
                      ...x,
                      riskScore: Math.min(100, x.riskScore + 12),
                      pickupReliability: Math.max(0, x.pickupReliability - 6),
                      notes: x.notes ? `${x.notes}；出貨紀錄：${nextStatus}` : `出貨紀錄：${nextStatus}`,
                    }
                  : x,
              ),
            }))
          }
        }
        const t = nowIso()
        set((s) => ({
          ...s,
          shipmentRecords: s.shipmentRecords.map((x) => (x.id === id ? { ...x, ...p, updatedAt: t } : x)),
        }))
        get().addToast('出貨紀錄已更新', 'ok')
      },

      batchShipmentRecordsPacked(ids) {
        const t = nowIso()
        set((s) => ({
          ...s,
          shipmentRecords: s.shipmentRecords.map((x) =>
            ids.includes(x.id) ? { ...x, status: '已包裝' as const, updatedAt: t } : x,
          ),
        }))
        get().addToast(`已標記 ${ids.length} 筆為已包裝`, 'ok')
      },

      batchShipmentRecordsShipped(ids) {
        const t = nowIso()
        const d = todayStr()
        set((s) => ({
          ...s,
          shipmentRecords: s.shipmentRecords.map((x) =>
            ids.includes(x.id) ? { ...x, status: '已寄出' as const, shippedAt: d, updatedAt: t } : x,
          ),
        }))
        get().addToast(`已標記 ${ids.length} 筆為已寄出`, 'ok')
      },

      batchShipmentRecordsTracking(ids, trackingNo) {
        const t = nowIso()
        set((s) => ({
          ...s,
          shipmentRecords: s.shipmentRecords.map((x) => (ids.includes(x.id) ? { ...x, trackingNo, updatedAt: t } : x)),
        }))
        get().addToast('追蹤碼已批次更新', 'ok')
      },

      addMyShipRecord(rec) {
        const nr: MyShipRecord = { ...rec, id: rid('my') }
        set((s) => ({ ...s, myShipRecords: [nr, ...s.myShipRecords] }))
        get().addToast('已建立賣貨便紀錄', 'ok')
      },

      addMyShipRecordForOrder(orderId, shipmentRecordId) {
        const o = get().orders.find((x) => x.id === orderId)
        if (!o) {
          get().addToast('找不到訂單', 'err')
          return
        }
        const c = get().customers.find((x) => x.id === o.customerId)
        const d = todayStr()
        get().addMyShipRecord({
          orderId: o.id,
          shipmentId: shipmentRecordId,
          customerId: o.customerId,
          senderName: '某某工作室',
          senderPhone: '0912000111',
          receiverName: c?.name ?? '（收件人）',
          receiverPhone: c ? `0900${c.phoneLast3}000` : '',
          receiverStoreName: '（請選門市）',
          receiverStoreId: '',
          receiverStoreAddress: '',
          shippingFee: 65,
          collectionAmount: 0,
          paymentType: '純寄件',
          packageSize: '小包',
          packageWeight: 0.5,
          status: '已建立寄件單',
          createdDate: d,
          pickupDeadline: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
          notes: o.lookupCode,
        })
      },

      updateMyShipRecord(id, p) {
        const prev = get().myShipRecords.find((x) => x.id === id)
        const nextStatus = (p.status ?? prev?.status) as MyShipStatus | undefined
        if (
          prev &&
          nextStatus &&
          ['已退回', '逾期未取'].includes(nextStatus) &&
          prev.status !== nextStatus
        ) {
          const c = get().customers.find((x) => x.id === prev.customerId)
          if (c) {
            set((s) => ({
              ...s,
              customers: s.customers.map((x) =>
                x.id === prev.customerId
                  ? {
                      ...x,
                      riskScore: Math.min(100, x.riskScore + (nextStatus === '已退回' ? 15 : 10)),
                      pickupReliability: Math.max(0, x.pickupReliability - (nextStatus === '已退回' ? 10 : 8)),
                      notes: x.notes ? `${x.notes}；賣貨便：${nextStatus}` : `賣貨便：${nextStatus}`,
                    }
                  : x,
              ),
            }))
          }
        }
        set((s) => ({
          ...s,
          myShipRecords: s.myShipRecords.map((x) => (x.id === id ? { ...x, ...p } : x)),
        }))
        get().addToast('賣貨便紀錄已更新', 'ok')
      },

      linkMyShipToShipment(myShipId, shipmentRecordId) {
        set((s) => ({
          ...s,
          myShipRecords: s.myShipRecords.map((x) => (x.id === myShipId ? { ...x, shipmentId: shipmentRecordId } : x)),
        }))
        get().addToast('已連結出貨紀錄', 'ok')
      },

      batchMyShipPickupDeadline(ids, pickupDeadline) {
        set((s) => ({
          ...s,
          myShipRecords: s.myShipRecords.map((x) => (ids.includes(x.id) ? { ...x, pickupDeadline } : x)),
        }))
        get().addToast('取貨期限已批次更新', 'ok')
      },

      batchMyShipSetStatus(ids, status) {
        const d = todayStr()
        const prevs = get().myShipRecords.filter((x) => ids.includes(x.id))
        const riskCustomers = new Set<string>()
        for (const pr of prevs) {
          if (['已退回', '逾期未取'].includes(status) && pr.status !== status) riskCustomers.add(pr.customerId)
        }
        set((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            riskCustomers.has(c.id)
              ? {
                  ...c,
                  riskScore: Math.min(100, c.riskScore + (status === '已退回' ? 15 : 10)),
                  pickupReliability: Math.max(0, c.pickupReliability - (status === '已退回' ? 10 : 8)),
                  notes: c.notes ? `${c.notes}；賣貨便批次：${status}` : `賣貨便批次：${status}`,
                }
              : c,
          ),
          myShipRecords: s.myShipRecords.map((x) => {
            if (!ids.includes(x.id)) return x
            const patch: Partial<MyShipRecord> = { status }
            if (status === '已到店' || status === '待取貨') patch.storeArrivalDate = x.storeArrivalDate ?? d
            if (status === '已取貨') patch.pickedUpDate = d
            if (status === '已退回') patch.returnedDate = d
            if (status === '已寄件') patch.shippedDate = x.shippedDate ?? d
            return { ...x, ...patch }
          }),
        }))
        get().addToast('賣貨便狀態已批次更新', 'ok')
      },

      batchMyShipArrivedStore(ids) {
        get().batchMyShipSetStatus(ids, '已到店')
      },

      batchMyShipPickedUp(ids) {
        get().batchMyShipSetStatus(ids, '已取貨')
      },

      batchMyShipOverdue(ids) {
        get().batchMyShipSetStatus(ids, '逾期未取')
      },

      batchMyShipReturned(ids) {
        get().batchMyShipSetStatus(ids, '已退回')
      },

      importMyShipPaste(text) {
        const lines = text.trim().split(/\r?\n/).filter(Boolean)
        let start = 0
        if (/id/i.test(lines[0] ?? '') && (/追蹤|tracking|狀態|status/i.test(lines[0] ?? '') || lines[0].split(/[\t,]/).length > 2))
          start = 1
        const patches = new Map<string, Partial<MyShipRecord>>()
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(/[\t,]/).map((c) => c.trim())
          const id = cols[0]
          if (!id) continue
          const patch: Partial<MyShipRecord> = {}
          if (cols[1]) patch.trackingNo = cols[1]
          if (cols[2]) patch.status = cols[2] as MyShipStatus
          if (cols[3]) patch.pickupDeadline = cols[3]
          if (cols[4]) patch.myShipOrderNo = cols[4]
          if (cols[5]) patch.myShipShippingCode = cols[5]
          if (Object.keys(patch).length) patches.set(id, patch)
        }
        let n = 0
        set((s) => ({
          ...s,
          myShipRecords: s.myShipRecords.map((r) => {
            const patch = patches.get(r.id)
            if (!patch) return r
            n += 1
            return { ...r, ...patch }
          }),
        }))
        get().addToast(`已套用 ${n} 筆貼上更新（略過無效列）`, n ? 'ok' : 'info')
      },

      appendAuditLog(e) {
        const entry: AuditLogEntry = { ...e, id: rid('al'), createdAt: Date.now() }
        set((s) => ({ ...s, auditLogs: [entry, ...s.auditLogs].slice(0, 800) }))
      },

      duplicateGroup(id) {
        const g = get().groups.find((x) => x.id === id)
        if (!g) {
          get().addToast('找不到團務', 'err')
          return null
        }
        const ng: Group = {
          ...g,
          id: rid('g'),
          name: `${g.name}（複本）`,
          status: 'draft',
          archived: false,
          createdAt: Date.now(),
        }
        set((s) => ({ ...s, groups: [ng, ...s.groups] }))
        get().appendAuditLog({ action: 'group_duplicated', entityType: 'group', entityId: ng.id, after: ng.name, createdBy: 'u1' })
        get().addToast(`已複製團務：${ng.name}`, 'ok')
        return ng.id
      },

      archiveGroup(id) {
        set((s) => ({ ...s, groups: s.groups.map((x) => (x.id === id ? { ...x, archived: true } : x)) }))
        get().appendAuditLog({ action: 'group_archived', entityType: 'group', entityId: id, after: 'archived', createdBy: 'u1' })
        get().addToast('團務已封存', 'ok')
      },

      duplicateProduct(id) {
        const p = get().products.find((x) => x.id === id)
        if (!p) {
          get().addToast('找不到商品', 'err')
          return null
        }
        const np: Product = { ...p, id: rid('p'), name: `${p.name}（複本）` }
        set((s) => ({ ...s, products: [np, ...s.products] }))
        get().appendAuditLog({ action: 'product_duplicated', entityType: 'product', entityId: np.id, after: np.name, createdBy: 'u1' })
        get().addToast(`已複製商品：${np.name}`, 'ok')
        return np.id
      },

      updateNotificationTemplate(id, patch) {
        const t = new Date().toISOString().slice(0, 10)
        set((s) => ({
          ...s,
          notificationTemplates: s.notificationTemplates.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: t } : x)),
        }))
        get().addToast('訊息範本已更新', 'ok')
      },

      resetNotificationTemplates() {
        const fresh = createSeedState().notificationTemplates
        set((s) => ({ ...s, notificationTemplates: fresh }))
        get().addToast('訊息範本已還原為預設', 'ok')
      },

      completeOnboardingTask(id) {
        set((s) => ({
          ...s,
          onboardingTasks: s.onboardingTasks.map((t: OnboardingTask) => (t.id === id ? { ...t, completed: true } : t)),
        }))
        get().addToast('已勾選完成', 'ok')
      },

      bulkImportProducts(items) {
        if (!items.length) {
          get().addToast('沒有可匯入的商品列', 'info')
          return
        }
        const newProducts: Product[] = items.map((p) => ({ ...p, id: rid('p') }))
        set((s) => ({ ...s, products: [...newProducts, ...s.products] }))
        get().appendAuditLog({
          action: 'products_bulk_import',
          entityType: 'product',
          entityId: newProducts[0]?.id ?? 'batch',
          after: `${newProducts.length} rows`,
          createdBy: 'u1',
        })
        get().addToast(`已從試算表／Excel 匯入 ${newProducts.length} 筆商品`, 'ok')
      },

      ...procurementActions(set, get, rid, todayStr),

      bulkImportRegisterSheetOrders({ groupId, rows, paymentStatus, orderStatus }) {
        const g = get().groups.find((x) => x.id === groupId)
        if (!g) {
          get().addToast('找不到指定的團務，請確認團 ID', 'err')
          return { imported: 0, warnings: [] }
        }
        const rate = Number(get().settings.defaultExchangeRate) || 0.22
        const { blocks, warnings } = parseRegisterSheetOrderBlocks(rows, { defaultExchangeRate: rate })
        if (!blocks.length) {
          get().addToast('沒有解析到訂單（需含標題列：名字、商品、數量…，且每位客戶至少一筆品項）', 'err')
          return { imported: 0, warnings }
        }

        const snap = (n: string) => n.trim().toLowerCase()
        const existingSnapshot = get().customers
        const newCustomers: Customer[] = []
        const customerIdByName = new Map<string, string>()

        function resolveCustomerId(displayName: string): string {
          const key = snap(displayName)
          const hitMap = customerIdByName.get(key)
          if (hitMap) return hitMap
          const merged = [...newCustomers, ...existingSnapshot]
          const existing = merged.find((c) => snap(c.name) === key || snap(c.lineDisplayName) === key)
          if (existing) {
            customerIdByName.set(key, existing.id)
            return existing.id
          }
          const nc: Customer = {
            id: rid('c'),
            name: displayName.trim(),
            lineDisplayName: displayName.trim(),
            phoneLast3: '000',
            socialAccount: '',
            tags: ['new_customer'],
            riskScore: 20,
            pickupReliability: 80,
            totalOrders: 0,
            totalUnpaidBalance: 0,
            notes: '登記表匯入',
          }
          newCustomers.push(nc)
          customerIdByName.set(key, nc.id)
          return nc.id
        }

        const pay = paymentStatus ?? 'unpaid'
        const ord = orderStatus ?? 'confirmed'
        const newOrders: Order[] = []
        const ts = Date.now()
        const orderBase = get().orders.length

        for (let bi = 0; bi < blocks.length; bi++) {
          const block = blocks[bi]
          const customerId = resolveCustomerId(block.customerName)
          const notesParts: string[] = []
          if (block.myship) notesParts.push('[賣貨便]')
          if (block.remark) notesParts.push(block.remark)
          const discount = 0
          const packagingFee = 0
          const otherFee = 0
          const fin = buildOrderFinancials(
            block.items,
            block.domesticShipping,
            block.internationalShipping,
            block.rawDeposit > 0 ? block.rawDeposit : undefined,
            packagingFee,
            otherFee,
            discount,
          )
          const totalReceived = 0
          const outstandingAmount = Math.max(0, fin.totalAmount - totalReceived)
          const no: Order = {
            customerId,
            groupId,
            items: block.items,
            domesticShipping: block.domesticShipping,
            internationalShipping: block.internationalShipping,
            discount,
            packagingFee,
            otherFee,
            totalReceived,
            paymentStatus: pay,
            orderStatus: ord,
            notes: notesParts.join(' ').trim() || '登記表匯入',
            customerNote: block.remark,
            internalNote: '',
            riskFlag: false,
            deposit: fin.deposit,
            balance: fin.balance,
            totalAmount: fin.totalAmount,
            outstandingAmount,
            id: rid('o'),
            lookupCode: `HMB-${10000 + orderBase + bi + 1}`,
            createdAt: ts,
            updatedAt: ts,
          }
          newOrders.push(no)
        }

        set((s) => ({
          ...s,
          customers: [...newCustomers, ...s.customers],
          orders: [...newOrders, ...s.orders],
        }))

        get().appendAuditLog({
          action: 'register_sheet_orders_import',
          entityType: 'order',
          entityId: newOrders[0]?.id ?? 'batch',
          after: `${newOrders.length} orders → ${g.name}`,
          createdBy: 'u1',
        })
        get().addToast(`已從登記表匯入 ${newOrders.length} 筆訂單（團：${g.name}）`, 'ok')
        for (const w of warnings.slice(0, 4)) get().addToast(w, 'info')
        if (warnings.length > 4) get().addToast(`另有 ${warnings.length - 4} 則提示`, 'info')
        return { imported: newOrders.length, warnings }
      },

      importKaitoPreorderWorkbook(opts) {
        const rate = Number(get().settings.defaultExchangeRate) || 0.22
        const profile = HEINA_DEFAULT_WORKBOOK_PROFILE
        const tw = opts.workbookBuffer
          ? gatherKaitoMasterRowsFromWorkbookBuffer(opts.workbookBuffer, profile, opts.sheets, {
              maxMasterRows: opts.maxMasterRows ?? profile.defaultMaxMasterRows,
            })
          : { rows: [], warnings: [] as string[] }
        const masterRows = tw.rows
        const masterWarnings = tw.warnings

        const { blocks, warnings, sheetsUsed } = gatherPreorderBlocksFromSheets(
          opts.sheets,
          profile,
          rate,
          { maxSheets: opts.maxSheets, maxBlocks: opts.maxOrderBlocks },
        )
        const allWarnings = [...masterWarnings, ...warnings]

        if (!blocks.length && !masterRows.length) {
          get().addToast('整檔匯入：未解析到主表列或登記訂單', 'err')
          for (const w of allWarnings.slice(0, 8)) get().addToast(w, 'info')
          return { imported: 0, warnings: allWarnings, groupId: null, sheetsUsed, mastersImported: 0 }
        }

        const t = todayStr()
        const masterGroups: Group[] = []
        for (const mr of masterRows) {
          const gid = rid('g')
          masterGroups.push({ ...masterParsedRowToGroupDraft(mr, rate, profile.id), id: gid, createdAt: Date.now() })
        }
        const masterTitles = masterGroups.map((g, i) => ({ groupId: g.id, title: masterRows[i]?.title ?? g.name }))
        const masterRowByGroupId = new Map(
          masterGroups.map((g, i) => [g.id, masterRows[i]] as const).filter(([, r]) => !!r),
        )

        const regSheetNames = [
          ...new Set(
            blocks
              .map((b) => extractPreorderSheetTagFromRemark(b.remark ?? '') ?? '')
              .filter(Boolean),
          ),
        ]
        const sheetToGid = buildRegistrationSheetToGroupId(masterTitles, regSheetNames)
        const unmatched = regSheetNames.filter((sn) => !sheetToGid.has(sn))

        const orphanGroups: Group[] = []
        let orphanGid: string | null = null
        if (blocks.length) {
          if (masterRows.length && unmatched.length) {
            orphanGid = rid('g')
            orphanGroups.push({
              id: orphanGid,
              name: (opts.groupName?.trim() || `預購登記（未對主表）${t}`).slice(0, 80),
              status: 'waiting_arrival',
              closingDate: t,
              saleEndDate: t,
              officialShipDate: '',
              exchangeRate: rate,
              jpyAmountTotal: 0,
              orderNumber: '',
              logisticsNumber: '',
              purchaseLink: '',
              notes: `版型：${profile.id}；主表未對到的登記分頁：${unmatched.join('、').slice(0, 800)}`,
              createdAt: Date.now(),
            })
          } else if (!masterRows.length) {
            orphanGid = rid('g')
            orphanGroups.push({
              id: orphanGid,
              name: (opts.groupName?.trim() || `預購匯入（開團明細）${t}`).slice(0, 80),
              status: 'waiting_arrival',
              closingDate: t,
              saleEndDate: t,
              officialShipDate: '',
              exchangeRate: rate,
              jpyAmountTotal: 0,
              orderNumber: '',
              logisticsNumber: '',
              purchaseLink: '',
              notes: `版型：${profile.id}；分頁數：${sheetsUsed}；整檔預購匯入（無主表）`,
              createdAt: Date.now(),
            })
          }
        }

        function resolveGroupIdForBlock(remark: string): string {
          const sn = extractPreorderSheetTagFromRemark(remark ?? '')
          if (sn && sheetToGid.has(sn)) return sheetToGid.get(sn)!
          if (orphanGid) return orphanGid
          if (masterGroups[0]) return masterGroups[0].id
          throw new Error('importKaitoPreorderWorkbook: 無法決定團務 ID')
        }

        const newGroupsOrdered: Group[] = [...masterGroups, ...orphanGroups]

        if (!blocks.length) {
          set((s) => ({
            ...s,
            groups: [...newGroupsOrdered, ...s.groups],
          }))
          get().appendAuditLog({
            action: 'kaito_workbook_preorder_import',
            entityType: 'group',
            entityId: masterGroups[0]?.id ?? 'master-only',
            after: `主表 ${masterRows.length} 列團務｜0 筆訂單｜${profile.id}`,
            createdBy: 'u1',
          })
          get().addToast(`已匯入主表 ${masterRows.length} 列為團務（未偵測到登記訂單分頁）`, 'ok')
          for (const w of allWarnings.slice(0, 6)) get().addToast(w, 'info')
          if (allWarnings.length > 6) get().addToast(`另有 ${allWarnings.length - 6} 則提示`, 'info')
          return {
            imported: 0,
            warnings: allWarnings,
            groupId: masterGroups[0]?.id ?? null,
            sheetsUsed,
            mastersImported: masterRows.length,
          }
        }

        const snap = (n: string) => n.trim().toLowerCase()
        const existingSnapshot = get().customers
        const newCustomers: Customer[] = []
        const customerIdByName = new Map<string, string>()

        function resolveCustomerId(displayName: string): string {
          const key = snap(displayName)
          const hitMap = customerIdByName.get(key)
          if (hitMap) return hitMap
          const merged = [...newCustomers, ...existingSnapshot]
          const existing = merged.find((c) => snap(c.name) === key || snap(c.lineDisplayName) === key)
          if (existing) {
            customerIdByName.set(key, existing.id)
            return existing.id
          }
          const nc: Customer = {
            id: rid('c'),
            name: displayName.trim(),
            lineDisplayName: displayName.trim(),
            phoneLast3: '000',
            socialAccount: '',
            tags: ['new_customer'],
            riskScore: 20,
            pickupReliability: 80,
            totalOrders: 0,
            totalUnpaidBalance: 0,
            notes: '開團明細整檔匯入',
          }
          newCustomers.push(nc)
          customerIdByName.set(key, nc.id)
          return nc.id
        }

        const newOrders: Order[] = []
        const ts = Date.now()
        const orderBase = get().orders.length

        for (let bi = 0; bi < blocks.length; bi++) {
          const block = blocks[bi]
          const customerId = resolveCustomerId(block.customerName)
          const gid = resolveGroupIdForBlock(block.remark)
          const masterRow = masterRowByGroupId.get(gid)
          const masterLine = masterRow ? `｜${masterSummaryForOrderNote(masterRow)}` : ''
          const notesParts: string[] = ['開團明細預購匯入']
          if (block.myship) notesParts.push('[賣貨便]')
          const pay = inferPaymentStatusFromRegisterRemark(block.remark)
          const ord = inferOrderStatusFromRegisterRemark(block.remark)
          const discount = 0
          const packagingFee = 0
          const otherFee = 0
          const fin = buildOrderFinancials(
            block.items,
            block.domesticShipping,
            block.internationalShipping,
            block.rawDeposit > 0 ? block.rawDeposit : undefined,
            packagingFee,
            otherFee,
            discount,
          )
          const totalReceived = totalReceivedForInferredPayment(pay, fin.deposit, fin.totalAmount)
          const outstandingAmount = Math.max(0, fin.totalAmount - totalReceived)
          const cn = (block.remark.slice(0, 900 - masterLine.length) + masterLine).slice(0, 900)
          const no: Order = {
            customerId,
            groupId: gid,
            items: block.items,
            domesticShipping: block.domesticShipping,
            internationalShipping: block.internationalShipping,
            discount,
            packagingFee,
            otherFee,
            totalReceived,
            paymentStatus: pay,
            orderStatus: ord,
            notes: notesParts.join(' '),
            customerNote: cn,
            internalNote: '',
            riskFlag: false,
            deposit: fin.deposit,
            balance: fin.balance,
            totalAmount: fin.totalAmount,
            outstandingAmount,
            id: rid('o'),
            lookupCode: `HMB-${10000 + orderBase + bi + 1}`,
            createdAt: ts,
            updatedAt: ts,
          }
          newOrders.push(no)
        }

        const reportGid = orphanGid ?? masterGroups[0]?.id ?? null

        set((s) => ({
          ...s,
          groups: [...newGroupsOrdered, ...s.groups],
          customers: [...newCustomers.map((c) => normalizeCustomerMembership(c)), ...s.customers],
          orders: [...newOrders, ...s.orders],
        }))

        get().appendAuditLog({
          action: 'kaito_workbook_preorder_import',
          entityType: 'group',
          entityId: reportGid ?? 'batch',
          after: `${newOrders.length} 筆訂單｜主表 ${masterRows.length} 列｜${sheetsUsed} 登記分頁｜${profile.id}`,
          createdBy: 'u1',
        })
        get().addToast(
          `已整檔匯入：訂單 ${newOrders.length} 筆、主表團務 ${masterRows.length} 列（登記分頁 ${sheetsUsed}）`,
          'ok',
        )
        for (const w of allWarnings.slice(0, 5)) get().addToast(w, 'info')
        if (allWarnings.length > 5) get().addToast(`另有 ${allWarnings.length - 5} 則提示`, 'info')
        return {
          imported: newOrders.length,
          warnings: allWarnings,
          groupId: reportGid,
          sheetsUsed,
          mastersImported: masterRows.length,
        }
      },
    }),
    {
      /** 改版時遞增，略過舊版內含大量示範訂單之 persist */
      name: 'helpmebuy-pro-v8',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DaigouState>
        const c = current as DaigouStore
        return {
          ...c,
          ...p,
          settings: (() => {
            const merged = { ...c.settings, ...(p.settings ?? {}) }
            if (!merged.theme) merged.theme = 'light'
            if (!merged.colorPreset) merged.colorPreset = 'default'
            if (merged.adminAuthEnabled !== false) {
              merged.adminSessionHours = merged.adminSessionHours ?? defaultDaigouSettings.adminSessionHours
              merged.adminLoginMaxAttempts =
                merged.adminLoginMaxAttempts ?? defaultDaigouSettings.adminLoginMaxAttempts
              merged.adminLoginLockMinutes =
                merged.adminLoginLockMinutes ?? defaultDaigouSettings.adminLoginLockMinutes
            }
            return merged
          })(),
          /** 以下欄位若被舊版／手動寫入成 null，...p 會覆蓋成非陣列，多頁（如記帳）會在 .filter 時整頁白屏 */
          users: Array.isArray(p.users) ? p.users : c.users,
          groups: Array.isArray(p.groups) ? p.groups : c.groups,
          products: Array.isArray(p.products) ? p.products : c.products,
          customers: Array.isArray(p.customers)
            ? (p.customers as Customer[]).map((cu) => normalizeCustomerMembership(cu))
            : c.customers,
          orders: Array.isArray(p.orders) ? p.orders : c.orders,
          transactions: Array.isArray(p.transactions) ? p.transactions : c.transactions,
          shipments: Array.isArray(p.shipments) ? p.shipments : c.shipments,
          spotProducts: Array.isArray(p.spotProducts) ? p.spotProducts : c.spotProducts,
          shipmentRecords: Array.isArray(p.shipmentRecords) ? p.shipmentRecords : c.shipmentRecords,
          myShipRecords: Array.isArray(p.myShipRecords) ? p.myShipRecords : c.myShipRecords,
          tutorialArticles: Array.isArray(p.tutorialArticles) ? p.tutorialArticles : c.tutorialArticles,
          onboardingTasks: Array.isArray(p.onboardingTasks) ? p.onboardingTasks : c.onboardingTasks,
          auditLogs: Array.isArray(p.auditLogs) ? p.auditLogs : c.auditLogs,
          notificationTemplates: Array.isArray(p.notificationTemplates) ? p.notificationTemplates : c.notificationTemplates,
          suppliers: Array.isArray(p.suppliers) ? p.suppliers : c.suppliers,
          purchaseOrders: Array.isArray(p.purchaseOrders) ? p.purchaseOrders : c.purchaseOrders,
          goodsReceipts: Array.isArray(p.goodsReceipts) ? p.goodsReceipts : c.goodsReceipts,
          inventoryMovements: Array.isArray(p.inventoryMovements) ? p.inventoryMovements : c.inventoryMovements,
          accountsPayables: Array.isArray(p.accountsPayables) ? p.accountsPayables : c.accountsPayables,
          paymentTerms: Array.isArray(p.paymentTerms) ? p.paymentTerms : c.paymentTerms,
          purchaseReturns: Array.isArray(p.purchaseReturns) ? p.purchaseReturns : c.purchaseReturns,
          toasts: [],
        }
      },
      partialize: (s) => ({
        users: s.users,
        groups: s.groups,
        products: s.products,
        spotProducts: s.spotProducts,
        customers: s.customers,
        orders: s.orders,
        transactions: s.transactions,
        shipments: s.shipments,
        shipmentRecords: s.shipmentRecords,
        myShipRecords: s.myShipRecords,
        settings: s.settings,
        tutorialArticles: s.tutorialArticles,
        onboardingTasks: s.onboardingTasks,
        auditLogs: s.auditLogs,
        notificationTemplates: s.notificationTemplates,
        suppliers: s.suppliers,
        purchaseOrders: s.purchaseOrders,
        goodsReceipts: s.goodsReceipts,
        inventoryMovements: s.inventoryMovements,
        accountsPayables: s.accountsPayables,
        paymentTerms: s.paymentTerms,
        purchaseReturns: s.purchaseReturns,
      }),
    },
  ),
)

/** 未來 Firebase / Supabase / Sheets 可改為 async */
export const mockApi = {
  getGroups: () => useDaigouStore.getState().groups,
  saveGroup: (g: Group) => useDaigouStore.getState().updateGroup(g.id, g),
  getOrders: () => useDaigouStore.getState().orders,
  saveOrder: (o: Order) => useDaigouStore.getState().updateOrder(o.id, o),
  getTransactions: () => useDaigouStore.getState().transactions,
  saveTransaction: (t: Transaction) => useDaigouStore.getState().saveTransaction(t),
  getSpotProducts: () => useDaigouStore.getState().spotProducts,
  saveSpotProduct: (p: SpotProduct) => useDaigouStore.getState().updateSpotProduct(p.id, p),
  getShipmentRecords: () => useDaigouStore.getState().shipmentRecords,
  saveShipmentRecord: (r: ShipmentRecord) => useDaigouStore.getState().updateShipmentRecord(r.id, r),
  getMyShipRecords: () => useDaigouStore.getState().myShipRecords,
  saveMyShipRecord: (m: MyShipRecord) => useDaigouStore.getState().updateMyShipRecord(m.id, m),
  getSettings: () => useDaigouStore.getState().settings,
  saveSettings: (p: Partial<Settings>) => useDaigouStore.getState().updateSettings(p),
}
