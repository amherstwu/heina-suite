/**
 * Apply "Add File" hunks from ApplyPatch tool calls in transcript.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const transcriptPath = process.argv[2] || path.join(
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

function toRel(filePath) {
  const norm = filePath.replace(/\\/g, '/')
  const idx = norm.toLowerCase().indexOf('/heina-suite/')
  if (idx >= 0) return norm.slice(idx + '/heina-suite/'.length)
  if (norm.toLowerCase().includes('heina-suite/')) {
    const i = norm.toLowerCase().indexOf('heina-suite/')
    return norm.slice(i + 'heina-suite/'.length)
  }
  return null
}

/** @type {Map<string, string>} */
const files = new Map()

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
    if (block?.type !== 'tool_use' || block.name !== 'ApplyPatch') continue
    const patch = block.input
    if (typeof patch !== 'string') continue
    const chunks = patch.split('*** Begin Patch').slice(1)
    for (const chunk of chunks) {
      const addMatch = chunk.match(/\*\*\* Add File:\s*(.+?)\r?\n([\s\S]*?)(?=\*\*\*|$)/)
      if (!addMatch) continue
      const rel = toRel(addMatch[1].trim())
      if (!rel) continue
      const body = addMatch[2]
        .split(/\r?\n/)
        .filter((l) => l.startsWith('+'))
        .map((l) => l.slice(1))
        .join('\n')
      files.set(rel, body)
    }
  }
}

let n = 0
for (const [rel, body] of files) {
  const abs = path.join(root, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, body, 'utf8')
  n++
}
console.log('ApplyPatch Add File restored:', n)
