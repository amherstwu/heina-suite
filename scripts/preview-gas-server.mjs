/**
 * 本機預覽 gas-web/index.html（與貼上 Apps Script 相同前端）
 * 用法：node scripts/preview-gas-server.mjs [port]
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const webRoot = resolve(root, 'gas-web')
const previewRoot = resolve(root, 'preview')
const indexPath = resolve(webRoot, 'index.html')
const previewIndexPath = resolve(previewRoot, 'index.html')
const port = Number(process.argv[2] || process.env.HEINA_PORT || 5280)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

function readStatic(baseRoot, pathname) {
  const safe = pathname.replace(/\\/g, '/').replace(/\.\.+/g, '')
  const rel = safe.startsWith('/') ? safe.slice(1) : safe
  const file = resolve(baseRoot, rel)
  if (!file.startsWith(baseRoot)) return null
  if (!existsSync(file) || statSync(file).isDirectory()) return null
  return file
}

function serveFile(res, file) {
  const ext = extname(file).toLowerCase()
  const type = MIME[ext] || 'application/octet-stream'
  send(res, 200, readFileSync(file), type)
}

if (!existsSync(indexPath)) {
  console.error('preview-gas-server: missing', indexPath)
  console.error('Run: npm run deploy   (or npm run build:gas)')
  process.exit(1)
}

const server = createServer((req, res) => {
  const raw = (req.url || '/').split('?')[0] || '/'
  const pathname = decodeURIComponent(raw)

  // 本機預覽入口（獨立於 SPA）
  if (pathname === '/preview' || pathname === '/preview/') {
    if (existsSync(previewIndexPath)) {
      return serveFile(res, previewIndexPath)
    }
    res.writeHead(302, { Location: '/#/lookup' })
    res.end()
    return
  }
  if (pathname.startsWith('/preview/')) {
    const rel = pathname.slice('/preview/'.length)
    const file = readStatic(previewRoot, rel)
    if (file) return serveFile(res, file)
    res.writeHead(404)
    res.end('Not found')
    return
  }

  // 常見誤開網址（缺少 #）→ 導向 hash 路由
  if (pathname === '/lookup' || pathname.startsWith('/lookup/')) {
    res.writeHead(302, { Location: '/#/lookup' })
    res.end()
    return
  }
  if (pathname !== '/' && pathname !== '/index.html' && !pathname.includes('.')) {
    const hashPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    res.writeHead(302, { Location: `/#${hashPath}` })
    res.end()
    return
  }

  const file = readStatic(webRoot, pathname === '/' ? '/index.html' : pathname)
  if (!file) {
    const html = readFileSync(indexPath)
    return send(res, 200, html, MIME['.html'])
  }
  serveFile(res, file)
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`preview-gas-server: port ${port} already in use`)
    console.error('Close heina-suite-gas-preview window or other app on this port, then retry.')
  } else {
    console.error('preview-gas-server:', err)
  }
  process.exit(1)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Heina preview hub: http://127.0.0.1:${port}/preview/`)
  console.log(`Heina GAS app:     http://127.0.0.1:${port}/#/lookup`)
  console.log(`Serving gas-web:   ${webRoot}`)
  if (existsSync(previewRoot)) console.log(`Serving preview:   ${previewRoot}`)
})
