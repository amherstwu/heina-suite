/**
 * vite-plugin-singlefile 仍以來源檔名輸出 UI.html；複製一份 index.html 方便託管預設首頁與「整份複製」說明。
 */
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = resolve(root, 'gas-web', 'UI.html')
const dst = resolve(root, 'gas-web', 'index.html')

if (!existsSync(src)) {
  console.error('gas-web-copy-index: missing', src, '(run vite build --config vite.config.gas.ts first)')
  process.exit(1)
}
copyFileSync(src, dst)
console.log('gas-web-copy-index: wrote', dst)
