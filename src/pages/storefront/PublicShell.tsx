import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, MessageCircle, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { HEINA_OFFICIAL_LINE_URL } from '../../daigou/heinaPublicCopy'
import { APP_BRAND_SHOP } from '../../daigou/constants'
import { useStorefrontCart } from '../../storefront/cartStore'
import { PortalLayoutBadge } from '../customer-portal/PortalLayoutBadge'
import { usePortalLayoutMode } from '../customer-portal/portalLayoutPreference'
import { StorefrontLayoutToggle } from './StorefrontLayoutToggle'
import './storefront.css'
import './storefront.layout.css'

const nav = [
  { to: '/lookup', label: '顧客專區' },
  { to: '/shop', label: '現貨商城' },
  { to: '/home', label: '行銷首頁', end: true as const },
] as const

export function PublicShell() {
  const [open, setOpen] = useState(false)
  const count = useStorefrontCart((s) => s.itemCount())
  const { mode, setMode, layoutClass, effectiveLayout } = usePortalLayoutMode()
  const viewClass = layoutClass.replace('kp-view-', 'sf-view-')

  return (
    <div className={'sf-site ' + viewClass} data-layout={effectiveLayout}>
      <header className="sf-header">
        <div className="sf-container flex h-16 items-center justify-between gap-3">
          <Link to="/lookup" className="flex items-center gap-2 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
              H
            </span>
            <div>
              <div className="text-sm font-bold text-white">{APP_BRAND_SHOP}</div>
              <div className="hidden text-[10px] text-slate-400 sm:block">官方代購 · 現貨 · 查物流</div>
            </div>
          </Link>
          <nav className="sf-nav-desktop items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={'end' in n ? n.end : false}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                    isActive ? 'bg-indigo-600/25 text-indigo-200' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <PortalLayoutBadge layout={effectiveLayout} />
            <StorefrontLayoutToggle mode={mode} onChange={setMode} />
            <a
              href={HEINA_OFFICIAL_LINE_URL}
              target="_blank"
              rel="noreferrer"
              className="sf-btn-ghost sf-line-btn hidden !py-2 !text-xs lg:inline-flex"
            >
              <MessageCircle size={16} />
              LINE
            </a>
            <Link
              to="/cart"
              className="relative inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 no-underline"
            >
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">購物車</span>
              {count > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              className="sf-menu-mobile rounded-lg border border-white/10 p-2 text-slate-300"
              onClick={() => setOpen((v) => !v)}
              aria-label="選單"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open ? (
          <nav className="sf-nav-mobile-panel border-t border-white/10 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-slate-300 no-underline"
              >
                {n.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="mt-2 block px-3 py-2 text-xs text-slate-500">
              營運後台登入
            </Link>
          </nav>
        ) : null}
      </header>
      <Outlet />
      <footer className="sf-container mt-12 border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <p>{APP_BRAND_SHOP} · 代購不適用七天鑑賞期</p>
        <p className="mt-2">
          <Link to="/lookup" className="text-indigo-300 no-underline">
            查詢物流與抵達進度
          </Link>
          {' · '}
          <Link to="/login" className="text-slate-500 no-underline">
            後台
          </Link>
        </p>
      </footer>
    </div>
  )
}
