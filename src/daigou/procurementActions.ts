import type {
  AccountsPayable,
  DaigouState,
  GoodsReceipt,
  InventoryMovement,
  PaymentTerm,
  PurchaseOrder,
  PurchaseReturn,
  Supplier,
  ToastMessage,
  Transaction,
} from './types'

type ProcurementApi = DaigouState & {
  addToast: (message: string, tone?: ToastMessage['tone']) => void
  appendAuditLog: (e: Omit<import('./types').AuditLogEntry, 'id' | 'createdAt'>) => void
}

type Set = (partial: Partial<ProcurementApi> | ((s: ProcurementApi) => Partial<ProcurementApi>)) => void
type Get = () => ProcurementApi

export function procurementActions(
  set: Set,
  get: Get,
  rid: (prefix: string) => string,
  todayStr: () => string,
) {
  return {
    addSupplier(payload: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
      const ts = Date.now()
      const s: Supplier = { ...payload, id: rid('sup'), createdAt: ts, updatedAt: ts }
      set((st) => ({ ...st, suppliers: [s, ...st.suppliers] }))
      get().addToast(`已新增供應商：${s.name}`, 'ok')
    },

    updateSupplier(id: string, p: Partial<Supplier>) {
      set((st) => ({
        ...st,
        suppliers: st.suppliers.map((x) => (x.id === id ? { ...x, ...p, updatedAt: Date.now() } : x)),
      }))
      get().addToast('供應商資料已更新', 'ok')
    },

    addPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'poNo' | 'subtotalAmount' | 'totalAmount' | 'payableAmount' | 'approval' | 'createdAt' | 'updatedAt'>) {
      const ts = Date.now()
      const poNo = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${100 + get().purchaseOrders.length}`
      const sum = po.items.reduce((a, it) => a + it.unitCost * it.qtyOrdered, 0)
      const total = sum + (po.shippingCost ?? 0) + (po.taxAmount ?? 0) + (po.otherCost ?? 0) - (po.discountAmount ?? 0)
      const id = rid('po')
      const next: PurchaseOrder = {
        ...po,
        id,
        poNo,
        subtotalAmount: sum,
        totalAmount: total,
        payableAmount: total,
        approval: { status: 'draft', requestedBy: 'u1', requestedAt: ts },
        status: po.status ?? 'draft',
        createdAt: ts,
        updatedAt: ts,
      }
      set((st) => ({ ...st, purchaseOrders: [next, ...st.purchaseOrders] }))
      get().addToast(`已建立採購單 ${poNo}`, 'ok')
      return id
    },

    updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>) {
      set((st) => ({
        ...st,
        purchaseOrders: st.purchaseOrders.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)),
      }))
      get().addToast('採購單已更新', 'ok')
    },

    approvePurchaseOrder(id: string, approvedBy = 'u1') {
      set((st) => ({
        ...st,
        purchaseOrders: st.purchaseOrders.map((x) =>
          x.id === id
            ? {
                ...x,
                status: x.status === 'draft' ? 'approved' : x.status,
                approval: { ...x.approval, status: 'approved', approvedBy, approvedAt: Date.now() },
                updatedAt: Date.now(),
              }
            : x,
        ),
      }))
      get().addToast('採購單已核准', 'ok')
    },

    rejectPurchaseOrder(id: string, reason: string, rejectedBy = 'u1') {
      set((st) => ({
        ...st,
        purchaseOrders: st.purchaseOrders.map((x) =>
          x.id === id
            ? {
                ...x,
                approval: { ...x.approval, status: 'rejected', reason, rejectedBy, rejectedAt: Date.now() },
                updatedAt: Date.now(),
              }
            : x,
        ),
      }))
      get().addToast('採購單已退回', 'info')
    },

    confirmGoodsReceipt(r: Omit<GoodsReceipt, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
      const ts = Date.now()
      const gr: GoodsReceipt = {
        ...r,
        id: rid('gr'),
        status: 'confirmed',
        createdAt: ts,
        updatedAt: ts,
      }
      const po = get().purchaseOrders.find((x) => x.id === r.poId)
      const movement: InventoryMovement[] = []
      const receiptLineMap = new Map(r.lines.map((ln) => [ln.poItemId, ln.qtyReceived]))
      set((st) => ({
        ...st,
        goodsReceipts: [gr, ...st.goodsReceipts],
        purchaseOrders: st.purchaseOrders.map((x) => {
          if (x.id !== r.poId) return x
          const items = x.items.map((it) => {
            const plus = receiptLineMap.get(it.id) ?? 0
            if (plus > 0 && it.productId) {
              movement.push({
                id: rid('im'),
                productId: it.productId,
                sourceType: 'purchase_receipt',
                sourceId: gr.id,
                movementType: 'in',
                qty: plus,
                unitCost: it.unitCost,
                occurredAt: r.receiptDate,
              })
            }
            return { ...it, qtyReceived: (it.qtyReceived ?? 0) + plus, receivedAt: plus > 0 ? r.receiptDate : it.receivedAt }
          })
          const allReceived = items.every((it) => (it.qtyReceived ?? 0) >= it.qtyOrdered)
          return { ...x, items, status: allReceived ? 'received' : 'partial_received', updatedAt: ts }
        }),
        inventoryMovements: [...movement, ...st.inventoryMovements],
        products: st.products.map((p) => {
          const addQty = movement.filter((m) => m.productId === p.id).reduce((a, m) => a + m.qty, 0)
          return addQty ? { ...p, stockQty: Math.max(0, p.stockQty + addQty) } : p
        }),
      }))
      get().addToast(`已確認到貨 ${gr.receiptNo}`, 'ok')
      if (po) get().appendAuditLog({ action: 'po_receipt_confirmed', entityType: 'product', entityId: po.id, after: gr.receiptNo, createdBy: 'u1' })
    },

    createPayableForPurchaseOrder(poId: string, dueDate: string) {
      const po = get().purchaseOrders.find((x) => x.id === poId)
      if (!po) {
        get().addToast('找不到採購單', 'err')
        return
      }
      const ts = Date.now()
      const ap: AccountsPayable = {
        id: rid('ap'),
        poId: po.id,
        supplierId: po.supplierId,
        dueDate,
        originalAmount: po.totalAmount,
        paidAmount: 0,
        remainingAmount: po.totalAmount,
        status: 'unpaid',
        currency: po.currency,
        createdAt: ts,
        updatedAt: ts,
      }
      set((st) => ({ ...st, accountsPayables: [ap, ...st.accountsPayables] }))
      get().addToast('已建立應付帳款', 'ok')
    },

    addPaymentTerm(pt: Omit<PaymentTerm, 'id'>) {
      set((st) => ({ ...st, paymentTerms: [{ ...pt, id: rid('pt') }, ...st.paymentTerms] }))
      get().addToast('已新增付款排程', 'ok')
    },

    markPaymentTermPaid(id: string, actualAmount: number, actualDate = todayStr(), method = '銀行轉帳') {
      const term = get().paymentTerms.find((x) => x.id === id)
      if (!term) {
        get().addToast('找不到付款排程', 'err')
        return
      }
      const payable = get().accountsPayables.find((x) => x.id === term.payableId)
      set((st) => ({
        ...st,
        paymentTerms: st.paymentTerms.map((x) =>
          x.id === id ? { ...x, actualAmount, actualDate, method, status: 'paid' } : x,
        ),
        accountsPayables: st.accountsPayables.map((x) => {
          if (x.id !== term.payableId) return x
          const paidAmount = x.paidAmount + actualAmount
          const remainingAmount = Math.max(0, x.originalAmount - paidAmount)
          return {
            ...x,
            paidAmount,
            remainingAmount,
            status: remainingAmount <= 0 ? 'paid' : 'partial',
            updatedAt: Date.now(),
          }
        }),
        transactions: [
          ...(payable
            ? [
                {
                  id: rid('t'),
                  type: 'expense' as const,
                  category: 'product_cost' as const,
                  amount: actualAmount,
                  currency: payable.currency === 'USD' ? 'USD' : payable.currency === 'JPY' ? 'JPY' : 'TWD',
                  date: actualDate,
                  note: `採購付款 ${payable.poId}`,
                  createdAt: Date.now(),
                } satisfies Transaction,
              ]
            : []),
          ...st.transactions,
        ],
      }))
      get().addToast('已登記付款與記帳分錄', 'ok')
    },

    createPurchaseReturn(ret: Omit<PurchaseReturn, 'id' | 'createdAt' | 'updatedAt'>) {
      const ts = Date.now()
      const pr: PurchaseReturn = { ...ret, id: rid('pret'), createdAt: ts, updatedAt: ts }
      const po = get().purchaseOrders.find((x) => x.id === ret.poId)
      set((st) => ({
        ...st,
        purchaseReturns: [pr, ...st.purchaseReturns],
        inventoryMovements: [
          ...ret.lines
            .filter((ln) => ln.productId && ln.qty > 0)
            .map((ln) => ({
              id: rid('im'),
              productId: ln.productId as string,
              sourceType: 'purchase_return' as const,
              sourceId: pr.id,
              movementType: 'out' as const,
              qty: ln.qty,
              unitCost: ln.unitCost,
              occurredAt: ret.returnDate,
              note: ret.reason,
            })),
          ...st.inventoryMovements,
        ],
        products: st.products.map((p) => {
          const qtyOut = ret.lines.filter((ln) => ln.productId === p.id).reduce((a, ln) => a + ln.qty, 0)
          return qtyOut ? { ...p, stockQty: Math.max(0, p.stockQty - qtyOut) } : p
        }),
        purchaseOrders: st.purchaseOrders.map((x) => {
          if (!po || x.id !== po.id) return x
          return {
            ...x,
            items: x.items.map((it) => {
              const back = ret.lines.filter((ln) => ln.poItemId === it.id).reduce((a, ln) => a + ln.qty, 0)
              return back ? { ...it, qtyReturned: (it.qtyReturned ?? 0) + back } : it
            }),
            updatedAt: ts,
          }
        }),
        accountsPayables: st.accountsPayables.map((x) => {
          if (!po || x.poId !== po.id) return x
          const remainingAmount = Math.max(0, x.remainingAmount - ret.totalAmount)
          return { ...x, remainingAmount, originalAmount: Math.max(0, x.originalAmount - ret.totalAmount), updatedAt: ts }
        }),
      }))
      get().addToast('已建立採購退貨單', 'ok')
    },
  }
}
