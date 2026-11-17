/**
 * GAS 單檔建置收尾：vite-plugin-singlefile 依「來源檔名」輸出 gas-app-entry.html，此處更名為 index.html；
 * 並在檔首標註「複製到 Apps Script」說明。若舊版仍產出 UI.html，建置後刪除以免混淆。
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const indexPath = resolve(root, 'gas-web', 'index.html')
const builtEntry = resolve(root, 'gas-web', 'gas-app-entry.html')
const legacyUi = resolve(root, 'gas-web', 'UI.html')

const BANNER =
  "<!-- GAS-APPS-SCRIPT-COPY: 以下為單檔前端。請將「本檔全文」複製到 Apps Script → 新增 HTML → 檔名必須為 index（編輯器顯示 index.html），與 gas/Web.gs 的 createHtmlOutputFromFile('index') 一致。 -->\n"

if (existsSync(builtEntry)) {
  if (existsSync(indexPath)) {
    unlinkSync(indexPath)
  }
  renameSync(builtEntry, indexPath)
} else if (!existsSync(indexPath)) {
  console.error('gas-web-finish: missing', builtEntry, 'and', indexPath)
  process.exit(1)
}

let html = readFileSync(indexPath, 'utf8')
if (!html.includes('GAS-APPS-SCRIPT-COPY')) {
  html = BANNER + html
  writeFileSync(indexPath, html, 'utf8')
}

if (existsSync(legacyUi)) {
  unlinkSync(legacyUi)
  console.log('gas-web-finish: removed legacy gas-web/UI.html')
}

console.log('gas-web-finish: OK', indexPath)
console.log('gas-web-finish: bundle index.html is the Pages pointer written by bundle-apps-script-code.mjs')
