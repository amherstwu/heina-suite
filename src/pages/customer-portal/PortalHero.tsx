import type { PortalConfig } from '../../api/types'
import { HEINA_PORTAL_HERO_INTRO_DEFAULT, HEINA_PORTAL_HERO_SUBTITLE_DEFAULT } from '../../daigou/heinaPublicCopy'
import { usePortalBrowse } from './usePortalBrowse'
import { smoothScrollTo } from './portalUtils'

export function PortalHero({ portal }: { portal: PortalConfig }) {
  const { navigatePortalAnchor } = usePortalBrowse()
  const title = portal.title?.includes('顧客') || portal.title?.includes('查單') ? portal.title : '代購自助查單中心'
  const subtitle = portal.subtitle?.trim() || HEINA_PORTAL_HERO_SUBTITLE_DEFAULT
  const desc = portal.intro?.trim() || HEINA_PORTAL_HERO_INTRO_DEFAULT

  return (
    <section id="kp-hero" className="kp-hero">
      <div className="kp-hero-grid">
        <div className="kp-hero-copy">
          <p className="kp-eyebrow">Heina Shop · 日貨代購／動漫週邊</p>
          <h1 className="kp-hero-title">{title}</h1>
          <p className="kp-hero-sub">{subtitle}</p>
          <p className="kp-hero-desc">{desc}</p>
          <div className="kp-hero-cta-row">
            <button type="button" className="kp-btn-primary" onClick={() => smoothScrollTo('order-search')}>
              查詢我的訂單
            </button>
            <button type="button" className="kp-btn-secondary" onClick={() => navigatePortalAnchor('latest-news')}>
              查看最新公告
            </button>
          </div>
          <ul className="kp-trust-row" aria-label="服務特色">
            <li>日本直送／連線</li>
            <li>團購＋預購統一查</li>
            <li>會員累積禮遇</li>
            <li>付款進度透明</li>
            <li>官方 LINE 客服</li>
          </ul>
        </div>
        <div className="kp-hero-card" aria-hidden>
          <div className="kp-hero-card-inner">
            <p className="kp-hero-card-label">快速查單</p>
            <p className="kp-hero-card-hint">請輸入與留單相同的暱稱或訂單編號；若曾改名，請先私訊官方 LINE 協助更新。</p>
            <div className="kp-hero-fake-input">
              <span>例：LINE 顯示名、手機末三碼、訂單編號…</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
