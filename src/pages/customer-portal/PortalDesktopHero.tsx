import { Link } from 'react-router-dom'
import type { PortalConfig } from '../../api/types'
import {
  HEINA_OFFICIAL_LINE_URL,
  HEINA_PORTAL_HERO_INTRO_DEFAULT,
  HEINA_PORTAL_HERO_SUBTITLE_DEFAULT,
} from '../../daigou/heinaPublicCopy'
import { PORTAL_GALLERY_WALL, PORTAL_MARKETING_IMAGES } from './portalMarketingImages'
import { usePortalBrowse } from './usePortalBrowse'
import { smoothScrollTo } from './portalUtils'

const FEATURES = [
  { title: '團購＋預購', desc: '同一頁查兩邊訂單', tone: 'violet', thumb: PORTAL_MARKETING_IMAGES.gallery },
  { title: '付款進度', desc: '訂金／尾款一目了然', tone: 'sky', thumb: PORTAL_MARKETING_IMAGES.service },
  { title: '物流追蹤', desc: '出貨與抵台狀態', tone: 'mint', thumb: PORTAL_MARKETING_IMAGES.shipping },
  { title: '會員禮遇', desc: '等級與福利說明', tone: 'amber', thumb: PORTAL_MARKETING_IMAGES.goods },
] as const

const STEPS = ['輸入暱稱或訂單編號', '查看付款與物流', '有疑問聯絡 LINE'] as const

export function PortalDesktopHero({ portal }: { portal: PortalConfig }) {
  const { navigatePortalAnchor } = usePortalBrowse()
  const title = portal.title?.includes('顧客') || portal.title?.includes('查單') ? portal.title : '代購自助查單中心'
  const subtitle = portal.subtitle?.trim() || HEINA_PORTAL_HERO_SUBTITLE_DEFAULT
  const desc = portal.intro?.trim() || HEINA_PORTAL_HERO_INTRO_DEFAULT

  return (
    <section id="kp-hero" className="kp-desktop-hero" aria-labelledby="kp-desktop-hero-title">
      <div className="kp-desktop-hero-bg" aria-hidden />
      <div className="kp-desktop-hero-street" aria-hidden>
        <img src={PORTAL_MARKETING_IMAGES.street} alt="" />
        <div className="kp-desktop-hero-street-fade" />
      </div>
      <div className="kp-desktop-hero-inner">
        <div className="kp-desktop-hero-copy">
          <div className="kp-desktop-hero-badges">
            <span className="kp-desktop-pill kp-desktop-pill--brand">Heina Shop 顧客專區</span>
            <span className="kp-desktop-pill">日本代購 · 動漫週邊</span>
          </div>
          <h1 id="kp-desktop-hero-title" className="kp-desktop-hero-title">
            {title}
          </h1>
          <p className="kp-desktop-hero-sub">{subtitle}</p>
          <p className="kp-desktop-hero-desc">{desc}</p>
          <div className="kp-desktop-hero-actions">
            <button type="button" className="kp-desktop-btn kp-desktop-btn--primary" onClick={() => smoothScrollTo('order-search')}>
              立即查詢訂單
            </button>
            <button type="button" className="kp-desktop-btn kp-desktop-btn--ghost" onClick={() => navigatePortalAnchor('latest-news')}>
              最新公告
            </button>
            <Link to="/shop" className="kp-desktop-btn kp-desktop-btn--outline">
              現貨商城
            </Link>
          </div>
          <div className="kp-desktop-feature-grid" role="list">
            {FEATURES.map((f) => (
              <div key={f.title} className={'kp-desktop-feature kp-desktop-feature--' + f.tone} role="listitem">
                <img src={f.thumb} alt="" className="kp-desktop-feature-thumb" loading="lazy" decoding="async" />
                <div>
                  <p className="kp-desktop-feature-title">{f.title}</p>
                  <p className="kp-desktop-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="kp-desktop-hero-aside" aria-label="行銷與查單">
          <div className="kp-desktop-hero-visual">
            <img
              src={PORTAL_MARKETING_IMAGES.hero}
              alt="日本動漫週邊代購 — 連線喊單與現貨購物示意"
              className="kp-desktop-hero-img kp-desktop-hero-img--main"
              width={560}
              height={420}
              fetchPriority="high"
              decoding="async"
            />
            <div className="kp-desktop-hero-thumbs">
              {PORTAL_GALLERY_WALL.slice(1, 5).map((item) => (
                <img key={item.alt} src={item.src} alt={item.alt} className="kp-desktop-hero-thumb" loading="lazy" decoding="async" />
              ))}
            </div>
          </div>
          <div className="kp-desktop-panel-card">
            <div className="kp-desktop-panel-top">
              <img src={PORTAL_MARKETING_IMAGES.service} alt="" className="kp-desktop-panel-avatar" loading="lazy" />
              <div>
                <p className="kp-desktop-panel-kicker">3 步驟完成查單</p>
                <p className="kp-desktop-panel-sub">客服協助留單、改名與付款確認</p>
              </div>
            </div>
            <ol className="kp-desktop-steps">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <span className="kp-desktop-step-num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <div className="kp-desktop-panel-search">
              <span className="kp-desktop-panel-search-label">搜尋範例</span>
              <div className="kp-desktop-panel-fake-input">LINE 顯示名 · 手機末三碼 · 訂單編號</div>
              <button type="button" className="kp-desktop-panel-cta" onClick={() => smoothScrollTo('order-search')}>
                前往查詢區
              </button>
            </div>
            <a
              href={HEINA_OFFICIAL_LINE_URL}
              target="_blank"
              rel="noreferrer"
              className="kp-desktop-panel-line"
            >
              官方 LINE 客服
            </a>
          </div>
        </aside>
      </div>
    </section>
  )
}
