/**
 * 後台登入工作階段（僅 sessionStorage，關閉分頁即失效）。
 * 此為應用層閘道；正式環境仍建議於反向代理／Cloudflare Access／VPN 限制來源 IP 或路徑。
 */
import { sha256Hex } from './sha256'

const STORAGE_UNTIL = 'heina_suite_admin_sess_until'
const STORAGE_MARK = 'heina_suite_admin_sess_v1'
const STORAGE_TOKEN = 'heina_suite_admin_token'

const PEPPER = 'heina-suite-admin-gate-v1'

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashAdminPassword(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(`${plain}${PEPPER}`)
  const subtle = globalThis.crypto?.subtle
  if (subtle?.digest) {
    try {
      return toHex(await subtle.digest('SHA-256', enc))
    } catch {
      /* HTTP 區網等非安全來源可能沒有 SubtleCrypto */
    }
  }
  return sha256Hex(enc)
}

export function startAdminSession(sessionHours: number) {
  const h = Math.max(1, Math.min(168, sessionHours))
  const until = Date.now() + h * 3600000
  try {
    sessionStorage.setItem(STORAGE_MARK, '1')
    sessionStorage.setItem(STORAGE_UNTIL, String(until))
  } catch {
    /* ignore */
  }
}

export function setAdminToken(token: string) {
  try {
    if (token) sessionStorage.setItem(STORAGE_TOKEN, token)
    else sessionStorage.removeItem(STORAGE_TOKEN)
  } catch {
    /* ignore */
  }
}

export function getAdminToken(): string {
  try {
    return sessionStorage.getItem(STORAGE_TOKEN) || ''
  } catch {
    return ''
  }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(STORAGE_MARK)
    sessionStorage.removeItem(STORAGE_UNTIL)
    sessionStorage.removeItem(STORAGE_TOKEN)
  } catch {
    /* ignore */
  }
}

export function isAdminSessionValid(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_MARK) !== '1') return false
    const until = Number(sessionStorage.getItem(STORAGE_UNTIL) || '0')
    return Number.isFinite(until) && Date.now() < until
  } catch {
    return false
  }
}
