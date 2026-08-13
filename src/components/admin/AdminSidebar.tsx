import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, Search, SearchCheck } from 'lucide-react'
import { ADMIN_NAV_ITEMS } from '../../shell/adminNavConfig'
import { AdminLayoutToggle } from '../../shell/AdminLayoutToggle'
import type { AdminLayoutMode } from '../../layout/adminLayoutPreference'
import { cx } from '../app/cx'

type AdminSidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
  pathname: string
  layoutMode: AdminLayoutMode
  onLayoutModeChange: (mode: AdminLayoutMode) => void
}

function pathActive(pathname: string, to: string, end?: boolean) {
  if (to === '/dashboard') return pathname === '/dashboard'
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * 後台唯一側欄：248px / 88px、收合鈕與捲動區分層，避免 overflow 裁切點擊。
 */
export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
  pathname,
  layoutMode,
  onLayoutModeChange,
}: AdminSidebarProps) {
  const width = collapsed ? 'w-[88px]' : 'w-[248px]'

  return (
    <aside
      className={cx(
        'admin-desktop-chrome relative z-[100] shrink-0 flex-col transition-[width] duration-300 ease-out',
        width,
      )}
    >
      <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden border-r border-[color:var(--ds-chrome-border)] bg-ds-surface/96 shadow-[inset_-1px_0_0_var(--ds-chrome-inset-line)] backdrop-blur-xl">
        {/* 品牌列（捲動區外） */}
        <div
          className={cx(
            'shrink-0 border-b border-[color:var(--ds-chrome-border-faint)] px-3 pb-3 pt-4',
            collapsed && 'px-2 pt-3',
          )}
        >
          <div className={cx('flex items-center gap-3', collapsed && 'flex-col justify-center gap-2')}>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-sm font-extrabold tracking-tight text-white shadow-[0_6px_20px_rgba(234,88,12,0.45)] ring-2 ring-white/15"
              aria-hidden
            >
              HM
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1 pr-2">
                <div className="truncate text-[15px] font-bold tracking-tight text-ds-text">HelpMeBuy</div>
                <div className="truncate text-[11px] font-medium text-ds-text-secondary">代購營運後台</div>
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[color:var(--ds-chrome-border)] bg-[color:var(--ds-chrome-hover-bg)] px-2.5 py-2 text-[11px] text-ds-text-secondary">
                <Search className="h-3.5 w-3.5 shrink-0 text-ds-text-muted" aria-hidden />
                <span className="truncate">各頁篩選即搜尋</span>
              </div>
              <AdminLayoutToggle mode={layoutMode} onChange={onLayoutModeChange} />
            </div>
          ) : null}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-2" aria-label="後台主選單">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = pathActive(pathname, item.to, item.end)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end === true}
                title={item.label}
                className={cx(
                  'group relative flex min-h-10 items-center rounded-xl text-[13px] font-semibold tracking-tight transition duration-200',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                  active
                    ? 'bg-[color:var(--ds-chrome-active-bg)] text-ds-text shadow-[inset_0_0_0_1px_var(--ds-chrome-border-faint)]'
                    : 'text-ds-text-secondary hover:bg-[color:var(--ds-chrome-hover-bg)] hover:text-ds-text',
                )}
              >
                {active && !collapsed ? (
                  <span
                    className="pointer-events-none absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-ds-primary shadow-[0_0_12px_color-mix(in_srgb,var(--color-ds-primary)_55%,transparent)]"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cx(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    active ? 'text-ds-primary' : 'text-ds-text-muted group-hover:text-ds-text-secondary',
                  )}
                  strokeWidth={1.85}
                />
                {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto shrink-0 space-y-1 border-t border-[color:var(--ds-chrome-border-faint)] p-2">
          <NavLink
            to="/customer-preview"
            title="前台預覽"
            className={({ isActive }) =>
              cx(
                'flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-semibold transition',
                collapsed ? 'justify-center px-0' : '',
                isActive || pathActive(pathname, '/customer-preview')
                  ? 'bg-ds-primary/14 text-ds-text ring-1 ring-ds-primary/25'
                  : 'text-ds-text-secondary hover:bg-[color:var(--ds-chrome-hover-bg)] hover:text-ds-text',
              )
            }
          >
            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.85} />
            {!collapsed ? <span>前台預覽</span> : null}
          </NavLink>
          <a
            href="#/lookup"
            target="_blank"
            rel="noreferrer"
            title="顧客查單（新分頁）"
            className={cx(
              'flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-ds-text-secondary transition hover:bg-[color:var(--ds-chrome-hover-bg)] hover:text-ds-text',
              collapsed ? 'justify-center px-0' : '',
            )}
          >
            <SearchCheck className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.85} />
            {!collapsed ? <span>顧客查單</span> : null}
          </a>
          {!collapsed ? (
            <p className="px-1.5 pt-1 text-[10px] leading-relaxed text-ds-text-muted">
              本機示範 · <code className="rounded bg-ds-card px-1 py-0.5 text-ds-text-secondary">localStorage</code>
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        data-admin-sidebar-collapse
        aria-label={collapsed ? '展開側欄' : '收合側欄'}
        title={collapsed ? '展開側欄' : '收合側欄'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleCollapsed()
        }}
        className="absolute right-[-14px] top-8 z-[999] flex h-8 w-8 min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border border-[color:var(--ds-chrome-border)] bg-ds-card text-ds-text shadow-[0_4px_16px_rgba(30,41,59,0.12)] transition hover:border-ds-primary/40 hover:bg-ds-surface-raised active:scale-95"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
      </button>
    </aside>
  )
}
