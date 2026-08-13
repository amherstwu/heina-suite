import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PortalConfig } from '../../api/types'
import { usePortalBrowse } from './usePortalBrowse'
import { smoothScrollTo } from './portalUtils'
import { PortalLayoutBadge } from './PortalLayoutBadge'
import { PortalLayoutToggle } from './PortalLayoutToggle'
import type { PortalEffectiveLayout, PortalLayoutMode } from './portalLayoutPreference'

const NAV: { id: string; label: string }[] = [
  { id: 'order-search', label: '訂單查詢' },
  { id: 'latest-news', label: '最新公告' },
  { id: 'links-sns', label: '連結專區' },
  { id: 'about-us', label: '關於我們' },
  { id: 'faq', label: 'FAQ' },
  { id: 'support', label: '聯絡客服' },
]

export function PortalHeader({
  portal,
  layoutMode = 'auto',
  effectiveLayout = 'mobile',
  onLayoutModeChange,
}: {
  portal: PortalConfig
  layoutMode?: PortalLayoutMode
  effectiveLayout?: PortalEffectiveLayout
  onLayoutModeChange?: (m: PortalLayoutMode) => void
}) {
  const [open, setOpen] = useState(false)
  const brand = portal.brandName || 'Heina Shop'
  const { navigatePortalAnchor } = usePortalBrowse()

  function go(id: string) {
    setOpen(false)
    navigatePortalAnchor(id)
  }

  return (
    <header className="kp-header">
      <div className="kp-header-inner">
        <button type="button" className="kp-brand" onClick={() => { setOpen(false); smoothScrollTo('kp-hero') }} aria-label="回到頁首">
          <span className="kp-brand-mark" aria-hidden>
            H
          </span>
          <span className="kp-brand-text">{brand}</span>
          <span className="kp-brand-sub">顧客專區</span>
        </button>

        <nav className="kp-nav-desktop" aria-label="主選單">
          {NAV.map((n) => (
            <button key={n.id} type="button" className="kp-nav-link" onClick={() => go(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="kp-header-actions">
          <PortalLayoutBadge layout={effectiveLayout} />
          {onLayoutModeChange ? (
            <PortalLayoutToggle mode={layoutMode} onChange={onLayoutModeChange} />
          ) : null}
          {effectiveLayout === 'desktop' ? (
            <button type="button" className="kp-staff-desktop kp-staff-desktop--btn" onClick={() => go('kp-marketing')}>
              行銷首頁
            </button>
          ) : (
            <Link to="/home" className="kp-staff-desktop">
              行銷首頁
            </Link>
          )}
          <Link to="/shop" className="kp-staff-desktop">
            現貨商城
          </Link>
          <Link to="/login" className="kp-staff-desktop">
            團主後台
          </Link>
          <button type="button" className="kp-btn-cta kp-header-cta" onClick={() => go('order-search')}>
            查詢訂單
          </button>
          <button
            type="button"
            className="kp-menu-btn"
            aria-expanded={open}
            aria-controls="kp-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="kp-sr-only">選單</span>
            <span className={'kp-menu-ic' + (open ? ' kp-menu-open' : '')} aria-hidden />
          </button>
        </div>
      </div>

      {open ? (
        <div id="kp-mobile-nav" className="kp-nav-mobile">
          {onLayoutModeChange ? (
            <div className="kp-nav-mobile-layout">
              <span className="kp-nav-mobile-layout-label">版面</span>
              <PortalLayoutToggle mode={layoutMode} onChange={onLayoutModeChange} />
            </div>
          ) : null}
          {NAV.map((n) => (
            <button key={n.id} type="button" className="kp-nav-mobile-link" onClick={() => go(n.id)}>
              {n.label}
            </button>
          ))}
          <Link to="/home" className="kp-nav-mobile-staff" onClick={() => setOpen(false)}>
            行銷首頁
          </Link>
          <Link to="/shop" className="kp-nav-mobile-staff" onClick={() => setOpen(false)}>
            現貨商城
          </Link>
          <Link to="/login" className="kp-nav-mobile-staff" onClick={() => setOpen(false)}>
            團主後台
          </Link>
        </div>
      ) : null}
    </header>
  )
}
