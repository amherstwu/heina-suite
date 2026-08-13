import { useMemo, useState } from 'react'
import type { BankJournalRow, GroupBuyGroup } from '../../api/types'
import {
  BillOrderRow,
  buildPaymentNotification,
  calcOrderBalance,
  customerLivePending,
  formatRemittancePaymentInfo,
  listUnpaidCustomers,
  REMITTANCE_BANK_OPTIONS,
  sumLiveDeposits,
} from './v50Utils'
import './groupbuy.css'
import './v50GroupCard.css'

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`
}

export type V50BillConfirmPayload = {
  nextGroups: GroupBuyGroup[]
  journalRow: BankJournalRow
  targetOrderIds: string[]
  customerName: string
}

type Props = {
  groups: GroupBuyGroup[]
  onConfirmBill: (payload: V50BillConfirmPayload) => void | Promise<void>
  onNotify?: (message: string) => void
  emptyText?: string
}

export function V50BillingReconcile({ groups, onConfirmBill, onNotify, emptyText }: Props) {
  const [billOpen, setBillOpen] = useState(false)
  const [billCustomer, setBillCustomer] = useState('')
  const [billOrders, setBillOrders] = useState<BillOrderRow[]>([])
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [editingAmounts, setEditingAmounts] = useState<Record<string, number | string>>({})
  const [payNote, setPayNote] = useState('')
  const [remittanceDate, setRemittanceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [remittanceBank, setRemittanceBank] = useState<string>(REMITTANCE_BANK_OPTIONS[1])

  const unpaidCustomers = useMemo(() => listUnpaidCustomers(groups), [groups])
  const [search, setSearch] = useState('')

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return unpaidCustomers
    return unpaidCustomers.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true
      return c.orders.some(
        (o) =>
          o.groupName.toLowerCase().includes(q) ||
          (o.items || []).some((it) => String(it.name || '').toLowerCase().includes(q)),
      )
    })
  }, [unpaidCustomers, search])

  const billLiveTotal = useMemo(
    () => sumLiveDeposits(billOrders, selectedOrderIds, editingAmounts),
    [billOrders, selectedOrderIds, editingAmounts],
  )

  function openBill(name: string, orders: BillOrderRow[]) {
    const init: Record<string, number | string> = {}
    const ids = new Set<string>()
    orders.forEach((o) => {
      init[o.id] = o.deposit
      ids.add(o.id)
    })
    setBillCustomer(name)
    setBillOrders(orders)
    setSelectedOrderIds(ids)
    setEditingAmounts(init)
    setPayNote('')
    setRemittanceDate(new Date().toISOString().slice(0, 10))
    setRemittanceBank(REMITTANCE_BANK_OPTIONS[1])
    setBillOpen(true)
  }

  async function confirmBill() {
    const paymentInfo = formatRemittancePaymentInfo(remittanceDate, remittanceBank, payNote)
    const totalIn = billLiveTotal
    const targetIds = [...selectedOrderIds]
    const nextGroups = groups.map((g) => ({
      ...g,
      orders: g.orders.map((o) => {
        if (!targetIds.includes(o.id)) return o
        const newDep = Number(editingAmounts[o.id] !== undefined ? editingAmounts[o.id] : o.deposit) || 0
        return {
          ...o,
          paymentStatus: '已付訂金',
          deposit: newDep,
          balance: calcOrderBalance(o.totalTwd, newDep, o.domesticShip, o.intlShip),
          paymentInfo,
        }
      }),
    }))
    const journalRow: BankJournalRow = {
      id: newId('j'),
      date: remittanceDate,
      bank: remittanceBank || '待分類',
      type: '收入',
      amount: totalIn,
      category: '團購訂金',
      note: `${billCustomer} 沖銷 ${targetIds.length} 筆${payNote.trim() ? ` · ${payNote.trim()}` : ''}`,
    }
    setBillOpen(false)
    await onConfirmBill({
      nextGroups,
      journalRow,
      targetOrderIds: targetIds,
      customerName: billCustomer,
    })
  }

  async function copyNotice(
    name: string,
    orders: BillOrderRow[],
    selectedIds: Set<string>,
    amounts: Record<string, number | string>,
  ) {
    const text = buildPaymentNotification(name, orders, selectedIds, amounts)
    try {
      await navigator.clipboard.writeText(text)
      onNotify?.('已複製匯款通知')
    } catch {
      onNotify?.('複製失敗')
    }
  }

  function noticeStateForCustomer(name: string, orders: BillOrderRow[]) {
    if (billOpen && billCustomer === name) {
      return { selectedIds: selectedOrderIds, amounts: editingAmounts }
    }
    const selectedIds = new Set(orders.map((o) => o.id))
    const amounts: Record<string, number | string> = {}
    orders.forEach((o) => {
      amounts[o.id] = o.deposit
    })
    return { selectedIds, amounts }
  }

  async function copyBillNotice() {
    const { selectedIds, amounts } = noticeStateForCustomer(billCustomer, billOrders)
    await copyNotice(billCustomer, billOrders, selectedIds, amounts)
  }

  async function copyCustomerNotice(name: string, orders: BillOrderRow[]) {
    const { selectedIds, amounts } = noticeStateForCustomer(name, orders)
    await copyNotice(name, orders, selectedIds, amounts)
  }

  if (unpaidCustomers.length === 0) {
    return <p className="text-body text-ds-text-muted">{emptyText ?? '目前無未付款客訂。'}</p>
  }

  return (
    <>
      <input
        className="heina-input v50-acct-search"
        placeholder="搜尋客人、團名、商品…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredCustomers.length === 0 ? (
        <p className="text-body text-ds-text-muted">找不到符合「{search}」的未付款客訂。</p>
      ) : (
      <div className="v50-acct-grid">
        {filteredCustomers.map((c) => {
          const live = customerLivePending(
            c.name,
            c.orders,
            billOpen,
            billCustomer,
            selectedOrderIds,
            editingAmounts,
          )
          return (
            <div key={c.name} className="v50-acct-card-wrap">
              <button
                type="button"
                className="v50-acct-card"
                onClick={() => openBill(c.name, c.orders)}
              >
                <strong>{c.name}</strong>
                <span className="v50-acct-live">即時連動待收 ${live.toLocaleString()}</span>
                <span className="text-meta text-ds-text-muted">{c.orders.length} 筆未付</span>
              </button>
              <button
                type="button"
                className="v50-acct-copy"
                onClick={() => void copyCustomerNotice(c.name, c.orders)}
              >
                一鍵複製匯款通知
              </button>
            </div>
          )
        })}
      </div>
      )}

      {billOpen ? (
        <div className="v50-order-backdrop" onClick={() => setBillOpen(false)}>
          <div className="v50-order-card v50-bill-card" onClick={(e) => e.stopPropagation()}>
            <div className="v50-order-head">
              <h3 className="v50-order-title">{billCustomer} · 對帳沖銷</h3>
              <button type="button" className="v50-order-close" onClick={() => setBillOpen(false)} aria-label="關閉">
                ✕
              </button>
            </div>
            {billOrders.map((o) => (
              <div key={o.id} className="v50-bill-block">
                <label className="v50-bill-check">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.has(o.id)}
                    onChange={() => {
                      setSelectedOrderIds((prev) => {
                        const n = new Set(prev)
                        if (n.has(o.id)) n.delete(o.id)
                        else n.add(o.id)
                        return n
                      })
                    }}
                  />
                  {o.groupName}
                </label>
                <ul className="v50-bill-items">
                  {(o.items || []).map((it, i) => (
                    <li key={i}>
                      {it.name} {it.qty}x${Number(it.twd).toLocaleString()}
                    </li>
                  ))}
                </ul>
                <label className="v50-order-field">
                  <span className="v50-order-label">實際沖銷訂金（實收金額）</span>
                  <input
                    type="number"
                    className="v50-order-input"
                    value={editingAmounts[o.id] ?? o.deposit}
                    onChange={(e) =>
                      setEditingAmounts((m) => ({
                        ...m,
                        [o.id]: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            ))}
            <div className="v50-bill-total">本次合計入帳 ${billLiveTotal.toLocaleString()}</div>
            <div className="v50-bill-remit-grid mt-2">
              <label className="v50-order-field">
                <span className="v50-order-label">匯款日</span>
                <input
                  type="date"
                  className="v50-order-input"
                  value={remittanceDate}
                  onChange={(e) => setRemittanceDate(e.target.value)}
                />
              </label>
              <label className="v50-order-field">
                <span className="v50-order-label">銀行</span>
                <select
                  className="v50-order-input"
                  value={remittanceBank}
                  onChange={(e) => setRemittanceBank(e.target.value)}
                >
                  {REMITTANCE_BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              className="v50-order-input mt-2"
              placeholder="匯款備註（選填，會顯示為 #備註）"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
            />
            <div className="v50-order-actions mt-3">
              <button type="button" className="v50-order-btn-cancel" onClick={() => void copyBillNotice()}>
                一鍵複製匯款通知
              </button>
              <button type="button" className="v50-order-btn-save" onClick={() => void confirmBill()}>
                確認沖銷
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
