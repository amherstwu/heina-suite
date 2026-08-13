import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Gift,
  MessageCircle,
  Package,
  Plane,
  Search,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react'
import { HEINA_OFFICIAL_LINE_URL } from '../../daigou/heinaPublicCopy'
import { usePublicCatalog } from '../../storefront/usePublicCatalog'
import { PublicProductCard } from '../storefront/PublicProductCard'
import { PORTAL_GALLERY_WALL, PORTAL_MARKETING_IMAGES } from './portalMarketingImages'
import { smoothScrollTo } from './portalUtils'
import './PortalMarketingHome.desktop.css'

const STATS = [
  { value: '8,000+', label: '累積跟團' },
  { value: '0.29', label: '常態匯率' },
  { value: '<24h', label: '客服回覆' },
  { value: '72%', label: '回購率' },
] as const

const BENTO = [
  {
    icon: Plane,
    tone: 'teal',
    title: '日本連線 · 預購跟團',
    desc: '駿河屋、安美與當期行程同步更新，許願版＋記事本喊單，回國後統一通知結帳。',
    image: PORTAL_MARKETING_IMAGES.shipping,
    wide: true,
  },
  {
    icon: Package,
    tone: 'pink',
    title: '現貨商城',
    desc: '台灣已到貨品項，官網下單、賣貨便出貨，庫存與後台同步。',
    image: PORTAL_MARKETING_IMAGES.goods,
    tall: true,
  },
  {
    icon: Truck,
    tone: 'violet',
    title: '物流透明可查',
    desc: '輸入暱稱或訂單編號，即時看付款、出貨與抵台進度。',
    image: PORTAL_MARKETING_IMAGES.service,
    wide: false,
  },
  {
    icon: Shield,
    tone: 'violet',
    title: '安心代購規則',
    desc: '首次交易身份確認、明確匯率公告，代購不適用七天鑑賞期。',
    image: PORTAL_MARKETING_IMAGES.street,
    wide: true,
  },
] as const

const STEP_VISUALS = [
  PORTAL_MARKETING_IMAGES.service,
  PORTAL_MARKETING_IMAGES.gallery,
  PORTAL_MARKETING_IMAGES.shipping,
  PORTAL_MARKETING_IMAGES.goods,
] as const

const STEPS = [
  { n: 1, title: '加入官方 LINE', desc: '完成留資料與身份確認' },
  { n: 2, title: '跟團喊單', desc: '連線記事本或預購留言' },
  { n: 3, title: '回國結帳', desc: '統一通知付款與運費' },
  { n: 4, title: '查單取貨', desc: '賣貨便或面交取貨' },
] as const

