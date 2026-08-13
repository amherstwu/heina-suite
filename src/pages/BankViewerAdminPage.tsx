import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useApi } from '../context/useApi'
import type { BankViewerAdminConfig, SaveBankViewerPayload } from '../api/types'
import {
  BANK_VIEWER_PASSWORD_MONTHS,
  bankViewerLogReasonLabel,
} from '../modules/bank-viewer/bankViewerLogic'
import './bankViewerAdminPage.css'

function formatAt(ts: number) {
  try {
    return new Date(ts).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return String(ts)
  }
}

function publicBankUrl() {
  const base = `${window.location.origin}${window.location.pathname.replace(/\/?$/, '')}`
  return `${base}#/bank`
}

export function BankViewerAdminPage() {
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [bankInfo, setBankInfo] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [logs, setLogs] = useState<BankViewerAdminConfig['logs']>([])

  const monthsSince = useMemo(() => {
    const ms = Math.max(0, Date.now() - (passwordUpdatedAt || 0))
    return Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4375))
  }, [passwordUpdatedAt])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.call<{ ok: boolean; config: BankViewerAdminConfig }>({
        module: 'groupbuy',
        action: 'getBankViewerAdmin',
      })
      const cfg = res.config
      setEnabled(cfg.enabled !== false)
      setBankInfo(cfg.bankInfo || '')
      setCurrentPassword(cfg.accessPassword || '')
      setPasswordUpdatedAt(cfg.passwordUpdatedAt || 0)
      setLogs(cfg.logs || [])
      setNewPassword('')
      setConfirmPassword('')
      setStatusMsg('')
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

  const save = useCallback(
    async (extra?: Partial<SaveBankViewerPayload>) => {
      if (newPassword.trim() || confirmPassword.trim()) {
        if (newPassword.trim() !== confirmPassword.trim()) {
          setStatusMsg('兩次輸入的新密碼不一致')
          return
        }
      }
      setSaving(true)
      setStatusMsg('儲存中…')
      try {
        const payload: SaveBankViewerPayload = {
          enabled,
          bankInfo,
          newPassword: newPassword.trim() || undefined,
          ...extra,
        }
        const res = await api.call<{ ok: boolean; message?: string; config: BankViewerAdminConfig }>({
          module: 'groupbuy',
          action: 'saveBankViewer',
          payload,
        })
        const cfg = res.config
        setEnabled(cfg.enabled !== false)
        setBankInfo(cfg.bankInfo || '')
        setCurrentPassword(cfg.accessPassword || '')
        setPasswordUpdatedAt(cfg.passwordUpdatedAt || 0)
        setLogs(cfg.logs || [])
        setNewPassword('')
        setConfirmPassword('')
        if (!String(cfg.accessPassword || '').trim()) {
          setStatusMsg('儲存異常：密碼為空，請重新設定密碼後再存一次')
        } else {
          setStatusMsg(res.message || '已儲存')
        }
      } catch (e) {
        console.error(e)
        setStatusMsg('儲存失敗')
      } finally {
        setSaving(false)
      }
    },
    [api, bankInfo, confirmPassword, enabled, newPassword],
  )

  async function copyLink() {
    const url = publicBankUrl()
    try {
      await navigator.clipboard.writeText(url)
      setStatusMsg('已複製客人連結')
    } catch {
      setStatusMsg(`請手動複製：${url}`)
    }
  }

  async function clearLogs() {
    if (!window.confirm('確定清空全部進出／失敗紀錄？此操作無法復原。')) return
    await save({ clearLogs: true })
  }

  return (
    <div className="bva-page">
      {statusMsg ? <div className="bva-toast">{statusMsg}</div> : null}

      <header className="bva-hero">
        <div>
          <h1 className="bva-title">銀行帳號查詢</h1>
          <p className="bva-sub">
            客人連結需密碼＋群裡名字才看得到匯款帳號；成功與打錯密碼都會留下紀錄。建議約每{' '}
            {BANK_VIEWER_PASSWORD_MONTHS} 個月更換密碼。
          </p>
        </div>
        <div className="bva-hero-actions">
          <button type="button" className="bva-btn bva-btn-ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> 重新載入
          </button>
          <button type="button" className="bva-btn bva-btn-ghost" onClick={() => void copyLink()}>
            <Copy size={16} /> 複製連結
          </button>
          <a className="bva-btn bva-btn-ghost" href={publicBankUrl()} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} /> 開啟客人頁
          </a>
          <button type="button" className="bva-btn" onClick={() => void save()} disabled={saving || loading}>
            <Save size={16} /> 儲存設定
          </button>
        </div>
      </header>

      {loading ? (
        <p className="bva-muted">載入中…</p>
      ) : (
        <>
          <section className="bva-card">
            <h2 className="bva-card-title">開關與提醒</h2>
            <label className="bva-check">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              開放客人查詢銀行帳號
            </label>
            <p className={`bva-remind ${monthsSince >= BANK_VIEWER_PASSWORD_MONTHS ? 'is-warn' : ''}`}>
              目前密碼：<code>{currentPassword || '（未設定）'}</code>
              <br />
              上次更新：{passwordUpdatedAt ? formatAt(passwordUpdatedAt) : '—'}
              {monthsSince > 0 ? `（約 ${monthsSince} 個月前）` : ''}
              {monthsSince >= BANK_VIEWER_PASSWORD_MONTHS
                ? ` — 已超過建議更換週期（${BANK_VIEWER_PASSWORD_MONTHS} 個月），請更新密碼並通知客人。`
                : ''}
            </p>
            <p className="bva-link-line">
              客人連結：<code>{publicBankUrl()}</code>
            </p>
          </section>

          <section className="bva-card">
            <h2 className="bva-card-title">匯款帳號內容</h2>
            <textarea
              className="bva-textarea"
              rows={8}
              value={bankInfo}
              onChange={(e) => setBankInfo(e.target.value)}
              placeholder={'例：\n銀行：○○銀行\n帳號：000-000-000000\n戶名：○○○'}
            />
          </section>

          <section className="bva-card">
            <h2 className="bva-card-title">更換查詢密碼</h2>
            <p className="bva-help">留空＝不更改。更新後請主動告知有需要的客人。</p>
            <div className="bva-grid-2">
              <label className="bva-field">
                <span>新密碼</span>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  name="bank-viewer-new-access"
                  placeholder="留空不改"
                />
              </label>
              <label className="bva-field">
                <span>再輸入一次</span>
                <input
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  name="bank-viewer-confirm-access"
                  placeholder="與新密碼相同"
                />
              </label>
            </div>
          </section>

          <section className="bva-card">
            <div className="bva-card-head">
              <h2 className="bva-card-title">進出紀錄</h2>
              <button type="button" className="bva-btn bva-btn-danger" onClick={() => void clearLogs()} disabled={saving}>
                <Trash2 size={16} /> 清空紀錄
              </button>
            </div>
            {logs.length === 0 ? (
              <p className="bva-muted">尚無紀錄</p>
            ) : (
              <div className="bva-table-wrap">
                <table className="bva-table">
                  <thead>
                    <tr>
                      <th>時間</th>
                      <th>群裡名字</th>
                      <th>結果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((row) => (
                      <tr key={row.id} className={row.ok ? 'is-ok' : 'is-fail'}>
                        <td>{formatAt(row.at)}</td>
                        <td>{row.customerName || '—'}</td>
                        <td>{bankViewerLogReasonLabel(row.reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
