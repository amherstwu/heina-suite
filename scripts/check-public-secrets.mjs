/**
 * Fail if known organizer secrets are still in source, the GAS bundle, or dist.
 * The checker file itself is excluded. Do not add the secret values anywhere else.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const skipDir = new Set(['node_modules', '.git', 'gas-web', 'dist'])
const extraRoots = ['dist']

const needles = [
  'HeinaOwner2026',
  'HeinaBank',
  'ee020aad8651bcf2db73d0c7dec418e95f9e6a80d20bb44ea0dac14023cdd50d',
  '預設密碼 1314',
  "DEFAULT_PIN = '1314'",
  'lookupPin: \'1314\'',
]

function walk(dir, hits) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (skipDir.has(name)) continue
    const p = join(dir, name)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      walk(p, hits)
      continue
    }
    if (st.size > 8_000_000) {
      hits.push(`${relative(root, p)} (file is ${st.size} bytes; refusing to ship a giant bundle)`)
      continue
    }
    if (!/\.(html|js|mjs|cjs|css|json|gs|ts|tsx|md|txt|svg|yml|yaml)$/.test(name)) continue
    if (p.endsWith('scripts/check-public-secrets.mjs')) continue
    const text = readFileSync(p, 'utf8')
    for (const n of needles) {
      if (text.includes(n)) hits.push(`${relative(root, p)} contains a removed secret marker`)
    }
  }
}

const hits = []
walk(root, hits)
for (const extra of extraRoots) {
  const dir = join(root, extra)
  try {
    if (statSync(dir).isDirectory()) walk(dir, hits)
  } catch {
    /* dist may not exist yet */
  }
}

if (hits.length) {
  console.error('Public secret check failed:')
  for (const h of hits) console.error('  - ' + h)
  process.exit(1)
}
console.log('check-public-secrets: ok')
