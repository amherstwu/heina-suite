import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  LogOut,
  Store,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { APP_BRAND_CORE, APP_BRAND_SHOP, APP_NAME } from '../daigou/constants'
import { useDaigouStore } from '../daigou/store'
import { AppDrawer } from '../components/app/AppDrawer'
import { PageLayout } from '../components/app/PageLayout'
import { cx } from '../components/app/cx'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { ADMIN_NAV_ITEMS, adminNavLabelForPath } from './adminNavConfig'
import { Btn } from '../components/ui'
import { clearAdminSession } from '../auth/adminSession'
import { RouteFallback } from '../components/app/RouteFallback'
import { useAdminLayoutMode } from '../layout/adminLayoutPreference'
import { AdminLayoutToggle } from './AdminLayoutToggle'
import './admin.layout.css'

const STORAGE_SIDEBAR = 'hm.sidebar.collapsed'

const mobilePrimary = ADMIN_NAV_ITEMS.filter((n) => n.mobileQuick)

function pathActive(pathname: string, to: string, end?: boolean) {
  if (to === '/dashboard') return pathname === '/dashboard'
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function ProShell() {
  const loc = useLocation()
  const navigate = useNavigate()
  const toasts = useDaigouStore((s) => s.toasts)
  const dismissToast = useDaigouStore((s) => s.dismissToast)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_SIDEBAR) === '1'
    } catch {
      return false
    }
  })
  const [moreOpen, setMoreOpen] = useState(false)
  const { mode: layoutMode, setMode: setLayoutMode, layoutClass, forcePhoneFrame } = useAdminLayoutMode()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIDEBAR, sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    const page = adminNavLabelForPath(loc.pathname)
    document.title = `${page} — ${APP_NAME}`
  }, [loc.pathname])

  return (
    <div
      className={cx(
        'admin-shell relative min-h-dvh font-sans text-ds-text',
        layoutClass,
        forcePhoneFrame && 'admin-shell--phone-frame',
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 ds-app-bg" aria-hidden />
      <div className="relative z-[1] flex min-h-dvh admin-shell-body">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          pathname={loc.pathname}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />

        <div className="admin-shell-column relative z-10 flex min-w-0 flex-1 flex-col">
          <header
            className="admin-mobile-only admin-mobile-top sticky top-0 z-40 min-h-[3.25rem] touch-manipulation items-center justify-between gap-2 border-b border-[color:var(--ds-chrome-border-faint)] bg-ds-surface/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-2xl"
          >
            <div className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-ds-text" title={APP_NAME}>
              <span>{APP_BRAND_CORE}</span>
              <span className="text-ds-highlight/90"> {APP_BRAND_SHOP}</span>
            </div>
            <div className="admin-mobile-top-actions flex shrink-0 items-center gap-1">
              <AdminLayoutToggle mode={layoutMode} onChange={setLayoutMode} className="admin-layout-toggle--compact" />
              <NavLink
                to="/lookup"
                className="flex h-11 max-w-[7.5rem] items-center justify-center rounded-xl px-2 text-[11px] font-extrabold leading-tight text-ds-primary transition hover:bg-ds-primary/10 active:bg-ds-primary/16"
              >
                自助查詢
              </NavLink>
              <button
                type="button"
                aria-label="開啟選單"
                onClick={() => setMoreOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-ds-text-secondary transition hover:bg-[color:var(--ds-chrome-hover-bg)] hover:text-ds-text active:bg-[color:var(--ds-chrome-active-bg)]"
              >
                <Menu className="h-6 w-6" strokeWidth={1.75} />
              </button>
            </div>
          </header>

          <header className="admin-desktop-only admin-desktop-header relative z-30 h-12 shrink-0 items-stretch border-b border-[color:var(--ds-chrome-border-faint)] bg-[color-mix(in_srgb,var(--color-ds-surface)_92%,transparent)] shadow-[inset_0_-1px_0_var(--ds-chrome-inset-line)] backdrop-blur-xl">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-5 lg:px-8">
              <div className="hidden h-6 w-px shrink-0 bg-[color:var(--ds-chrome-border)] xl:block" aria-hidden />
              <div className="flex min-w-0 flex-col justify-center leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">目前位置</span>
                <span className="truncate text-sm font-semibold text-ds-text">{adminNavLabelForPath(loc.pathname)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-l border-[color:var(--ds-chrome-border-faint)] px-4">
              <AdminLayoutToggle mode={layoutMode} onChange={setLayoutMode} />
              <Btn
                variant="secondary"
                className="!min-h-9 !px-3 !text-xs"
                type="button"
                onClick={() => {
                  clearAdminSession()
                  navigate('/login')
                }}
              >
                <LogOut className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.75} />
                登出
              </Btn>
              <Btn variant="secondary" className="!min-h-9 !px-3 !text-xs" to="/customer-preview">
                前台預覽
              </Btn>
            </div>
            <div
              className="hidden shrink-0 items-center border-l border-white/[0.06] px-5 text-[11px] font-semibold text-ds-text-secondary lg:flex"
              style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans TC", sans-serif' }}
              title={APP_NAME}
            >
              <span>{APP_BRAND_CORE}</span>
              <span className="text-ds-highlight/90"> {APP_BRAND_SHOP}</span>
            </div>
          </header>

          <main className="admin-main relative flex-1 overflow-y-auto">
            <PageLayout>
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </PageLayout>
          </main>

          <nav className="admin-mobile-bottom z-50 touch-manipulation border-t border-white/[0.1] bg-ds-surface/98 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="admin-mobile-bottom-grid grid grid-cols-5 gap-0.5 px-1">
              {mobilePrimary.map((item) => {
                const active = pathActive(loc.pathname, item.to, item.end)
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end === true}
                    className={cx(
                      'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold leading-tight transition duration-200 active:scale-[0.97]',
                      active
                        ? 'bg-ds-primary/14 text-ds-primary ring-1 ring-ds-primary/25'
                        : 'text-ds-text-muted active:bg-white/[0.05]',
                    )}
                  >
                    <Icon className={cx('h-6 w-6 shrink-0', active ? 'text-ds-primary' : 'text-ds-text-muted')} strokeWidth={1.75} />
                    <span className="max-w-[4.5rem] truncate">{item.short}</span>
                  </NavLink>
                )
              })}
              <button
                type="button"
                aria-label="更多選單"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(true)}
                className={cx(
                  'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold leading-tight transition duration-200 active:scale-[0.97]',
                  moreOpen ? 'bg-ds-primary/14 text-ds-primary ring-1 ring-ds-primary/25' : 'text-ds-text-muted active:bg-white/[0.05]',
                )}
              >
                <Menu className="h-6 w-6 shrink-0" strokeWidth={1.75} />
                <span className="max-w-[4.5rem] truncate">更多</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      <AppDrawer open={moreOpen} title="更多" onClose={() => setMoreOpen(false)} side="right">
        <div className="flex flex-col gap-1">
          <div className="mb-2 flex flex-col gap-2 px-3 pt-1">
            <Btn
              className="!min-h-11 w-full !text-sm"
              to="/lookup"
              onClick={() => setMoreOpen(false)}
            >
              <Store className="mr-1 inline h-4 w-4" strokeWidth={1.75} />
              Heina訂單自助查詢
            </Btn>
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="secondary"
                className="!min-h-11 flex-1 !text-sm"
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  clearAdminSession()
                  navigate('/login')
                }}
              >
                <LogOut className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.75} />
                登出
              </Btn>
              <Btn
                variant="secondary"
                className="!min-h-11 flex-1 !text-sm"
                to="/customer-preview"
                onClick={() => setMoreOpen(false)}
              >
                前台預覽
              </Btn>
            </div>
          </div>
          <div className="px-3 pb-0.5 pt-2 text-[11px] font-semibold tracking-wide text-ds-text-muted">主選單</div>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end === true}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-[3rem] items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold transition active:bg-white/[0.06]',
                    isActive || pathActive(loc.pathname, item.to, item.end)
                      ? 'bg-ds-primary/15 text-ds-primary'
                      : 'text-ds-text-secondary hover:bg-white/[0.05]',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </AppDrawer>

      <div className="admin-toast-stack pointer-events-none z-[60] flex flex-col items-stretch gap-2 px-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className={cx(
                'pointer-events-auto mx-auto flex max-w-md items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl',
                t.tone === 'err' && 'border-ds-danger/40 bg-ds-danger/95 text-white',
                t.tone === 'ok' && 'border-ds-success/40 bg-ds-success/95 text-white',
                t.tone !== 'err' && t.tone !== 'ok' && 'border-white/[0.1] bg-ds-card/95 text-ds-text',
              )}
            >
              <button type="button" className="min-h-11 min-w-11 shrink-0 text-white/75 hover:text-white" onClick={() => dismissToast(t.id)}>
                ✕
              </button>
              <span className="flex-1 py-2.5 pr-1 leading-snug">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  )
}
