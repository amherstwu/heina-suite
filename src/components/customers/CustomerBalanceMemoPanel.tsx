import { useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Btn, Chip } from '../../components/ui'
import './customerBalanceMemo.css'
import {
  formatMemoAmount,
  hasOpenBalanceMemos,
  memoAdjustAmount,
  openBalanceMemos,
  sumOpenMemoAdjust,
  type CustomerBalanceMemo,
} from '../../daigou/customerBalanceMemo'
import { useDaigouStore } from '../../daigou/store'

function readCollapsed(storageKey?: string, defaultCollapsed = false) {
  if (!storageKey) return defaultCollapsed
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return defaultCollapsed
  }
}

function writeCollapsed(storageKey: string | undefined, collapsed: boolean) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageKey, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

type CollapsibleProps = {
  title: string
  summary?: string
  children: ReactNode
  className?: string
  storageKey?: string
  defaultCollapsed?: boolean
  onToggleClick?: (e: MouseEvent) => void
}

export function BalanceMemoCollapsible({
  title,
  summary,
  children,
  className,
  storageKey,
  defaultCollapsed = false,
  onToggleClick,
}: CollapsibleProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey, defaultCollapsed))

  function toggle(e: MouseEvent) {
    onToggleClick?.(e)
    const next = !collapsed
    setCollapsed(next)
    writeCollapsed(storageKey, next)
  }

  return (
    <section className={['cbm-collapsible', collapsed ? 'cbm-collapsible--collapsed' : '', className]
      .filter(Boolean)
      .join(' ')}>
      <button type="button" className="cbm-collapsible-toggle" onClick={toggle} aria-expanded={!collapsed}>
        <span className="cbm-collapsible-title">{title}</span>
        {summary ? <span className="cbm-collapsible-summary">{summary}</span> : null}
        <ChevronDown className={'cbm-collapsible-chevron' + (collapsed ? '' : ' cbm-collapsible-chevron--open')} aria-hidden />
      </button>
      {!collapsed ? <div className="cbm-collapsible-body">{children}</div> : null}
    </section>
  )
}

type DetailSectionProps = {
  customerId: string
  memos: CustomerBalanceMemo[] | undefined
}

export function CustomerBalanceMemoDetailSection({ customerId, memos }: DetailSectionProps) {
  const open = openBalanceMemos(memos)
  const adjust = sumOpenMemoAdjust(memos)
  const summaryParts = [
    open.length > 0 ? `${open.length} 筆待處理` : '無待處理',
    adjust !== 0 ? `合計 ${formatMemoAmount(adjust)}` : '',
  ].filter(Boolean)

  return (
    <BalanceMemoCollapsible
      title="帳務備註"
      summary={summaryParts.join(' · ')}
      storageKey={`heina.cbm.collapsed.${customerId}`}
      className="cbm-collapsible--detail"
    >
      <p className="cbm-detail-hint">
        手動輸入金額：正數＝客人欠我、負數＝我欠客人。付款回報可勾選結清；未勾選則出貨物流加總至尾款。
      </p>
      {hasOpenBalanceMemos(memos) ? (
        <div className="cbm-detail-badge">
          <Chip tone="warn">有待處理帳務</Chip>
        </div>
      ) : null}
      <div className="cbm-detail-grid">
        <div>
          <p className="cbm-detail-subtitle">待處理</p>
          <CustomerBalanceMemoList customerId={customerId} memos={memos} />
          <CustomerBalanceMemoAddForm customerId={customerId} />
        </div>
        <div>
          <p className="cbm-detail-subtitle">已抵銷紀錄</p>
          <CustomerBalanceMemoList customerId={customerId} memos={memos} showSettled />
        </div>
      </div>
    </BalanceMemoCollapsible>
  )
}

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
