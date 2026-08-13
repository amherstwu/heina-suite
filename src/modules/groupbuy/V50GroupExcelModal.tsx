import { useEffect, useMemo, useRef, useState } from 'react'
import type { GroupBuyGroup } from '../../api/types'
import { normalizeGroupStatus } from './v50Utils'
import {
  applyV50ImportToGroup,
  exportV50GroupsFullBackupXlsx,
  exportV50GroupsToXlsx,
  parseV50ImportWorkbook,
} from './v50ExcelBridge'
import './v50GroupExcelModal.css'

type ExportProps = {
  mode: 'export'
  groups: GroupBuyGroup[]
  onClose: () => void
}

type ExportFullProps = {
  mode: 'exportFull'
  groups: GroupBuyGroup[]
  onClose: () => void
}

type ImportProps = {
  mode: 'import'
  groups: GroupBuyGroup[]
  onClose: () => void
  onImport: (groupId: string, nextOrders: GroupBuyGroup['orders'], summary: string) => void
}

type Props = ExportProps | ExportFullProps | ImportProps

function activeGroups(groups: GroupBuyGroup[]) {
  return groups.filter((g) => normalizeGroupStatus(g.status) !== '已結束')
}

function eligibleGroups(mode: Props['mode'], groups: GroupBuyGroup[]) {
  if (mode === 'exportFull') return groups
  return activeGroups(groups)
}

export function V50GroupExcelModal(props: Props) {
  const eligible = useMemo(() => eligibleGroups(props.mode, props.groups), [props.mode, props.groups])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligible.map((g) => g.id)))
  const [importGroupId, setImportGroupId] = useState(eligible[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelected(new Set(eligible.map((g) => g.id)))
    if (!importGroupId || !eligible.some((g) => g.id === importGroupId)) {
      setImportGroupId(eligible[0]?.id ?? '')
    }
  }, [eligible, importGroupId])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === eligible.length) setSelected(new Set())
    else setSelected(new Set(eligible.map((g) => g.id)))
  }

  function handleExport() {
    const picked = eligible.filter((g) => selected.has(g.id))
    if (!picked.length) {
      setMessage('請至少選擇一個團務')
      return
    }
    if (props.mode === 'exportFull') {
      exportV50GroupsFullBackupXlsx(picked)
      setMessage(`已匯出 ${picked.length} 個團務的完整備份`)
      return
    }
    exportV50GroupsToXlsx(picked)
    setMessage(`已匯出 ${picked.length} 個團務的客訂資料`)
  }

  async function handleImportFile(file: File | null) {
    if (!file || props.mode !== 'import') return
    const group = eligible.find((g) => g.id === importGroupId)
    if (!group) {
      setMessage('請選擇要匯入的團務')
      return
    }
    setBusy(true)
    setMessage('')
    setWarnings([])
    try {
      const ab = await file.arrayBuffer()
      const parsed = parseV50ImportWorkbook(ab, group.name)
      if (!parsed.blocks.length) {
        setMessage('未解析到可匯入的客訂（需含名字與商品品項）')
        setWarnings(parsed.warnings)
        return
      }
      const newId = () =>
        `o_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`
      const result = applyV50ImportToGroup(group, parsed.blocks, newId)
      const allWarnings = [...parsed.warnings, ...result.warnings]
      setWarnings(allWarnings)
      const summary = `已更新 ${result.updated} 筆、新增 ${result.added} 筆${result.skipped ? `、略過 ${result.skipped} 筆` : ''}`
      setMessage(summary)
      props.onImport(group.id, result.orders, summary)
    } catch (e) {
      console.error(e)
      setMessage('讀取檔案失敗，請確認為 .xlsx 格式')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const isExportPick = props.mode === 'export' || props.mode === 'exportFull'

  const title =
    props.mode === 'exportFull'
      ? '匯出完整團務備份'
      : props.mode === 'export'
        ? '匯出 Excel'
        : '匯入 Excel'

  const subtitle =
    props.mode === 'exportFull'
      ? '勾選要備份的團務（含已結束）。每團一工作表：團務主檔＋客訂明細；台幣售價為數量×單價。僅供本機備份，請勿用於匯入。'
      : props.mode === 'export'
        ? '選擇要匯出的團務（不含已結束）。同一客戶多品項會分多列；續列名字請留空。'
        : '選擇目標團務並上傳。同一客訂多品項：僅第一列填名字；續列只填商品欄位。'

  const emptyText =
    props.mode === 'exportFull'
      ? '目前沒有任何團務可匯出。'
      : '目前沒有可操作的團務（已結束以外的團務為空）。'

  return (
    <div className="v50-order-backdrop" onClick={props.onClose}>
      <div className="v50-excel-card" onClick={(e) => e.stopPropagation()}>
        <div className="v50-excel-head">
          <h3 className="v50-excel-title">{title}</h3>
          <button type="button" className="v50-excel-close" onClick={props.onClose} aria-label="關閉">
            ×
          </button>
        </div>
        <p className="v50-excel-sub">{subtitle}</p>

        {eligible.length === 0 ? (
          <p className="v50-excel-empty">{emptyText}</p>
        ) : isExportPick ? (
          <>
            <div className="v50-excel-toolbar">
              <button type="button" className="v50-excel-link" onClick={toggleAll}>
                {selected.size === eligible.length ? '取消全選' : '全選'}
              </button>
              <span className="v50-excel-count">已選 {selected.size} / {eligible.length}</span>
            </div>
            <ul className="v50-excel-list">
              {eligible.map((g) => {
                const checked = selected.has(g.id)
                const orderCount = (g.orders || []).length
                return (
                  <li key={g.id}>
                    <label className="v50-excel-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(g.id)}
                      />
                      <span className="v50-excel-row-name">{g.name}</span>
                      <span className="v50-excel-row-meta">
                        {normalizeGroupStatus(g.status)} · {orderCount} 筆客訂
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <div className="v50-excel-actions">
              <button type="button" className="v50-excel-btn v50-excel-btn--ghost" onClick={props.onClose}>
                取消
              </button>
              <button
                type="button"
                className="v50-excel-btn v50-excel-btn--primary"
                onClick={handleExport}
                disabled={!selected.size}
              >
                下載 Excel
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="v50-excel-field">
              <span className="v50-excel-label">匯入至團務</span>
              <select
                className="heina-input v50-excel-select"
                value={importGroupId}
                onChange={(e) => setImportGroupId(e.target.value)}
              >
                {eligible.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}（{normalizeGroupStatus(g.status)}）
                  </option>
                ))}
              </select>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
            />
            <div className="v50-excel-actions">
              <button type="button" className="v50-excel-btn v50-excel-btn--ghost" onClick={props.onClose}>
                取消
              </button>
              <button
                type="button"
                className="v50-excel-btn v50-excel-btn--primary"
                disabled={busy || !importGroupId}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? '匯入中…' : '選擇 Excel 檔案'}
              </button>
            </div>
          </>
        )}

        {message ? <p className="v50-excel-msg">{message}</p> : null}
        {warnings.length > 0 ? (
          <ul className="v50-excel-warnings">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
