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
  'Secrets.gs',
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

const landing = `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Heina Suite</title>
  </head>
  <body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.55">
    <h1 style="font-size:1.25rem">Heina 網站已改由 GitHub Pages 提供</h1>
    <p><a href="https://heinashop.github.io/">開啟顧客專區</a></p>
    <p style="color:#555;font-size:14px">
      這份 HTML 只是 Apps Script 的說明頁。正式畫面在 GitHub Pages。
      Web App 的 /exec 網址是資料 API：前端以 text/plain POST（或 JSONP）呼叫 unifiedApi。
      管理密碼、查單預設密碼、銀行查詢密碼請放在指令碼屬性，不要寫進 HTML。
    </p>
  </body>
</html>
`
writeFileSync(resolve(outDir, 'index.html'), landing, 'utf8')
console.log('bundle-apps-script-code: wrote landing index.html')

const guide = `Heina Suite — GitHub Pages 前端 + Apps Script API
==================================================

【前端】GitHub Pages
--------------------------------------
倉庫預設分支推上後，GitHub Actions（.github/workflows/pages.yml）會建置並部署。
預期網址：https://heinashop.github.io/
Pages 來源請選 GitHub Actions。私人倉庫的 Pages 需要付費方案，否則請將倉庫設為公開。

建置時設定：
  VITE_BASE=/
  VITE_GAS_URL=https://script.google.com/macros/s/XXXX/exec
GitHub → Settings → Secrets and variables → Actions → Variables → VITE_GAS_URL
改網址後要重新跑 workflow，網址會進到公開的 JS（這是 Web App 網址，不是密碼）。

【後端】Apps Script
--------------------------------------
1. 試算表 → 擴充功能 → Apps Script（綁定這本試算表）
2. 將本目錄 Code.gs 貼成一支指令碼（或 clasp push gas/）
3. 部署 → 新增部署 → 類型「網頁應用程式」
   執行身分：我
   誰可以存取：任何人
4. 複製結尾為 /exec 的網址，填進 VITE_GAS_URL，重新部署 Pages
5. 專案設定 → 指令碼屬性（不要提交到 Git）：
   HEINA_ADMIN_PASSWORD   後台登入密碼
   HEINA_LOOKUP_PIN       4 位數查單預設密碼（客人沒有個別密碼時使用）
   HEINA_BANK_PASSWORD    匯款帳號查詢密碼
   HEINA_PAGES_URL        選用，預設為 GitHub Pages 網址

index.html 是給舊版「用 Apps Script 開網站」的說明頁，不是 20MB 的前端。
顧客請開 GitHub Pages。/exec 沒有 query 時，若專案裡仍有名為 index 的 HTML，會顯示該檔；否則顯示說明頁。

路由是 hash（例如 #/lookup、#/shop、#/login），深連結不依賴伺服器重寫。
另有 public/404.html，把沒有 hash 的路徑轉回 hash 路由。
`
writeFileSync(resolve(outDir, '複製到AppsScript.txt'), guide, 'utf8')
console.log('bundle-apps-script-code: wrote deploy guide')
