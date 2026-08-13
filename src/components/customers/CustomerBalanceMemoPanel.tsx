import { useState } from 'react'
import { Btn } from '../../components/ui'
import './customerBalanceMemo.css'
import {
  formatMemoAmount,
  memoAdjustAmount,
  openBalanceMemos,
  type CustomerBalanceMemo,
} from '../../daigou/customerBalanceMemo'
import { useDaigouStore } from '../../daigou/store'

type AddFormProps = {
  customerId: string
  compact?: boolean
}

export function CustomerBalanceMemoAddForm({ customerId, compact }: AddFormProps) {
  const addCustomerBalanceMemo = useDaigouStore((s) => s.addCustomerBalanceMemo)
  const [amount, setAmount] = useState('')

  function submit() {
    addCustomerBalanceMemo(customerId, Number(amount))
    setAmount('')
  }

  return (
    <div className={compact ? 'cbm-add cbm-add--compact' : 'cbm-add'}>
      <label className="cbm-field cbm-field--full">
        <span>金額 NT$</span>
        <input
          type="number"
          placeholder="正數＝客人欠我；負數＝我欠客人"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <p className="cbm-hint">例：100（客人欠 100）、-60（面運抵扣 60）</p>
      <Btn variant="secondary" className="cbm-add-btn" onClick={submit}>
        新增帳務備註
      </Btn>
    </div>
  )
}

type ListProps = {
  customerId: string
  memos: CustomerBalanceMemo[] | undefined
  showSettled?: boolean
}

export function CustomerBalanceMemoList({ customerId, memos, showSettled }: ListProps) {
  const deleteCustomerBalanceMemo = useDaigouStore((s) => s.deleteCustomerBalanceMemo)
  const items = showSettled
    ? (memos ?? []).filter((m) => m.status === 'settled')
    : openBalanceMemos(memos)

  if (items.length === 0) {
    return <p className="cbm-empty">尚無{showSettled ? '' : '待處理'}帳務備註</p>
  }

  return (
    <ul className="cbm-list">
      {items.map((m) => {
        const amt = memoAdjustAmount(m)
        return (
          <li
            key={m.id}
            className={`cbm-item${amt > 0 ? ' cbm-item--plus' : amt < 0 ? ' cbm-item--minus' : ''}${
              m.status === 'settled' ? ' cbm-item--settled' : ''
            }`}
          >
            <div className="cbm-item-head">
              <strong className="cbm-item-amount">{formatMemoAmount(amt)}</strong>
              {m.status === 'settled' ? <span className="cbm-item-settled">已抵銷</span> : null}
            </div>
            {m.settledNote ? <p className="cbm-item-settled-note">{m.settledNote}</p> : null}
            {m.status === 'open' ? (
              <button
                type="button"
                className="cbm-item-delete"
                onClick={() => {
                  if (window.confirm('確定刪除此帳務備註？')) deleteCustomerBalanceMemo(customerId, m.id)
                }}
              >
                刪除
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
