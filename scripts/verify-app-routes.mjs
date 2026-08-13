/**
 * 驗證 `App.tsx` 的 Route path 皆可被 `hashPathPrefixes` 白名單覆蓋（path→hash 深連結），
 * 並檢查 `adminNavConfig` 的導覽目標存在於白名單。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(p) {
  return fs.readFileSync(path.join(root, p), 'utf8')
}

function parseHashPrefixes(src) {
  const m = src.match(/HASH_APP_ROUTE_PREFIXES\s*=\s*\[([\s\S]*?)\]\s*as\s*const/)
  if (!m) throw new Error('無法解析 HASH_APP_ROUTE_PREFIXES')
  const out = []
  for (const line of m[1].split('\n')) {
    const q = line.match(/'([^']+)'/)
    if (q) out.push(q[1])
  }
  return out
}

/** 與 main.tsx `isAppRoutePath` 一致：pathname 可被某白名單前綴涵蓋 */
function pathCoveredByWhitelist(staticPath, prefixes) {
  for (const pre of prefixes) {
    if (staticPath === pre || staticPath.startsWith(`${pre}/`)) return true
  }
  return false
}

/** `/groups/:id` → `/groups` */
function staticRoutePath(routePath) {
  if (routePath === '*' || routePath === '/') return null
  return routePath.replace(/\/:[^/]+(?=\/|$)/g, '')
}

function main() {
  const app = read('src/App.tsx')
  const hashFile = read('src/router/hashPathPrefixes.ts')
  const prefixes = parseHashPrefixes(hashFile)

  const paths = new Set()
  for (const m of app.matchAll(/path="([^"]+)"/g)) {
    paths.add(m[1])
  }

  const staticPaths = new Set()
  for (const p of paths) {
    const s = staticRoutePath(p)
    if (s) staticPaths.add(s)
  }

  const missing = []
  for (const sp of staticPaths) {
    if (!pathCoveredByWhitelist(sp, prefixes)) missing.push(sp)
  }

  if (missing.length) {
    console.error('以下 App 路由無法被 hashPathPrefixes 白名單涵蓋：')
    for (const x of missing.sort()) console.error('  -', x)
    console.error('請同步更新 src/router/hashPathPrefixes.ts')
    process.exit(1)
  }

  const admin = read('src/shell/adminNavConfig.ts')
  const navTos = [...admin.matchAll(/\{\s*to:\s*'([^']+)'/g)].map((x) => x[1])
  const secPrefixes = [...admin.matchAll(/\{\s*prefix:\s*'([^']+)'/g)].map((x) => x[1])
  const navMissing = []
  for (const p of [...navTos, ...secPrefixes]) {
    if (p === '/') continue
    if (!pathCoveredByWhitelist(p, prefixes)) navMissing.push(p)
  }
  if (navMissing.length) {
    console.error('adminNavConfig 中有路徑未被白名單涵蓋：')
    for (const x of [...new Set(navMissing)].sort()) console.error('  -', x)
    process.exit(1)
  }

  console.log(`✅ App 路由 ${staticPaths.size} 條皆在白名單內；導覽路徑檢查通過。`)
}

main()
