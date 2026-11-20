/**
 * 建置完成後開啟本機 GAS 預覽（Windows 下正確保留 hash）
 * 用法：
 *   node scripts/open-gas-preview.mjs http [port] [path]
 *   node scripts/open-gas-preview.mjs file
 *
 * path 預設 /preview/（預覽首頁）；可傳 /#/lookup 等
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const mode = process.argv[2] || 'http'
const port = process.argv[3] || '5280'
const pathArg = process.argv[4] || '/preview/'
const indexPath = resolve(root, 'gas-web', 'index.html')

function openWindows(url) {
  spawn('rundll32', ['url.dll,FileProtocolHandler', url], {
    detached: true,
    stdio: 'ignore',
  }).unref()
}

function openDefault(url) {
  if (process.platform === 'win32') return openWindows(url)
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref()
}

function joinPreviewPath(path) {
  if (path.startsWith('/#/')) return path
  if (path.startsWith('#/')) return `/${path}`
  if (path.startsWith('/')) return path
  return `/${path}`
}

if (mode === 'file') {
  if (!existsSync(indexPath)) {
    console.error('Missing:', indexPath)
    process.exit(1)
  }
  const href = new URL('#/lookup', `file:///${indexPath.replace(/\\/g, '/')}`).href
  openDefault(href)
  console.log('Opened:', href)
} else {
  const suffix = joinPreviewPath(pathArg)
  const bust = `t=${Date.now()}`
  const href = `http://127.0.0.1:${port}${suffix}${suffix.includes('?') ? '&' : '?'}${bust}`
  openDefault(href)
  console.log('Opened:', href)
}
