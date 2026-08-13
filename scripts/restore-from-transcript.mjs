/**
 * Restore heina-suite from transcript — chronological Write + StrReplace replay.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const transcriptPath =
  process.argv[2] ||
  path.join(
    'C:',
    'Users',
    'amherst Acalerate',
    '.cursor',
    'projects',
    'c-Users-amherst-Acalerate',
    'agent-transcripts',
    '92d6d5a1-54e0-4f0e-aabe-6f1cf03630c7',
    '92d6d5a1-54e0-4f0e-aabe-6f1cf03630c7.jsonl',
  )

const DEFAULT_PACKAGE_JSON = `{
  "name": "heina-suite",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "globals": "^15.14.0",
    "typescript": "~5.6.2",
    "typescript-eslint": "^8.18.2",
    "vite": "^6.0.5"
  }
}
`

const SEED_FILES = {
  'package.json': DEFAULT_PACKAGE_JSON,
}

function normalizeRel(p) {
  const norm = p.replace(/\\/g, '/')
  const idx = norm.toLowerCase().indexOf('/heina-suite/')
  if (idx === -1) return null
  return norm.slice(idx + '/heina-suite/'.length)
}

/** @type {Map<string, string>} */
const files = new Map(Object.entries(SEED_FILES))
const ops = []

if (!fs.existsSync(transcriptPath)) {
  console.error('Transcript not found:', transcriptPath)
  process.exit(1)
}

for (const line of fs.readFileSync(transcriptPath, 'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue
  let row
  try {
    row = JSON.parse(line)
  } catch {
    continue
  }
  const content = row?.message?.content
  if (!Array.isArray(content)) continue
  for (const block of content) {
    if (block?.type !== 'tool_use') continue
    const name = block.name
    const input = block.input || {}
    const filePath = input.path
    if (!filePath) continue
    const rel = normalizeRel(filePath)
    if (!rel) continue
    if (name === 'Write' && typeof input.contents === 'string') {
      ops.push({ kind: 'write', rel, contents: input.contents })
    } else if (
      name === 'StrReplace' &&
      typeof input.old_string === 'string' &&
      typeof input.new_string === 'string'
    ) {
      ops.push({
        kind: 'replace',
        rel,
        old_string: input.old_string,
        new_string: input.new_string,
      })
    }
  }
}

let writes = 0
let replaces = 0
let replaceMiss = 0

for (const op of ops) {
  if (op.kind === 'write') {
    files.set(op.rel, op.contents)
    writes++
    continue
  }
  let cur = files.get(op.rel)
  if (cur === undefined) {
    const abs = path.join(root, op.rel)
    if (fs.existsSync(abs)) cur = fs.readFileSync(abs, 'utf8')
  }
  if (cur === undefined) {
    replaceMiss++
    continue
  }
  if (!cur.includes(op.old_string)) {
    replaceMiss++
    continue
  }
  files.set(op.rel, cur.replace(op.old_string, op.new_string))
  replaces++
}

let written = 0
for (const [rel, body] of files) {
  const abs = path.join(root, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, body, 'utf8')
  written++
}

console.log(
  JSON.stringify({ writes, replaces, replaceMiss, filesOnDisk: written }, null, 2),
)
