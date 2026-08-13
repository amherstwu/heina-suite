import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
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
import { APP_BRAND_SHOP } from '../../daigou/constants'
import { PORTAL_MARKETING_IMAGES } from '../customer-portal/portalMarketingImages'
import { usePortalLayoutMode } from '../customer-portal/portalLayoutPreference'
import { usePublicCatalog } from '../../storefront/usePublicCatalog'
import { PublicProductCard } from './PublicProductCard'
import './marketing-home.css'
import './marketing-home.layout.css'

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
    className: 'wide',
    image: PORTAL_MARKETING_IMAGES.shipping,
  },
  {
    icon: Package,
    tone: 'pink',
    title: '現貨商城',
    desc: '台灣已到貨品項，官網下單、賣貨便出貨，庫存與後台同步。',
    className: 'tall',
    image: PORTAL_MARKETING_IMAGES.goods,
  },
  {
    icon: Truck,
    tone: 'violet',
    title: '物流透明可查',
    desc: '輸入暱稱或訂單編號，即時看付款、出貨與抵台進度。',
    className: '',
    image: null as string | null,
  },
  {
    icon: Shield,
    tone: 'violet',
    title: '安心代購規則',
    desc: '首次交易身份確認、明確匯率公告，代購不適用七天鑑賞期。',
    className: 'wide',
    image: null as string | null,
  },
] as const

const STEPS = [
  { n: 1, title: '加入官方 LINE', desc: '完成留資料與身份確認' },
  { n: 2, title: '跟團喊單', desc: '連線記事本或預購留言' },
  { n: 3, title: '回國結帳', desc: '統一通知付款與運費' },
  { n: 4, title: '查單取貨', desc: '賣貨便或面交取貨' },
] as const

/** 手機版獨立行銷頁；電腦版併入 #/lookup */
export function PublicHomePage() {
  const { effectiveLayout } = usePortalLayoutMode()
  const { products, loading } = usePublicCatalog()
  const featured = products.slice(0, 4)

  useEffect(() => {
    if (effectiveLayout === 'desktop') return
    document.documentElement.scrollTop = 0
  }, [effectiveLayout])

  if (effectiveLayout === 'desktop') {
    return <Navigate to="/lookup" replace />
  }

  return (
    <div className="mkt-page">
      <section className="mkt-hero">
        <div className="mkt-hero-glow" aria-hidden />
        <div className="mkt-hero-inner">
          <div>
            <span className="mkt-badge">
              <Sparkles size={14} />
              日本動漫週邊代購
            </span>
            <h1>
              {APP_BRAND_SHOP}
              <span>連線現貨 · 預購 · 一站查物流</span>
            </h1>
            <p className="mkt-hero-lead">
              從連線喊單到回國出貨，Heina 把日本動漫、雜貨與零食代購變得清楚好跟。現貨可直購，跟團訂單隨時查進度。
            </p>
            <div className="mkt-cta-row">
              <Link to="/shop" className="mkt-btn-glow">
                <Gift size={18} />
                逛現貨商城
              </Link>
              <Link to="/lookup" className="mkt-btn-outline">
                <Search size={18} />
                查訂單／物流
              </Link>
              <a href={HEINA_OFFICIAL_LINE_URL} target="_blank" rel="noreferrer" className="mkt-btn-outline">
                <MessageCircle size={18} />
                官方 LINE
              </a>
            </div>
          </div>
          <div className="mkt-hero-visual">
            <img
              src={PORTAL_MARKETING_IMAGES.hero}
              alt="日本動漫週邊代購示意"
              className="mkt-hero-photo"
              loading="eager"
              decoding="async"
            />
            <div className="mkt-hero-card-stack">
              <div className="mkt-float-card a">
                <h3>本週連線預告</h3>
                <p>駿河屋 · 安美 · 零食專賣</p>
                <div className="mkt-float-stat">許願版開放中</div>
              </div>
              <div className="mkt-float-card b">
                <h3>現貨熱銷</h3>
                <p>咒術 · 我英 · 排球周邊</p>
                <div className="mkt-float-stat">{loading ? '…' : `${products.length} 件`}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mkt-stats">
        {STATS.map((s) => (
          <div key={s.label} className="mkt-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <section className="mkt-section">
        <div className="mkt-section-head">
          <h2>為什麼跟 Heina？</h2>
          <p>代購不只是買東西——是從喊單、付款到取貨都說清楚的一條龍服務。</p>
        </div>
        <div className="mkt-bento">
          {BENTO.map((b) => (
            <article key={b.title} className={`mkt-bento-card ${b.tone} ${b.className}`}>
              {b.image ? (
                <img src={b.image} alt="" className="mkt-bento-photo" loading="lazy" decoding="async" />
              ) : null}
              <div className="mkt-bento-icon">
                <b.icon size={22} />
              </div>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-promo-row">
          <Link to="/shop" className="mkt-promo hot">
            <span className="mkt-promo-tag">限時優惠</span>
            <h3>現貨滿千折百</h3>
            <p>官網購物車輸入優惠碼 HEINA100，現貨商品滿 NT$1,000 現折 $100。</p>
            <span className="mkt-promo-arrow">
              前往商城 <ArrowRight size={16} />
            </span>
          </Link>
          <Link to="/lookup" className="mkt-promo cool">
            <span className="mkt-promo-tag">跟團必備</span>
            <h3>訂單／物流查詢</h3>
            <p>團購與預購一次查，付款狀態、抵台進度與物流號碼一目了然。</p>
            <span className="mkt-promo-arrow">
              立即查詢 <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-section-head">
          <h2>四步驟輕鬆跟團</h2>
          <p>第一次交易請先私訊官方 LINE，我們會協助完成身份確認。</p>
        </div>
        <div className="mkt-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="mkt-step">
              <div className="mkt-step-num">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-products">
        <div className="mkt-section-head">
          <h2>現貨精選</h2>
          <p>已到台現貨，下單後請至官方 LINE 確認付款與出貨。</p>
        </div>
        {loading ? (
          <p className="text-center text-slate-500">載入商品中…</p>
        ) : featured.length === 0 ? (
          <p className="text-center text-slate-500">現貨補貨中，歡迎先至顧客專區看公告或私訊 LINE。</p>
        ) : (
          <div className="sf-grid">
            {featured.map((p) => (
              <PublicProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        {featured.length > 0 ? (
          <div className="mkt-cta-row mkt-cta-row-center" style={{ marginTop: '2rem' }}>
            <Link to="/shop" className="mkt-btn-outline">
              查看全部現貨 <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mkt-cta-band">
        <h2>準備好了嗎？</h2>
        <p>無論是搶現貨、跟連線，或查詢手上的訂單，Heina Shop 都在這裡。</p>
        <div className="mkt-cta-row">
          <Link to="/lookup" className="mkt-btn-glow">
            進入顧客專區
          </Link>
          <a href={HEINA_OFFICIAL_LINE_URL} target="_blank" rel="noreferrer" className="mkt-btn-outline">
            聯絡官方 LINE
          </a>
        </div>
      </section>
    </div>
  )
}
