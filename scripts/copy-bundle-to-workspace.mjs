import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(__dirname, '../deploy/apps-script-bundle')
const dest = path.resolve(__dirname, '../deploy/apps-script-bundle')

// When run from Projects/heina-suite, also mirror to Cursor workspace if set.
const workspaceRoot = process.env.HEINA_WORKSPACE_ROOT
if (workspaceRoot) {
  const wsDest = path.join(workspaceRoot, 'heina-suite', 'deploy', 'apps-script-bundle')
  fs.mkdirSync(wsDest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name)
    if (!fs.statSync(from).isFile()) continue
    fs.copyFileSync(from, path.join(wsDest, name))
    console.log('copied', name, '→', wsDest)
  }
}

console.log('bundle ready at', src)
for (const name of fs.readdirSync(src)) {
  const st = fs.statSync(path.join(src, name))
  if (st.isFile()) console.log(' ', name, Math.round(st.size / 1024), 'KB')
}
