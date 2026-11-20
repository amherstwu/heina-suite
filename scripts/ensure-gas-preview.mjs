/**
 * 確認本機 GAS 預覽 port 可用；若被其他程式（如 npx serve）占用則結束該行程。
 *  exit 0 = 已是 heina 預覽伺服器
 *  exit 1 = port 空閒，可啟動 preview-gas-server
 *  exit 2 = 已清掉占用，port 空閒
 */
import { execSync } from 'node:child_process'
import http from 'node:http'
import { platform } from 'node:os'

const port = Number(process.argv[2] || process.env.HEINA_PORT || 5280)

function probePreviewHub() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/preview/', timeout: 2500 },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
          if (body.length > 8000) req.destroy()
        })
        res.on('end', () => {
          const ok = res.statusCode === 200 && body.includes('heina-preview-hub')
          resolve({ up: true, ok })
        })
      },
    )
    req.on('timeout', () => {
      req.destroy()
      resolve({ up: false, ok: false })
    })
    req.on('error', () => resolve({ up: false, ok: false }))
  })
}

function probe() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/', timeout: 2500 },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
          if (body.length > 8000) req.destroy()
        })
        res.on('end', () => {
          const ok =
            res.statusCode === 200 &&
            (body.includes('heina-preview-hub') ||
              body.includes('GAS-APPS-SCRIPT-COPY') ||
              body.includes('id="root"'))
          resolve({ up: true, ok })
        })
      },
    )
    req.on('timeout', () => {
      req.destroy()
      resolve({ up: false, ok: false })
    })
    req.on('error', () => resolve({ up: false, ok: false }))
  })
}

function pidsOnPortWindows(p) {
  try {
    const out = execSync(`netstat -ano | findstr "LISTENING" | findstr ":${p} "`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/\s(\d+)\s*$/)
      if (m && m[1] !== '0') pids.add(m[1])
    }
    return [...pids]
  } catch {
    return []
  }
}

function killPort(p) {
  if (platform() !== 'win32') return 0
  const pids = pidsOnPortWindows(p)
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
      console.log(`ensure-gas-preview: stopped PID ${pid} on port ${p}`)
    } catch {
      /* ignore */
    }
  }
  return pids.length
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const hub = await probePreviewHub()
  if (hub.ok) {
    console.log(`ensure-gas-preview: port ${port} OK (heina preview hub)`)
    process.exit(0)
  }

  const first = await probe()
  if (first.ok) {
    console.log(`ensure-gas-preview: port ${port} OK (heina preview)`)
    process.exit(0)
  }

  if (first.up || hub.up) {
    console.log(`ensure-gas-preview: port ${port} has wrong server, clearing…`)
    killPort(port)
    await sleep(800)
    const again = await probe()
    if (again.ok) process.exit(0)
    process.exit(2)
  }

  const pids = pidsOnPortWindows(port)
  if (pids.length > 0) {
    console.log(`ensure-gas-preview: port ${port} in use but not HTTP, clearing…`)
    killPort(port)
    await sleep(800)
    process.exit(2)
  }

  console.log(`ensure-gas-preview: port ${port} free`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
