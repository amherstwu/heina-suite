import type { ReactNode } from 'react'
import type { GroupBuyItem, GroupBuyOrder } from '../../api/types'
import { calcOrderBalance, isV50CodPayment, resolveV50Deposit } from './v50Utils'
import './v50OrderEntryModal.css'

type TempItem = { name: string; qty: number; jpy: string; twd: string }

type Props = {
  open: boolean
  order: GroupBuyOrder
  tempItem: TempItem
  draftTotal: number
  suggestedDeposit: number
  onClose: () => void
  onChangeOrder: (next: GroupBuyOrder) => void
  onChangeTempItem: (next: TempItem) => void
  onSave: () => void
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'v50-order-field v50-order-field-wide' : 'v50-order-field'}>
      <span className="v50-order-label">{label}</span>
      {children}
    </label>
  )
}

const PAY_STATUSES = ['未付款', '已付訂金', '已付款', '貨到付款'] as const

export function V50OrderEntryModal({
  open,
  order,
  tempItem,
  draftTotal,
  suggestedDeposit,
  onClose,
  onChangeOrder,
  onChangeTempItem,
  onSave,
}: Props) {
  if (!open) return null

  const isCod = isV50CodPayment(order.paymentStatus)
  const deposit = resolveV50Deposit(order.paymentStatus, draftTotal, order.deposit)
  const balance = calcOrderBalance(draftTotal, deposit, order.domesticShip, order.intlShip)

  function patch<K extends keyof GroupBuyOrder>(key: K, value: GroupBuyOrder[K]) {
    onChangeOrder({ ...order, [key]: value })
  }

  function patchPaymentStatus(status: string) {
    const nextDeposit = resolveV50Deposit(status, draftTotal, status === '貨到付款' ? 0 : order.deposit)
    onChangeOrder({
      ...order,
      paymentStatus: status,
      deposit: nextDeposit,
      balance: calcOrderBalance(draftTotal, nextDeposit, order.domesticShip, order.intlShip),
    })
  }

  function patchShip(domesticShip: number, intlShip: number) {
    onChangeOrder({
      ...order,
      domesticShip,
      intlShip,
      balance: calcOrderBalance(draftTotal, deposit, domesticShip, intlShip),
    })
  }

  function addItem() {
    if (!tempItem.name.trim() || !tempItem.twd) return
    const item: GroupBuyItem = {
      name: tempItem.name.trim(),
      qty: Number(tempItem.qty) || 1,
      jpy: Number(tempItem.jpy) || 0,
      twd: Number(tempItem.twd) || 0,
    }
    onChangeOrder({ ...order, items: [...order.items, item] })
    onChangeTempItem({ name: '', qty: 1, jpy: '', twd: '' })
  }

  function removeItem(index: number) {
    onChangeOrder({ ...order, items: order.items.filter((_, i) => i !== index) })
  }

  return (
    <div className="v50-order-backdrop" onClick={onClose}>
      <div className="v50-order-card" onClick={(e) => e.stopPropagation()}>
        <div className="v50-order-head">
          <h3 className="v50-order-title">客訂明細錄入</h3>
          <button type="button" className="v50-order-close" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>

        <div className="v50-order-form">
          <Field label="名字" wide>
            <input
              className="v50-order-input"
              placeholder="客人姓名"
              value={order.customerName}
              onChange={(e) => patch('customerName', e.target.value)}
              required
            />
          </Field>

          <p className="v50-order-section">商品品項</p>
          {order.items.length > 0 ? (
            <ul className="v50-order-item-list">
              {order.items.map((it, i) => (
                <li key={`${it.name}-${i}`}>
                  <span>
                    {it.name} ×{it.qty} · ¥{it.jpy} · 台幣 ${it.twd}/件
                    {it.qty > 1 ? `（小計 ${(Number(it.twd) || 0) * (Number(it.qty) || 1)}）` : ''}
                  </span>
                  <button type="button" className="v50-order-remove" onClick={() => removeItem(i)}>
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v50-order-hint">尚未加入品項</p>
          )}

          <div className="v50-order-item-grid">
            <Field label="商品" wide>
              <input
                className="v50-order-input"
                placeholder="品名"
                value={tempItem.name}
                onChange={(e) => onChangeTempItem({ ...tempItem, name: e.target.value })}
              />
            </Field>
            <Field label="數量">
              <input
                type="number"
                min={1}
                className="v50-order-input"
                value={tempItem.qty}
                onChange={(e) => onChangeTempItem({ ...tempItem, qty: Number(e.target.value) })}
              />
            </Field>
            <Field label="日幣單價">
              <input
                type="number"
                min={0}
                className="v50-order-input"
                placeholder="¥"
                value={tempItem.jpy}
                onChange={(e) => onChangeTempItem({ ...tempItem, jpy: e.target.value })}
              />
            </Field>
            <Field label="台幣單價">
              <input
                type="number"
                min={0}
                className="v50-order-input"
                placeholder="每件"
                value={tempItem.twd}
                onChange={(e) => onChangeTempItem({ ...tempItem, twd: e.target.value })}
              />
            </Field>
          </div>
          <button type="button" className="v50-order-btn-outline" onClick={addItem}>
            加入品項
          </button>

          <div className="v50-order-summary">
            <div>
              <span className="v50-order-label">總額</span>
              <strong>${draftTotal.toLocaleString()}</strong>
            </div>
            <div>
              <span className="v50-order-label">尾款</span>
              <strong>${balance.toLocaleString()}</strong>
            </div>
          </div>

          <div className="v50-order-row">
            {isCod ? (
              <Field label="訂金" wide>
                <p className="v50-order-hint" style={{ margin: 0 }}>
                  貨到付款：無需收訂金，全額於取貨／出貨時收取（應收 ${balance.toLocaleString()}）
                </p>
              </Field>
            ) : (
              <Field label="訂金">
                <input
                  type="number"
                  min={0}
                  className="v50-order-input"
                  value={order.deposit != null && String(order.deposit) !== '' ? order.deposit : suggestedDeposit}
                  onChange={(e) => {
                    const dep = Number(e.target.value)
                    onChangeOrder({
                      ...order,
                      deposit: dep,
                      balance: calcOrderBalance(draftTotal, dep, order.domesticShip, order.intlShip),
                    })
                  }}
                />
              </Field>
            )}
            <Field label="付款狀況">
              <select
                className="v50-order-input"
                value={order.paymentStatus}
                onChange={(e) => patchPaymentStatus(e.target.value)}
              >
                {PAY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="v50-order-row">
            <Field label="國內運費">
              <input
                type="number"
                min={0}
                className="v50-order-input"
                value={order.domesticShip}
                onChange={(e) => patchShip(Number(e.target.value), order.intlShip)}
              />
            </Field>
            <Field label="國際運費">
              <input
                type="number"
                min={0}
                className="v50-order-input"
                value={order.intlShip}
                onChange={(e) => patchShip(order.domesticShip, Number(e.target.value))}
              />
            </Field>
          </div>

          <p className="v50-order-hint">
            {isCod
              ? '貨到付款不產生待收訂金；尾款欄為取貨／出貨時應收全額（含運費）。'
              : '台幣單價為每件售價，總額 = 各品項單價×數量加總；訂金預設為總額 − 20（總額 ≤ 20 則為全額）。'}
          </p>

          <div className="v50-order-actions">
            <button type="button" className="v50-order-btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="button" className="v50-order-btn-save" onClick={onSave}>
              儲存客訂
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
