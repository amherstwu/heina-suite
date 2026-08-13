import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../context/useApi'
import type {
  GroupBuyAppData,
  VerifyBankViewerAccessPayload,
  VerifyBankViewerAccessResult,
} from '../api/types'
import './bankAccountViewer.css'

export function BankAccountViewerPage() {
  const api = useApi()
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [bankInfo, setBankInfo] = useState<string | null>(null)

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    try {
      const data = await api.call<GroupBuyAppData>({ module: 'groupbuy', action: 'getAppData' })
      setEnabled(data.bankViewer?.enabled !== false)
    } catch {
      setEnabled(true)
    } finally {
      setLoadingMeta(false)
    }
  }, [api])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload: VerifyBankViewerAccessPayload = {
        customerName: customerName.trim(),
        accessPassword: password,
      }
      const res = await api.call<VerifyBankViewerAccessResult>({
        module: 'groupbuy',
        action: 'verifyBankViewerAccess',
        payload,
      })
      if (!res.ok) {
        setBankInfo(null)
        setError(res.message || '驗證失敗')
        return
      }
      setBankInfo(res.bankInfo || '')
      setPassword('')
    } catch (err) {
      setBankInfo(null)
      setError(err instanceof Error ? err.message : '連線失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  function resetView() {
    setBankInfo(null)
    setError('')
    setPassword('')
  }

  return (
    <div className="bv">
      <header className="bv-top">
        <Link to="/lookup" className="bv-back">
          ← 回查單專區
        </Link>
        <h1 className="bv-brand">匯款帳號查詢</h1>
        <p className="bv-lead">請輸入團主提供的查詢密碼，並填寫你在群裡的名字。</p>
      </header>

      <main className="bv-main">
        {loadingMeta ? (
          <p className="bv-muted">載入中…</p>
        ) : !enabled ? (
          <div className="bv-panel bv-panel-warn">
            <p>目前未開放線上查詢銀行帳號，請直接私訊團主。</p>
          </div>
        ) : bankInfo != null ? (
          <div className="bv-panel bv-panel-ok">
            <h2 className="bv-panel-title">匯款資訊</h2>
            <pre className="bv-bank-info">{bankInfo}</pre>
            <p className="bv-hint">匯款後請記得回報付款，並在備註寫上群裡名字。</p>
            <button type="button" className="bv-btn bv-btn-ghost" onClick={resetView}>
              重新查詢
            </button>
          </div>
        ) : (
          <form className="bv-panel" onSubmit={onSubmit}>
            <label className="bv-field">
              <span>群裡名字</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="與群組顯示名稱一致"
                autoComplete="nickname"
                required
              />
            </label>
            <label className="bv-field">
              <span>查詢密碼</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="向團主索取（約每三個月更新）"
                autoComplete="off"
                name="bank-viewer-access"
                required
              />
            </label>
            {error ? <p className="bv-error">{error}</p> : null}
            <button type="submit" className="bv-btn" disabled={submitting}>
              {submitting ? '驗證中…' : '查看匯款帳號'}
            </button>
            <p className="bv-hint">
              密碼請主動向團主索取；約每 3 個月會更換一次密碼。進出與打錯密碼都會留下紀錄。
            </p>
          </form>
        )}
      </main>
    </div>
  )
}
