/**
 * 正式部署前檢查 + 建置 GAS 雙檔 bundle（deploy/apps-script-bundle/）。
 * 用法：npm run deploy  或  node scripts/deploy-gas.mjs
 */
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const bundleDir = resolve(root, 'deploy', 'apps-script-bundle')
const indexPath = resolve(bundleDir, 'index.html')
const codePath = resolve(bundleDir, 'Code.gs')
const manifestPath = resolve(bundleDir, 'deploy-manifest.json')
const guidePath = resolve(bundleDir, '複製到AppsScript.txt')

function run(label, cmd) {
  console.log(`\n▶ ${label}`)
  console.log(`  ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true })
}

function sha256File(p) {
  const buf = readFileSync(p)
  return createHash('sha256').update(buf).digest('hex').slice(0, 16)
}

function fileInfo(p) {
  const st = statSync(p)
  return { bytes: st.size, sha256Prefix: sha256File(p), mtime: st.mtime.toISOString() }
}

function writeDeployGuide(builtAt) {
  const guide = `Heina Suite → Google Apps Script（整專案只要兩個檔）
==================================================
建置時間：${builtAt}
產物目錄：heina-suite/deploy/apps-script-bundle/

【一】本機建置（建議用一鍵部署，含檢查）
--------------------------------------
  cd heina-suite
  npm run deploy

等同於：npm run build → 路由／進貨／seed 檢查 → npm run build:gas

僅重建 bundle（略過 tsc 全站建置，開發中慎用）：
  npm run build:gas

【二】貼到 Apps Script
--------------------------------------
完成後，本目錄應有：

  【A】index.html   → Apps Script：＋ → HTML → 檔名必須為 index → 全選貼上
  【B】Code.gs       → Apps Script：＋ → 指令碼 → 檔名自訂（如 Code）→ 貼上
                        （可只貼 GAS-APPS-SCRIPT-COPY-START ～ END 區段）

試算表須「綁定此 Apps Script」；部署「網路應用程式」後用該網址開啟。
部署新版本後請「新增部署作業」或更新現有 Web App 版本。

【三】Hash 路由（與本版前端一致）
--------------------------------------
顧客（免登入）：
  #/ 或 #/lookup     顧客專區（主入口）
  #/portal           簡易訂單查詢
  #/shop、#/home     現貨／活動頁
  #/groupbuy         舊團購閘道（admin / 4502）

後台 HelpMeBuy Pro：
  #/login            管理密碼（首次可自設，存本機）
  #/dashboard        總覽
  #/procurement      進貨中心（含供應商、採購單、到貨、應付、退貨、對帳）
  #/integrations     試算表／開團 xlsx 匯入
  其餘：#/orders、#/products、#/customers、#/shipping …

【四】疑難排解
--------------------------------------
• 開啟網址顯示「找不到 index」→ 確認 HTML 檔名為 index，且已重新部署 Web App
• 畫面空白 → F12 主控台；確認 index.html 為最新 npm run deploy 產物
• 後台資料舊 → 瀏覽器清 localStorage 或後台「清空示範資料」
• 詳見 deploy-manifest.json（檔案大小與建置時間）

`
  writeFileSync(guidePath, guide, 'utf8')
  console.log('deploy-gas: wrote', guidePath)
}

function main() {
  console.log('=== Heina Suite · deploy (GAS bundle) ===\n')

  run('TypeScript + Vite 正式建置', 'npm run build')
  run('路由白名單', 'node scripts/verify-app-routes.mjs')
  run('進貨整合診斷', 'node scripts/diagnose-procurement.mjs')
  run('Seed 資料', 'npx tsx scripts/verify-seed.ts')
  run('GAS 單檔 HTML + Code.gs bundle', 'npm run build:gas')

  if (!existsSync(indexPath) || !existsSync(codePath)) {
    console.error('\n❌ 缺少 deploy 產物：', indexPath, codePath)
    process.exit(1)
  }

  const builtAt = new Date().toISOString()
  mkdirSync(bundleDir, { recursive: true })

  const manifest = {
    builtAt,
    package: 'heina-suite',
    command: 'npm run deploy',
    files: {
      'index.html': fileInfo(indexPath),
      'Code.gs': fileInfo(codePath),
    },
    checks: ['verify-app-routes', 'diagnose-procurement', 'verify-seed'],
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  writeDeployGuide(builtAt)

  console.log('\n✅ 部署產物就緒：')
  console.log('   ', indexPath)
  console.log('   ', codePath)
  console.log('   ', manifestPath)
  console.log('   ', guidePath)
  console.log('\n下一步：依「複製到AppsScript.txt」將 [A][B] 貼入 Google Apps Script 並重新部署 Web App。\n')
}

main()
