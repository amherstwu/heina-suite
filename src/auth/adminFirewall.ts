/**
 * 後台登入防火牆（本機）：連續錯誤鎖定、成功後清除計數。
 * 無法取代伺服器／CDN 層 IP 限制，但可擋簡單密碼暴力嘗試。
 */
const STORAGE_FAILS = 'heina.admin.loginFailCount'
const STORAGE_LOCK_UNTIL = 'heina.admin.loginLockUntil'

export type AdminFirewallPolicy = {
  maxAttempts: number
  lockMinutes: number
}

function readFails(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_FAILS) || '0')
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

function writeFails(n: number) {
  try {
    if (n <= 0) localStorage.removeItem(STORAGE_FAILS)
    else localStorage.setItem(STORAGE_FAILS, String(n))
  } catch {
    /* ignore */
  }
}

function readLockUntil(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_LOCK_UNTIL) || '0')
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function writeLockUntil(ms: number) {
  try {
    if (ms <= 0) localStorage.removeItem(STORAGE_LOCK_UNTIL)
    else localStorage.setItem(STORAGE_LOCK_UNTIL, String(ms))
  } catch {
    /* ignore */
  }
}

export function getLoginLockState(): {
  locked: boolean
  untilMs: number
  remainingMinutes: number
  failCount: number
} {
  const untilMs = readLockUntil()
  const now = Date.now()
  if (untilMs > now) {
    return {
      locked: true,
      untilMs,
      remainingMinutes: Math.max(1, Math.ceil((untilMs - now) / 60000)),
      failCount: readFails(),
    }
  }
  if (untilMs > 0) {
    writeLockUntil(0)
    writeFails(0)
  }
  return { locked: false, untilMs: 0, remainingMinutes: 0, failCount: readFails() }
}

export function recordFailedLogin(policy: AdminFirewallPolicy): {
  locked: boolean
  attemptsLeft: number
  remainingMinutes: number
} {
  const max = Math.max(3, Math.min(20, policy.maxAttempts))
  const lockMin = Math.max(1, Math.min(120, policy.lockMinutes))
  const next = readFails() + 1
  writeFails(next)
  if (next >= max) {
    const until = Date.now() + lockMin * 60000
    writeLockUntil(until)
    writeFails(0)
    return { locked: true, attemptsLeft: 0, remainingMinutes: lockMin }
  }
  return { locked: false, attemptsLeft: max - next, remainingMinutes: 0 }
}

export function clearLoginLock() {
  writeFails(0)
  writeLockUntil(0)
}
