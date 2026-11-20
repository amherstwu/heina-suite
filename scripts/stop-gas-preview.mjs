/**
 * 停止本機 GAS 預覽（釋放 port，預設 5280）
 */
import { execSync } from 'node:child_process'
import { platform } from 'node:os'

const port = Number(process.argv[2] || process.env.HEINA_PORT || 5280)

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
  if (platform() !== 'win32') {
    console.log('stop-gas-preview: only Windows is supported for auto-stop')
    return 0
  }
  const pids = pidsOnPortWindows(p)
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
      console.log(`已停止 PID ${pid}（port ${p}）`)
    } catch {
      console.log(`無法停止 PID ${pid}`)
    }
  }
  return pids.length
}

const n = killPort(port)
if (n === 0) {
  console.log(`port ${port} 目前沒有在監聽的程式。`)
} else {
  console.log(`已釋放 port ${port}。`)
}
