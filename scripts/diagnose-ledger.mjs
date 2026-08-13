import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function fail(msg) {
  console.error(`❌ ${msg}`)
  process.exitCode = 1
}

function pass(msg) {
  console.log(`✅ ${msg}`)
}

const root = process.cwd()
const mainPath = resolve(root, 'src/main.tsx')
const appPath = resolve(root, 'src/App.tsx')

const main = readFileSync(mainPath, 'utf8')
const app = readFileSync(appPath, 'utf8')

if (!main.includes("import { ApiProvider } from './context/ApiProvider'")) {
  fail('main.tsx 未引入 ApiProvider（LedgerPage 會在 useApi 崩潰）')
} else if (!main.includes('<ApiProvider>') || !main.includes('</ApiProvider>')) {
  fail('main.tsx 未用 ApiProvider 包住 App')
} else {
  pass('ApiProvider 包裝正常')
}

if (!app.includes("import { LedgerPage } from './modules/ledger/LedgerPage'")) {
  fail('App.tsx 尚未引入 LedgerPage')
} else {
  pass('LedgerPage 引入正常')
}

if (!app.includes('path="/accounting" element={<LedgerPage />}')) {
  fail('/accounting 尚未指向 LedgerPage')
} else {
  pass('/accounting 路由已指向 LedgerPage')
}

if (!app.includes('path="/ledger" element={<LedgerPage />}')) {
  fail('/ledger 尚未指向 LedgerPage')
} else {
  pass('/ledger 路由已指向 LedgerPage')
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('\n診斷結果：存在整合問題，請依上方 ❌ 修正。')
} else {
  console.log('\n診斷結果：Ledger 路由整合檢查通過。')
}
