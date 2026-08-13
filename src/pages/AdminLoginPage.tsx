import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Shield } from 'lucide-react'
import { Btn, Card } from '../components/ui'
import { useDaigouStore } from '../daigou/store'
import {
  clearAdminSession,
  hashAdminPassword,
  isAdminSessionValid,
  startAdminSession,
} from '../auth/adminSession'
import {
  DEFAULT_ADMIN_LOGIN_LOCK_MINUTES,
  DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS,
  DEFAULT_ADMIN_PASSWORD,
  isDefaultAdminPasswordHash,
} from '../auth/adminDefaults'
import { clearLoginLock, getLoginLockState, recordFailedLogin } from '../auth/adminFirewall'
import { APP_NAME } from '../daigou/constants'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const loc = useLocation()
  const [search] = useSearchParams()
  const settings = useDaigouStore((s) => s.settings)
  const updateSettings = useDaigouStore((s) => s.updateSettings)
  const addToast = useDaigouStore((s) => s.addToast)

  const enabled = settings.adminAuthEnabled !== false
  const hash = (settings.adminPasswordHash ?? '').trim()
  const sessionHours = settings.adminSessionHours ?? 12
  const maxAttempts = settings.adminLoginMaxAttempts ?? DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS
  const lockMinutes = settings.adminLoginLockMinutes ?? DEFAULT_ADMIN_LOGIN_LOCK_MINUTES
  const setupMode = search.get('setup') === '1' || !hash
  const stillDefaultPassword = isDefaultAdminPasswordHash(hash)

  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lockTick, setLockTick] = useState(0)

  const lockState = getLoginLockState()

  useEffect(() => {
    if (!lockState.locked) return
    const id = window.setInterval(() => setLockTick((t) => t + 1), 30000)
    return () => window.clearInterval(id)
  }, [lockState.locked, lockState.untilMs, lockTick])

  useEffect(() => {
    if (!enabled) {
      navigate('/dashboard', { replace: true })
      return
    }
    if (hash && isAdminSessionValid()) {
      const from = (loc.state as { from?: string } | null)?.from
      const dest = from && from !== '/login' && !from.startsWith('/login') ? from : '/dashboard'
      navigate(dest, { replace: true })
    }
  }, [enabled, hash, loc.state, navigate])

  async function onSetup(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (lockState.locked) {
      setErr(`登入已鎖定，請 ${lockState.remainingMinutes} 分鐘後再試`)
      return
    }
    if (pwd.length < 6) {
      setErr('密碼至少 6 字元')
      return
    }
    if (pwd !== pwd2) {
      setErr('兩次密碼不一致')
      return
    }
    setBusy(true)
    try {
      const h = await hashAdminPassword(pwd)
      updateSettings({ adminPasswordHash: h, adminAuthEnabled: true, adminSessionHours: sessionHours })
      clearAdminSession()
      clearLoginLock()
      startAdminSession(sessionHours)
      navigate('/dashboard', { replace: true })
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '建立失敗')
    } finally {
      setBusy(false)
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (lockState.locked) {
      setErr(`登入已鎖定，請 ${lockState.remainingMinutes} 分鐘後再試`)
      return
    }
    if (!pwd) {
      setErr('請輸入密碼')
      return
    }
    setBusy(true)
    try {
      const h = await hashAdminPassword(pwd)
      if (h !== hash) {
        const r = recordFailedLogin({ maxAttempts, lockMinutes })
        if (r.locked) {
          setErr(`密碼錯誤次數過多，已鎖定 ${r.remainingMinutes} 分鐘`)
        } else {
          setErr(`密碼錯誤（尚可嘗試 ${r.attemptsLeft} 次）`)
        }
        setLockTick((t) => t + 1)
        return
      }
      clearLoginLock()
      startAdminSession(sessionHours)
      addToast('已登入後台', 'ok')
      const from = (loc.state as { from?: string } | null)?.from
      const dest = from && from !== '/login' && !from.startsWith('/login') ? from : '/dashboard'
      navigate(dest, { replace: true })
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '登入失敗')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) return null

  const locked = lockState.locked

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-[#f6f4ff] via-[#faf9fc] to-[#f1f5f9] px-4 py-12 text-slate-800">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,181,253,0.35),_transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-200/60 ring-1 ring-violet-300/50">
            <Shield className="h-7 w-7 text-violet-600" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{APP_NAME} 後台</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            顧客專區 <code className="rounded bg-violet-100 px-1 text-violet-800">#/lookup</code>、
            <code className="rounded bg-violet-100 px-1 text-violet-800">#/portal</code>、現貨{' '}
            <code className="rounded bg-violet-100 px-1 text-violet-800">#/shop</code> 不需登入；以下為管理區域閘道。
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link
              to="/lookup"
              className="font-medium text-violet-600 underline-offset-2 hover:text-violet-500 hover:underline"
            >
              ← 完整顧客專區
            </Link>
            <Link
              to="/portal"
              className="font-medium text-violet-600 underline-offset-2 hover:text-violet-500 hover:underline"
            >
              ← 簡易查單
            </Link>
          </div>
        </div>

        <Card className="!border-violet-200/80 !bg-white/90 !p-6 shadow-xl shadow-violet-200/30 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Lock className="h-4 w-4 text-violet-500" strokeWidth={1.75} />
            {setupMode ? '首次使用：建立管理密碼' : '管理員登入'}
          </div>

          {locked ? (
            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              登入已暫時鎖定（連續錯誤 {maxAttempts} 次），請約 {lockState.remainingMinutes} 分鐘後再試。
            </p>
          ) : null}

          {!setupMode && stillDefaultPassword ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900/90">
              目前仍為系統預設密碼。初次登入可使用{' '}
              <code className="rounded bg-amber-100 px-1 font-mono text-amber-900">{DEFAULT_ADMIN_PASSWORD}</code>
              ，登入後請至「設定 → 安全與防火牆」立即修改。
            </p>
          ) : null}

          {setupMode ? (
            <form className="space-y-4" onSubmit={onSetup}>
              <label className="block text-xs font-medium text-slate-600">
                新密碼（至少 6 字）
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={locked}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                確認密碼
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={locked}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                />
              </label>
              {err ? <p className="text-sm text-rose-400">{err}</p> : null}
              <Btn type="submit" className="w-full" disabled={busy || locked}>
                {busy ? '處理中…' : '建立並登入'}
              </Btn>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onLogin}>
              <label className="block text-xs font-medium text-slate-600">
                管理密碼
                <input
                  type="password"
                  autoComplete="current-password"
                  disabled={locked}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </label>
              {err ? <p className="text-sm text-rose-400">{err}</p> : null}
              <Btn type="submit" className="w-full" disabled={busy || locked}>
                {busy ? '驗證中…' : '登入'}
              </Btn>
            </form>
          )}

          <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
            密碼以 SHA-256 存於本機瀏覽器；工作階段關閉分頁後失效。連續錯誤 {maxAttempts} 次將鎖定{' '}
            {lockMinutes} 分鐘。正式上線請於 nginx／Cloudflare／VPN 再限制管理路徑或來源 IP。
          </p>
        </Card>
      </div>
    </div>
  )
}
