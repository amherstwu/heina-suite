import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  addBankLastFive,
  normalizeBankLastFiveCodes,
  removeBankLastFive,
} from '../../daigou/customerBankLastFive'
import './customerBankLastFive.css'

type Props = {
  codes?: string[]
  onChange: (next: string[]) => void
  /** compact＝列表小卡；full＝詳情頁 */
  variant?: 'compact' | 'full'
  className?: string
}

export function CustomerBankLastFiveEditor({
  codes,
  onChange,
  variant = 'full',
  className = '',
}: Props) {
  const list = normalizeBankLastFiveCodes(codes)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')

  function commitAdd() {
    const { next, error } = addBankLastFive(list, draft)
    if (error) {
      setErr(error)
      return
    }
    onChange(next)
    setDraft('')
    setErr('')
  }

  return (
    <div
      className={'cu-bank ' + (variant === 'compact' ? 'cu-bank--compact ' : '') + className}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {variant === 'full' ? (
        <p className="cu-bank-label">銀行後五碼（可多筆，對帳用）</p>
      ) : (
        <p className="cu-bank-label">後五碼</p>
      )}
      <div className="cu-bank-chips">
        {list.length === 0 ? (
          <span className="cu-bank-empty">尚未登記</span>
        ) : (
          list.map((code) => (
            <span key={code} className="cu-bank-chip">
              <span className="cu-bank-chip-code">{code}</span>
              <button
                type="button"
                className="cu-bank-chip-x"
                aria-label={`移除後五碼 ${code}`}
                onClick={() => {
                  onChange(removeBankLastFive(list, code))
                  setErr('')
                }}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="cu-bank-add">
        <input
          className="cu-bank-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          placeholder="輸入後五碼"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.replace(/\D/g, '').slice(0, 5))
            setErr('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitAdd()
            }
          }}
        />
        <button type="button" className="cu-bank-add-btn" onClick={commitAdd}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          新增
        </button>
      </div>
      {err ? <p className="cu-bank-err">{err}</p> : null}
    </div>
  )
}