/** 網站版顧客專區內嵌行銷區（與 #/home 內容一致，含 AI 插圖） */
export function PortalMarketingHomeSections() {
  const { products, loading } = usePublicCatalog()
  const featured = products.slice(0, 4)

  return (
    <div id="kp-marketing" className="kp-mkt">
      <section className="kp-mkt-gallery-band" aria-label="代購實景">
        <div className="kp-mkt-gallery-hero">
          <img src={PORTAL_MARKETING_IMAGES.gallery} alt="動漫周邊代購熱門品項" loading="lazy" decoding="async" />
          <div className="kp-mkt-gallery-hero-cap">
            <p className="kp-mkt-gallery-tag">Heina 代購實景</p>
            <p className="kp-mkt-gallery-title">連線開團 · 現貨到台 · 開箱出貨</p>
          </div>
        </div>
        <div className="kp-mkt-gallery-grid">
          {PORTAL_GALLERY_WALL.map((item, i) => (
            <figure key={item.alt} className={'kp-mkt-gallery-tile kp-mkt-gallery-tile--' + (i % 6)}>
              <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
              <figcaption>{item.alt}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="kp-mkt-stats" aria-label="服務數據">
        {STATS.map((s, i) => (
          <div key={s.label} className="kp-mkt-stat">
            <img src={PORTAL_GALLERY_WALL[i % PORTAL_GALLERY_WALL.length].src} alt="" className="kp-mkt-stat-bg" />
            <div className="kp-mkt-stat-inner">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="kp-mkt-section">
        <div className="kp-mkt-head">
          <span className="kp-mkt-kicker">
            <Sparkles size={14} aria-hidden />
            為什麼跟 Heina？
          </span>
          <h2 className="kp-mkt-h2">日本動漫代購，一頁說清楚</h2>
          <p className="kp-mkt-lead">從連線喊單到回國出貨，代購不只是買東西——是付款與物流都透明的完整服務。</p>
        </div>
        <div className="kp-mkt-bento">
          {BENTO.map((b) => (
            <article
              key={b.title}
              className={
                'kp-mkt-bento-card kp-mkt-bento-card--' +
                b.tone +
                ('wide' in b && b.wide ? ' kp-mkt-bento-card--wide' : '') +
                ('tall' in b && b.tall ? ' kp-mkt-bento-card--tall' : '')
              }
            >
              {b.image ? (
                <div className="kp-mkt-bento-img-wrap">
                  <img src={b.image} alt="" className="kp-mkt-bento-img" loading="lazy" decoding="async" />
                </div>
              ) : null}
              <div className="kp-mkt-bento-body">
                <div className="kp-mkt-bento-icon">
                  <b.icon size={20} aria-hidden />
                </div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="kp-mkt-section">
        <div className="kp-mkt-promo-row">
          <Link to="/shop" className="kp-mkt-promo kp-mkt-promo--hot">
            <img src={PORTAL_MARKETING_IMAGES.goods} alt="" className="kp-mkt-promo-bg" />
            <div className="kp-mkt-promo-content">
              <span className="kp-mkt-promo-tag">限時優惠</span>
              <h3>現貨滿千折百</h3>
              <p>購物車輸入 HEINA100，現貨滿 NT$1,000 現折 $100。</p>
              <span className="kp-mkt-promo-link">
                前往商城 <ArrowRight size={16} />
              </span>
            </div>
          </Link>
          <button type="button" className="kp-mkt-promo kp-mkt-promo--cool" onClick={() => smoothScrollTo('order-search')}>
            <img src={PORTAL_MARKETING_IMAGES.shipping} alt="" className="kp-mkt-promo-bg" />
            <div className="kp-mkt-promo-content">
              <span className="kp-mkt-promo-tag">跟團必備</span>
              <h3>訂單／物流查詢</h3>
              <p>團購與預購一次查，付款與抵台進度一目了然。</p>
              <span className="kp-mkt-promo-link">
                立即查詢 <ArrowRight size={16} />
              </span>
            </div>
          </button>
        </div>
      </section>

      <section className="kp-mkt-section">
        <div className="kp-mkt-head">
          <h2 className="kp-mkt-h2">四步驟輕鬆跟團</h2>
          <p className="kp-mkt-lead">第一次交易請先私訊官方 LINE，協助完成身份確認。</p>
        </div>
        <div className="kp-mkt-steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className="kp-mkt-step">
              <img src={STEP_VISUALS[i]} alt="" className="kp-mkt-step-img" loading="lazy" />
              <div className="kp-mkt-step-num">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="kp-mkt-section kp-mkt-products">
        <div className="kp-mkt-head">
          <h2 className="kp-mkt-h2">現貨精選</h2>
          <p className="kp-mkt-lead">已到台現貨，下單後請至官方 LINE 確認付款與出貨。</p>
        </div>
        {loading ? (
          <p className="kp-mkt-muted">載入商品中…</p>
        ) : featured.length === 0 ? (
          <p className="kp-mkt-muted">現貨補貨中，歡迎先看下方公告或私訊 LINE。</p>
        ) : (
          <div className="kp-mkt-product-grid">
            {featured.map((p) => (
              <PublicProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        {featured.length > 0 ? (
          <div className="kp-mkt-actions">
            <Link to="/shop" className="kp-desktop-btn kp-desktop-btn--outline">
              查看全部現貨 <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}
      </section>

      <section className="kp-mkt-cta-band">
        <img src={PORTAL_MARKETING_IMAGES.street} alt="" className="kp-mkt-cta-bg" />
        <div className="kp-mkt-cta-copy">
          <h2>準備好了嗎？</h2>
          <p>搶現貨、跟連線，或查詢手上的訂單，都在這一頁完成。</p>
        </div>
        <div className="kp-mkt-cta-actions">
          <button type="button" className="kp-desktop-btn kp-desktop-btn--primary" onClick={() => smoothScrollTo('order-search')}>
            <Search size={18} />
            查詢訂單
          </button>
          <Link to="/shop" className="kp-desktop-btn kp-desktop-btn--ghost">
            <Gift size={18} />
            逛現貨
          </Link>
          <a href={HEINA_OFFICIAL_LINE_URL} target="_blank" rel="noreferrer" className="kp-desktop-btn kp-desktop-btn--outline">
            <MessageCircle size={18} />
            官方 LINE
          </a>
        </div>
      </section>
    </div>
  )
}
