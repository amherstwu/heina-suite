import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileDown, FileUp, Plus, RefreshCw, Trash2, Undo2 } from 'lucide-react'
import { Btn, Empty, PageHeader } from '../components/ui'
import { PageLayout } from '../components/app/PageLayout'
import { useApi } from '../context/useApi'
import type { BankJournalRow } from '../api/types'
import { localTodayIso } from '../modules/groupbuy/v50Utils'
import {
  displayJournalLastFive,
  displayJournalNote,
  formatLastFiveDisplay,
  journalFromXlsxBuffer,
  journalToXlsxBuffer,
  mergeJournalById,
  newJournalId,
  normalizeLastFive,
  peekJournalUndo,
  popJournalUndo,
  pushJournalUndo,
  sortJournalNewest,
} from '../modules/groupbuy/journalLogic'
import './journalPage.css'

function money(n: number) {
  return `NT$ ${Math.round(n || 0).toLocaleString('zh-TW')}`
}

export function JournalPage() {
  const api = useApi()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<BankJournalRow[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [draft, setDraft] = useState({
    date: localTodayIso(),
    amount: '',
    note: '',
    lastFive: '',
  })

  const refreshUndo = useCallback(() => {
    setCanUndo(!!peekJournalUndo())
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.call<{ bankJournal?: BankJournalRow[] }>({
        module: 'groupbuy',
        action: 'getAppData',
      })
      setRows(sortJournalNewest(data.bankJournal || []))
      refreshUndo()
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [api, refreshUndo])

  useEffect(() => {
    void load()
  }, [load])

  function flash(msg: string) {
    setStatus(msg)
    window.setTimeout(() => setStatus(''), 2800)
  }

  const persist = useCallback(
    async (next: BankJournalRow[], recordUndo = true) => {
      if (recordUndo) pushJournalUndo(rows)
      const saved = await api.call<{ bankJournal?: BankJournalRow[] }>({
        module: 'groupbuy',
        action: 'saveBankJournal',
        payload: { bankJournal: next, mode: 'replace' },
      })
      setRows(sortJournalNewest(saved?.bankJournal || next))
      refreshUndo()
    },
    [api, rows, refreshUndo],
  )

  async function addManual() {
    const amount = Math.round(Number(draft.amount) || 0)
    const note = draft.note.trim()
    const date = draft.date.trim() || localTodayIso()
    if (!note) {
      flash('請填備註（人名＋團務名稱）')
      return
    }
    if (amount <= 0) {
      flash('金額需大於 0')
      return
    }
    const row: BankJournalRow = {
      id: newJournalId('j_manual'),
      date,
      bank: '待分類',
      type: '收入',
      amount,
      category: '手動',
      note,
      lastFive: normalizeLastFive(draft.lastFive),
    }
    setBusy(true)
    try {
      await persist([row, ...rows])
      setDraft({ date: localTodayIso(), amount: '', note: '', lastFive: '' })
      flash('已新增日記帳（不影響團務明細）')
    } catch (e) {
      console.error(e)
      flash('新增失敗')
    } finally {
      setBusy(false)
    }
  }

  async function removeRow(id: string) {
    if (!window.confirm('確定刪除此筆日記帳？團務明細與付款狀態不會被改動。')) return
    setBusy(true)
    try {
      await persist(rows.filter((r) => r.id !== id))
      flash('已刪除日記帳（團務明細未改）')
    } catch (e) {
      console.error(e)
      flash('刪除失敗')
    } finally {
      setBusy(false)
    }
  }

  async function restorePrevious() {
    const prev = popJournalUndo()
    if (!prev) {
      flash('沒有可還原的版本')
      refreshUndo()
      return
    }
    setBusy(true)
    try {
      await persist(prev, false)
      flash('已還原上一版日記帳')
    } catch (e) {
      console.error(e)
      pushJournalUndo(prev)
      flash('還原失敗')
    } finally {
      setBusy(false)
      refreshUndo()
    }
  }

  function downloadXlsx() {
    const buf = journalToXlsxBuffer(rows)
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `日記帳_${localTodayIso()}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    flash('已下載 Excel，可當備份')
  }

  async function uploadXlsx(file: File | null) {
    if (!file) return
    setBusy(true)
    try {
      const incoming = journalFromXlsxBuffer(await file.arrayBuffer())
      if (!incoming.length) {
        flash('檔案沒有可匯入的列')
        return
      }
      const replace = window.confirm(
        `匯入 ${incoming.length} 筆。\n\n確定：整份覆蓋目前日記帳（用備份檔還原時選這個）\n取消：依 ID 合併，不刪現有列`,
      )
      await persist(replace ? sortJournalNewest(incoming) : mergeJournalById(rows, incoming))
      flash(replace ? `已覆蓋為 ${incoming.length} 筆` : `已合併 ${incoming.length} 筆`)
    } catch (e) {
      console.error(e)
      flash('匯入失敗')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows])

  return (
    <PageLayout>
      <div className="journal-page">
        {status ? <div className="gb-toast">{status}</div> : null}
        <PageHeader
          title="日記帳"
          subtitle="獨立帳本：增刪、匯入、還原都不會改團務明細或付款狀態。"
          action={
            <>
              <Btn variant="secondary" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                重新載入
              </Btn>
              <Btn variant="secondary" onClick={() => void restorePrevious()} disabled={!canUndo || busy}>
                <Undo2 className="h-4 w-4" />
                還原上一版
              </Btn>
              <Btn variant="secondary" onClick={downloadXlsx} disabled={!rows.length}>
                <FileDown className="h-4 w-4" />
                匯出 Excel
              </Btn>
              <Btn variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                <FileUp className="h-4 w-4" />
                上傳 Excel
              </Btn>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="journal-file"
                onChange={(e) => void uploadXlsx(e.target.files?.[0] || null)}
              />
            </>
          }
        />

        <section className="journal-help">
          <p>
            <strong>日記帳寫錯：</strong>刪該列，或按「還原上一版」。建議先「匯出 Excel」當備份；還原備份時上傳並選覆蓋。
          </p>
          <p>
            <strong>沖銷／付款確認寫錯：</strong>到付款回報「返回待確認」，或在團務明細把付款改回未付款。日記帳那筆請在本頁另外刪除。
          </p>
        </section>

        <section className="journal-add">
          <h2>手動新增</h2>
          <div className="journal-add-grid">
            <label>
              日期
              <input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </label>
            <label>
              金額
              <input
                type="number"
                min={0}
                placeholder="NT$"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              />
            </label>
            <label className="journal-add-note">
              備註（人名＋團務名稱）
              <input
                value={draft.note}
                placeholder="例：小聖 示範團｜Jump 周邊"
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              />
            </label>
            <label>
              後五碼
              <input
                value={draft.lastFive}
                placeholder="12345"
                maxLength={8}
                onChange={(e) => setDraft((d) => ({ ...d, lastFive: e.target.value }))}
              />
            </label>
            <button type="button" className="journal-add-btn" disabled={busy} onClick={() => void addManual()}>
              <Plus className="h-4 w-4" />
              新增
            </button>
          </div>
        </section>

        <p className="journal-sum">
          共 {rows.length} 筆 · 合計 {money(total)}
        </p>

        {loading ? <p className="journal-loading">載入中…</p> : null}

        {!loading && !rows.length ? (
          <Empty title="尚無日記帳" hint="確認付款或沖銷後會自動出現，或在上方手動新增。" />
        ) : (
          <div className="journal-table" role="table" aria-label="日記帳">
            <div className="journal-table-head" role="row">
              <span role="columnheader">日期</span>
              <span role="columnheader">金額</span>
              <span role="columnheader">備註</span>
              <span role="columnheader">後五碼</span>
              <span role="columnheader"> </span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="journal-table-row" role="row">
                <span role="cell">{row.date || '—'}</span>
                <strong role="cell">{money(row.amount)}</strong>
                <span role="cell">{displayJournalNote(row) || '—'}</span>
                <span className="journal-five" role="cell">
                  {formatLastFiveDisplay(displayJournalLastFive(row))}
                </span>
                <span role="cell">
                  <button type="button" className="journal-del" onClick={() => void removeRow(row.id)} aria-label="刪除">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
