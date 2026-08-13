import { useEffect, useRef, useState } from 'react'
import { FileDown, FileSpreadsheet, Upload, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { Btn, Card, PageHeader } from '../components/ui'
import { useDaigouStore } from '../daigou/store'
import { useApi } from '../context/useApi'
import type { ExportDataPackResult, ImportDataPackResult } from '../api/types'
import {
  downloadHeinaDataPackXlsx,
  parseHeinaDataPackFromXlsx,
  summarizeDataPack,
  type DataPackImportMode,
} from '../daigou/heinaDataPack'
import {
  downloadProductTemplateXlsx,
  downloadRegisterSheetTemplateXlsx,
  exportDaigouStateToXlsx,
  parseClipboardTableToJsonRows,
  parseCsvTextToJsonRows,
  parseWorkbookToJsonSheets,
  pickSheetRowsForRegisterImport,
  sheetRowToProductDraft,
} from '../daigou/sheetExcelBridge'
import { DEMO_PRODUCT_CSV, DEMO_REGISTER_TSV } from '../daigou/demoImportSamples'

export function IntegrationsPage() {
  const api = useApi()
  const s = useDaigouStore()
  const settings = useDaigouStore((x) => x.settings)
  const bulkImportProducts = useDaigouStore((x) => x.bulkImportProducts)
  const bulkImportRegisterSheetOrders = useDaigouStore((x) => x.bulkImportRegisterSheetOrders)
  const importKaitoPreorderWorkbook = useDaigouStore((x) => x.importKaitoPreorderWorkbook)
  const addToast = useDaigouStore((x) => x.addToast)

  const fileRef = useRef<HTMLInputElement>(null)
  const registerFileRef = useRef<HTMLInputElement>(null)
  const kaitoFullFileRef = useRef<HTMLInputElement>(null)
  const dataPackFileRef = useRef<HTMLInputElement>(null)
  const [kaitoGroupName, setKaitoGroupName] = useState('')
  const [kaitoMaxSheets, setKaitoMaxSheets] = useState(40)
  const [kaitoMaxOrders, setKaitoMaxOrders] = useState(500)
  const [kaitoBusy, setKaitoBusy] = useState(false)
  const [paste, setPaste] = useState('')
  const [registerPaste, setRegisterPaste] = useState('')
  const [registerGroupId, setRegisterGroupId] = useState('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [packBusy, setPackBusy] = useState(false)
  const [packMode, setPackMode] = useState<DataPackImportMode>('merge')
  const [packPreview, setPackPreview] = useState<string>('')

  useEffect(() => {
    if (!registerGroupId && s.groups[0]?.id) setRegisterGroupId(s.groups[0].id)
  }, [s.groups, registerGroupId])

  const defaultGroup = s.groups[0]?.id
  const img = 'https://picsum.photos/seed/import/200/200'

  async function downloadDataPack() {
    setPackBusy(true)
    try {
      const res = await api.call<ExportDataPackResult>({ module: 'groupbuy', action: 'exportDataPack' })
      if (!res.ok || !res.pack) {
        addToast(res.message || '匯出失敗', 'err')
        return
      }
      downloadHeinaDataPackXlsx(res.pack)
      const sry = summarizeDataPack(res.pack)
      addToast(
        `已下載資料包（訂單 ${sry.orderDataRows}／日記帳 ${sry.journalDataRows}／設定 ${sry.settingsDataRows}）`,
        'ok',
      )
    } catch (e) {
      addToast(e instanceof Error ? e.message : '匯出失敗', 'err')
    } finally {
      setPackBusy(false)
    }
  }

  async function uploadDataPack(f: File | null) {
    if (!f) return
    setPackBusy(true)
    try {
      const buf = await f.arrayBuffer()
      const pack = parseHeinaDataPackFromXlsx(buf)
      const sry = summarizeDataPack(pack)
      setPackPreview(
        `將匯入：訂單 ${sry.orderDataRows} 列、日記帳 ${sry.journalDataRows}、設定 ${sry.settingsDataRows}（模式：${packMode}）`,
      )
      const warn =
        packMode === 'replace'
          ? `確定要以「覆蓋」模式匯入？\n訂單 ${sry.orderDataRows} 列、日記帳 ${sry.journalDataRows}、設定 ${sry.settingsDataRows}\n指定分頁會被整段覆寫。`
          : `確定要以「合併」模式匯入？\n訂單 ${sry.orderDataRows} 列、日記帳 ${sry.journalDataRows}、設定 ${sry.settingsDataRows}\n將以團ID／日記帳ID／設定 Key 合併。`
      if (!window.confirm(warn)) {
        return
      }
      if (
        packMode === 'replace' &&
        !window.confirm('再次確認：覆蓋模式會覆寫試算表對應分頁。資料包含系統設定（可能含查詢密碼），請勿外流。')
      ) {
        return
      }
      const res = await api.call<ImportDataPackResult>({
        module: 'groupbuy',
        action: 'importDataPack',
        payload: { mode: packMode, pack },
      })
      if (!res.ok) {
        addToast(res.message || '匯入失敗', 'err')
        return
      }
      addToast(res.message || '匯入完成', 'ok')
    } catch (e) {
      addToast(e instanceof Error ? e.message : '匯入失敗', 'err')
    } finally {
      setPackBusy(false)
      if (dataPackFileRef.current) dataPackFileRef.current.value = ''
    }
  }

  function runImportRows(rows: Record<string, unknown>[]) {
    const drafts = rows
      .map((row) =>
        sheetRowToProductDraft(row, {
          groupId: defaultGroup,
          exchangeMultiplier: settings.defaultExchangeRate,
          imageUrl: img,
          categoryFallback: '週邊',
          ipFallback: '匯入',
        }),
      )
      .filter((x): x is NonNullable<typeof x> => x != null)
    setPreviewCount(drafts.length)
    if (drafts.length === 0) {
      addToast('沒有有效列（至少需有「商品名稱」）', 'err')
      return
    }
    bulkImportProducts(drafts)
  }

  async function importKaitoWorkbookFull(f: File | null) {
    if (!f) return
    setKaitoBusy(true)
    try {
      const buf = await f.arrayBuffer()
      const sheets = parseWorkbookToJsonSheets(buf)
      importKaitoPreorderWorkbook({
        sheets: sheets.map((sh) => ({ name: sh.name, rows: sh.rows })),
        workbookBuffer: buf,
        groupName: kaitoGroupName.trim() || undefined,
        maxSheets: kaitoMaxSheets,
        maxOrderBlocks: kaitoMaxOrders,
      })
    } finally {
      setKaitoBusy(false)
      if (kaitoFullFileRef.current) kaitoFullFileRef.current.value = ''
    }
  }

  async function onPickFile(f: File | null) {
    if (!f) return
    const name = f.name.toLowerCase()
    try {
      if (name.endsWith('.csv')) {
        const text = await f.text()
        runImportRows(parseCsvTextToJsonRows(text))
        return
      }
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buf = await f.arrayBuffer()
        const sheets = parseWorkbookToJsonSheets(buf)
        const sheet =
          sheets.find((x) => x.name === '商品匯入' || x.name.includes('匯入')) ??
          sheets.find((x) => x.name === '商品') ??
          sheets[0]
        runImportRows(sheet?.rows ?? [])
        return
      }
      addToast('請選擇 .xlsx 或 .csv', 'err')
    } catch (e) {
      addToast(e instanceof Error ? e.message : '讀檔失敗', 'err')
    }
  }

  async function importFromPaste() {
    if (!paste.trim()) {
      addToast('請貼上 CSV 內容', 'err')
      return
    }
    try {
      runImportRows(parseCsvTextToJsonRows(paste))
    } catch (e) {
      addToast(e instanceof Error ? e.message : '解析失敗', 'err')
    }
  }

  async function onPickRegisterSheet(f: File | null) {
    if (!f) return
    if (!registerGroupId) {
      addToast('請先選擇訂單要歸屬的團務', 'err')
      return
    }
    const lower = f.name.toLowerCase()
    try {
      let rows: Record<string, unknown>[] = []
      if (lower.endsWith('.csv')) {
        const text = await f.text()
        rows = parseClipboardTableToJsonRows(text)
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await f.arrayBuffer()
        const sheets = parseWorkbookToJsonSheets(buf)
        rows = pickSheetRowsForRegisterImport(sheets).rows
      } else {
        addToast('請選擇 .xlsx 或 .csv', 'err')
        return
      }
      bulkImportRegisterSheetOrders({ groupId: registerGroupId, rows })
    } catch (e) {
      addToast(e instanceof Error ? e.message : '讀檔失敗', 'err')
    }
  }

  function importRegisterFromPaste() {
    if (!registerGroupId) {
      addToast('請先選擇訂單要歸屬的團務', 'err')
      return
    }
    if (!registerPaste.trim()) {
      addToast('請貼上含標題列的登記表內容', 'err')
      return
    }
    try {
      const rows = parseClipboardTableToJsonRows(registerPaste)
      bulkImportRegisterSheetOrders({ groupId: registerGroupId, rows })
    } catch (e) {
      addToast(e instanceof Error ? e.message : '解析失敗', 'err')
    }
  }

  async function loadMergedFixture() {
    if (!registerGroupId) {
      addToast('請先選擇訂單要歸屬的團務', 'err')
      return
    }
    const base = import.meta.env.BASE_URL || '/'
    const prefix = base.endsWith('/') ? base : `${base}/`
    const url = `${prefix}fixtures/merged-register-rows.json`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        addToast(`找不到合併檔（HTTP ${res.status}）。請在 heina-suite 執行 npm run ingest:user-xlsx`, 'err')
        return
      }
      const data = (await res.json()) as { rows?: Record<string, unknown>[]; totalRows?: number; parsedOrderBlocks?: number }
      const rows = data.rows
      if (!Array.isArray(rows) || rows.length === 0) {
        addToast('合併檔內沒有列資料', 'err')
        return
      }
      const { imported } = bulkImportRegisterSheetOrders({ groupId: registerGroupId, rows })
      addToast(`已載入 fixtures：${imported} 筆訂單（來源共 ${data.totalRows ?? rows.length} 列）`, 'ok')
    } catch (e) {
      addToast(e instanceof Error ? e.message : '載入 fixtures 失敗', 'err')
    }
  }

  return (
    <div>
      <PageHeader
        title="工具中心"
        subtitle="上架資料包（Sheets／Excel）、備份與開團匯入；日常團務客訂請用開團中心的 Excel 工具"
        action={
          <Btn variant="secondary" to="/group-buy-center">
            開團中心 Excel
          </Btn>
        }
      />

      <Card className="!mb-6 !p-5">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <ShieldAlert className="h-5 w-5 text-teal-700" />
          上架 Ready：Sheets／Excel 資料包
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-zinc-600">
          正式資料庫為 Google 試算表。可下載對齊「訂單明細／銀行日記帳／系統設定」的 .xlsx
          離線整理後再上傳匯回。資料包可能含查詢密碼等敏感設定，請勿外傳。
        </p>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
          <li>試算表選單：Heina Suite → 初始化分頁</li>
          <li>下載資料包確認內容，或整理後上傳（merge／replace）</li>
          <li>
            部署 Web App（<code className="rounded bg-zinc-100 px-1">npm run deploy</code>）後測試{' '}
            <code className="rounded bg-zinc-100 px-1">#/lookup</code>、
            <code className="rounded bg-zinc-100 px-1">#/bank</code>
          </li>
          <li>程式碼建議用 GitHub Desktop 推 private repo（僅碼倉，不當正式站）</li>
        </ol>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-zinc-700">
            匯入模式{' '}
            <select
              className="ml-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm font-medium"
              value={packMode}
              onChange={(e) => setPackMode(e.target.value as DataPackImportMode)}
            >
              <option value="merge">合併（merge）</option>
              <option value="replace">覆蓋（replace）</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn disabled={packBusy} onClick={() => void downloadDataPack()}>
            <FileDown className="h-4 w-4" />
            {packBusy ? '處理中…' : '下載資料包 .xlsx'}
          </Btn>
          <input
            ref={dataPackFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => void uploadDataPack(e.target.files?.[0] ?? null)}
          />
          <Btn variant="secondary" disabled={packBusy} onClick={() => dataPackFileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            上傳資料包 .xlsx
          </Btn>
        </div>
        {packPreview ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-zinc-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            {packPreview}
          </p>
        ) : null}
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="!p-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            日常：代購後台備份與商品匯入
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-zinc-600">
            舊版「完整資料」匯出（訂單／客戶／商品等，僅供參考整理）。正式 Sheets 進出請用上方資料包。
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => exportDaigouStateToXlsx(s)}>
              <FileDown className="h-4 w-4" />
              匯出完整資料 .xlsx
            </Btn>
            <Btn variant="secondary" onClick={() => downloadProductTemplateXlsx()}>
              下載商品範本
            </Btn>
          </div>
          <hr className="my-4 border-zinc-200" />
          <p className="mb-2 text-sm font-semibold text-zinc-800">從 Excel 匯入商品</p>
          <p className="mb-3 text-xs text-zinc-500">
            工作表名稱建議為「商品匯入」；欄位需含 <strong>商品名稱</strong>（見範本）。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            上傳 .xlsx / .csv
          </Btn>
          {previewCount != null ? <span className="ml-3 text-sm text-zinc-600">上次解析有效列：{previewCount}</span> : null}
        </Card>

        <Card className="!p-5">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">開團明細：多分頁整檔匯入</h2>
          <p className="mb-3 text-sm leading-relaxed text-zinc-600">
            讀取總表／主檔與各分頁登記，建立團務與客訂。日常單團維護請改用開團中心的「匯入團務客訂」。
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-zinc-500">
              新團名稱（選填）
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="預設：預購匯入＋日期"
                value={kaitoGroupName}
                onChange={(e) => setKaitoGroupName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-500">
              最多掃描分頁數
              <input
                type="number"
                min={1}
                max={500}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={kaitoMaxSheets}
                onChange={(e) => setKaitoMaxSheets(Number(e.target.value) || 1)}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-500">
              最多訂單筆數
              <input
                type="number"
                min={10}
                max={8000}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={kaitoMaxOrders}
                onChange={(e) => setKaitoMaxOrders(Number(e.target.value) || 10)}
              />
            </label>
          </div>
          <input
            ref={kaitoFullFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => void importKaitoWorkbookFull(e.target.files?.[0] ?? null)}
          />
          <Btn variant="secondary" disabled={kaitoBusy} onClick={() => kaitoFullFileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {kaitoBusy ? '匯入中…' : '選擇開團明細 .xlsx'}
          </Btn>
        </Card>
      </div>

      <Card className="!mb-6 !p-5">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">登記表 → 訂單</h2>
        <p className="mb-3 text-sm leading-relaxed text-zinc-600">
          支援名字、商品、數量、日幣、台幣、訂金等欄位；會寫入你選定的團務。
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1 basis-full text-xs font-semibold text-zinc-500 sm:min-w-[12rem] sm:basis-auto">
            歸屬團務
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={registerGroupId}
              onChange={(e) => setRegisterGroupId(e.target.value)}
            >
              {s.groups.length === 0 ? <option value="">（尚無團務）</option> : null}
              {s.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <Btn variant="secondary" onClick={() => downloadRegisterSheetTemplateXlsx()}>
            <FileDown className="h-4 w-4" />
            下載登記表範本
          </Btn>
        </div>
        <input
          ref={registerFileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => void onPickRegisterSheet(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" disabled={!registerGroupId} onClick={() => registerFileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            上傳登記表
          </Btn>
        </div>
        <hr className="my-4 border-zinc-200" />
        <h3 className="mb-2 text-sm font-semibold text-zinc-800">貼上登記表（含標題列）</h3>
        <textarea
          className="mb-3 min-h-[120px] w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs"
          placeholder="貼上選取範圍…"
          value={registerPaste}
          onChange={(e) => setRegisterPaste(e.target.value)}
        />
        <div className="mb-3 flex flex-wrap gap-2">
          <Btn
            type="button"
            variant="secondary"
            onClick={() => {
              setRegisterPaste(DEMO_REGISTER_TSV)
              addToast('已填入登記表示範', 'ok')
            }}
          >
            填入示範
          </Btn>
          <Btn disabled={!registerGroupId} onClick={() => importRegisterFromPaste()}>
            解析並匯入
          </Btn>
          <Btn type="button" variant="secondary" disabled={!registerGroupId} onClick={() => void loadMergedFixture()}>
            載入合併測試列
          </Btn>
        </div>
      </Card>

      <Card className="!p-5">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">貼上 CSV 匯入商品</h2>
        <p className="mb-3 text-sm text-zinc-600">從試算表複製選取範圍（含標題列）貼上。</p>
        <textarea
          className="mb-3 min-h-[140px] w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs"
          placeholder="商品名稱,團ID,分類,..."
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <div className="mb-3 flex flex-wrap gap-2">
          <Btn
            type="button"
            variant="secondary"
            onClick={() => {
              setPaste(DEMO_PRODUCT_CSV)
              addToast('已填入商品 CSV 示範', 'ok')
            }}
          >
            填入示範
          </Btn>
          <Btn onClick={() => void importFromPaste()}>解析並匯入</Btn>
        </div>
      </Card>
    </div>
  )
}
