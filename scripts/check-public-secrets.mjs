/**
 * Fail if source, the GAS bundle, or dist still contains organizer secrets.
 *
 * Known retired values are NOT stored in this file. CI can pass them with the
 * HEINA_SECRET_MARKERS secret: one marker per line, or separated by ||.
 * Generic heuristics still run when that secret is unset.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const skipDir = new Set(['node_modules', '.git', 'gas-web', 'dist'])
const extraRoots = ['dist']

function markersFromEnv() {
  const raw = process.env.HEINA_SECRET_MARKERS || ''
  const parts = raw.split(/\r?\n|\|\|/)
  const out = []
  for (const part of parts) {
    const marker = part.trim()
    if (marker.length >= 4) out.push(marker)
  }
  return out
}

const envMarkers = markersFromEnv()

/** Patterns that mean a real secret was pasted back into the tree. */
const heuristics = [
  {
    name: 'hardcoded secret assignment',
    re: /(?:DEFAULT_PIN|lookupPin|adminPassword|bankPassword|accessPassword)\s*[:=]\s*['"][^'"\n]{3,}['"]/g,
  },
  {
    name: 'sha256 hex literal',
    re: /['"][a-f0-9]{64}['"]/gi,
  },
  {
    name: 'prompted password compared to a literal',
    re: /prompt\(\s*['"]密碼['"]\s*\)[\s\S]{0,180}?===?\s*['"][^'"\n]+['"]/g,
  },
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
    const text = readFileSync(p, 'utf8')
    for (const marker of envMarkers) {
      if (text.includes(marker)) hits.push(`${relative(root, p)} contains a configured secret marker`)
    }
    for (const rule of heuristics) {
      rule.re.lastIndex = 0
      if (rule.re.test(text)) hits.push(`${relative(root, p)} matches ${rule.name}`)
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
console.log(
  `check-public-secrets: ok (${envMarkers.length} env marker${envMarkers.length === 1 ? '' : 's'}, ${heuristics.length} heuristics)`,
)
