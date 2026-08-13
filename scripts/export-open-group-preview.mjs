/**
 * 從本機「開團明細」.xlsx 產出 `src/data/openGroupTemplatePreview.json`（摘錄，可提交版控）。
 *
 *   set KAITO_XLSX=C:\path\開團明細 (1).xlsx
 *   node scripts/export-open-group-preview.mjs
 *
 * 未設 KAITO_XLSX 時預設為目前使用者的 Downloads\開團明細 (1).xlsx
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'src', 'data', 'openGroupTemplatePreview.json')

const home = process.env.USERPROFILE || process.env.HOME || ''
const defaultXlsx = path.join(home, 'Downloads', '開團明細 (1).xlsx')
const xlsxPath = process.env.KAITO_XLSX || defaultXlsx

function xl(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x < 2000) return null
  return new Date(Math.round((x - 25569) * 86400 * 1000)).toISOString().slice(0, 10)
}

function normKey(s) {
  return String(s).replace(/\s/g, '').toLowerCase()
}

function hasAnyKey(row, keys) {
  const keySet = new Set(Object.keys(row).map(normKey))
  return keys.some((k) => keySet.has(normKey(k)))
}

function isRegistrationSheet(name, firstRow) {
  const badName =
    /(樞紐|linebank|流水帳|總攬|設定|代碼表|紀錄|信用卡|^開團明細$|^開團表單$|^團清單$|^商品清單$|^預購登記$|^客戶名單$|^分需彙總$|^二補匯率$|^私接訂單$)/i
  if (badName.test(name)) return false
  const hasName = hasAnyKey(firstRow, ['名字', '姓名', '在群裡的名字', 'LINE名子', '客戶', '臉書', '平台'])
  const hasItem = hasAnyKey(firstRow, ['商品', '品項', '項目', '動畫IP'])
  return hasName && hasItem
}

if (!fs.existsSync(xlsxPath)) {
  console.error('找不到檔案:', xlsxPath)
  console.error('請設定環境變數 KAITO_XLSX 指向 .xlsx')
  process.exit(1)
}

const wb = XLSX.readFile(xlsxPath)
const sh = wb.Sheets['開團明細']
if (!sh) {
  console.error('工作簿內無「開團明細」分頁')
  process.exit(1)
}

const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' })
const masterRowsSample = []
for (let i = 1; i < Math.min(22, rows.length); i++) {
  const r = rows[i]
  const link = String(r[14] ?? '').trim()
  masterRowsSample.push({
    title: String(r[0] ?? '').trim(),
    closingDate: xl(r[1]),
    saleEndDate: xl(r[2]),
    purchaseDate: xl(r[3]),
    purchasePlace: String(r[4] ?? '').trim(),
    shipEta: String(r[5] ?? '').trim(),
    phase: String(r[6] ?? '').trim(),
    jpyAmount: r[7] !== '' && r[7] != null ? String(r[7]) : '',
    cardPay: String(r[8] ?? '').trim(),
    link: link && /^https?:\/\//i.test(link) ? link : undefined,
  })
}

const sheets = wb.SheetNames.map((name) => {
  const ws = wb.Sheets[name]
  const jr = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return { name, rows: jr }
})

const registration = []
for (const s of sheets) {
  if (!s.rows.length) continue
  const first = s.rows[0] ?? {}
  if (isRegistrationSheet(s.name, first)) {
    registration.push({ name: s.name, count: Math.max(0, s.rows.length - 1) })
  }
}
registration.sort((a, b) => b.count - a.count)

const structNames = ['開團明細', '開團表單', '團清單', '商品清單', '預購登記', '客戶名單', '私接訂單']
const structSheets = structNames
  .filter((n) => wb.SheetNames.includes(n))
  .map((name) => {
    const ws = wb.Sheets[name]
    const n = ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }).length : 0
    return { name, rowCount: n }
  })

const out = {
  version: 1,
  sourceLabel: `${path.basename(xlsxPath)} 摘錄`,
  workbookSheetTotal: wb.SheetNames.length,
  registrationSheetCount: registration.length,
  registrationTopSheets: registration.slice(0, 24).map((x) => x.name),
  structSheets,
  masterRowsSample,
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
console.log('Wrote', outPath)
