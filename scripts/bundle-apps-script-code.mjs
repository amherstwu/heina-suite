/**
 * 合併 gas/*.gs → deploy/apps-script-bundle/Code.gs，並加上「複製到 Apps Script」區塊標記。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const gasDir = resolve(root, 'gas')
const outDir = resolve(root, 'deploy', 'apps-script-bundle')
const outFile = resolve(outDir, 'Code.gs')

const parts = [
  'GroupBuy.gs',
  'Ledger.gs',
  'LedgerSelfTest.gs',
  'Preorder.gs',
  'OnOpen.gs',
  'SystemHub.gs',
  'Storefront.gs',
  'Web.gs',
]

const START =
  '/**\n' +
  ' * =============================================================================\n' +
  ' * >>> GAS-APPS-SCRIPT-COPY-START（.gs）\n' +
  ' * 與「同資料夾 index.html」成對；兩檔貼入同一 Apps Script 專案即可。\n' +
  ' * 以下「自本行以下至 GAS-APPS-SCRIPT-COPY-END」全文複製到 Google Apps Script：\n' +
  ' * 新增或覆寫一支「指令碼」檔（檔名自訂，例如 Code）。\n' +
  ' * =============================================================================\n' +
  ' */\n\n'

const SEP = '\n\n/* --- next: --- */\n\n'

const END =
  '\n\n/**\n' +
  ' * =============================================================================\n' +
  ' * <<< GAS-APPS-SCRIPT-COPY-END（.gs）\n' +
  ' * =============================================================================\n' +
  ' */\n'

const body = parts
  .map((name) => readFileSync(resolve(gasDir, name), 'utf8').replace(/^\uFEFF/, ''))
  .join(SEP)

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}
writeFileSync(outFile, START + body + END, 'utf8')
console.log('bundle-apps-script-code: wrote', outFile)

const guideHint = resolve(outDir, '複製到AppsScript.txt')
if (!existsSync(guideHint)) {
  writeFileSync(
    guideHint,
    '請執行 npm run deploy 產生完整部署說明與最新 index.html / Code.gs。\n',
    'utf8',
  )
}
