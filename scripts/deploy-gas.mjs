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
  const guide = `Heina Suite — GitHub Pages 前端 + Apps Script API
==================================================
建置時間：${builtAt}

顧客網站：https://amherstwu.github.io/heina-suite/
（GitHub Pages，來源選 GitHub Actions。私人倉庫需要付費方案。）

Apps Script Web App（結尾 /exec）是資料 API，不是網站本體。
部署：執行身分「我」、存取權「任何人」。把 /exec 網址設成 GitHub Actions 變數 VITE_GAS_URL 後重新跑 workflow。

指令碼屬性（不要提交到 Git）：
  HEINA_ADMIN_PASSWORD
  HEINA_LOOKUP_PIN
  HEINA_BANK_PASSWORD
  HEINA_PAGES_URL（選用）

Code.gs 由 gas/*.gs 合併而來。index.html 只是說明頁，請顧客開 GitHub Pages。
Hash 路由：#/lookup、#/shop、#/login、#/dashboard、#/procurement、#/integrations。

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
