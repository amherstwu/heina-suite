/**
 * 寫入本機預覽首頁用的建置資訊（deploy 後執行）
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const manifestPath = resolve(root, 'deploy', 'apps-script-bundle', 'deploy-manifest.json')
const bundleIndex = resolve(root, 'deploy', 'apps-script-bundle', 'index.html')
const previewDir = resolve(root, 'preview')
const outPath = resolve(previewDir, 'hub-meta.json')

let builtAt = new Date().toISOString()
let bundleSha = ''

if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (manifest.builtAt) builtAt = manifest.builtAt
    bundleSha = manifest.files?.['index.html']?.sha256Prefix ?? ''
  } catch {
    /* use defaults */
  }
}

if (!bundleSha && existsSync(bundleIndex)) {
  bundleSha = createHash('sha256').update(readFileSync(bundleIndex)).digest('hex').slice(0, 16)
}

mkdirSync(previewDir, { recursive: true })
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      builtAt,
      bundleSha,
      port: 5280,
      app: 'heina-suite',
      hub: '/preview/',
    },
    null,
    2,
  )}\n`,
  'utf8',
)
console.log('write-preview-hub-meta: OK', outPath)
