/**
 * 後台登入工作階段（僅 sessionStorage，關閉分頁即失效）。
 * 此為應用層閘道；正式環境仍建議於反向代理／Cloudflare Access／VPN 限制來源 IP 或路徑。
 */
const STORAGE_UNTIL = 'heina_suite_admin_sess_until'
const STORAGE_MARK = 'heina_suite_admin_sess_v1'

const PEPPER = 'heina-suite-admin-gate-v1'

export async function hashAdminPassword(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(`${plain}${PEPPER}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
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

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(STORAGE_MARK)
    sessionStorage.removeItem(STORAGE_UNTIL)
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
