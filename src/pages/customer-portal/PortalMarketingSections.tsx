import { useCallback } from 'react'
import type { PortalConfig } from '../../api/types'
import {
  announcementsFor,
  buildSocialRows,
  FAQ_ITEMS,
  PROCESS_STEPS,
} from './staticContent'
import { PortalMembershipSection } from './PortalMembershipSection'
import { HeinaGuideInfographics } from './HeinaGuideInfographics'
import './heinaGuideInfographics.css'
import {
  parseBracketBlocks,
  resolvePortalLineHref,
  splitAboutIntroAndRest,
} from './parsePortalOfficialInfo'
import { usePortalBrowse } from './usePortalBrowse'
import type { PortalBrowseTab } from './portalUtils'
import {
  IconBag,
  IconBox,
  IconExternal,
  IconInsta,
  IconLine,
  IconSearch,
  IconThreads,
  IconUsers,
} from './PortalIcons'

type BrowseTab = PortalBrowseTab

type QuickIconId = 'search' | 'news' | 'link' | 'support' | 'bag' | 'box' | 'faq' | 'about'

const QUICK: { title: string; desc: string; target: string; icon: QuickIconId }[] = [
  { title: '訂單查詢', desc: '快速查看付款與出貨狀態', target: 'order-search', icon: 'search' },
  { title: '會員禮遇', desc: '等級與福利說明', target: 'membership', icon: 'about' },
  { title: '最新公告', desc: '出貨與活動更新', target: 'latest-news', icon: 'news' },
  { title: '連結專區', desc: '社群與賣場', target: 'links-sns', icon: 'link' },
  { title: '聯絡客服', desc: '官方 LINE 與問題回報', target: 'support', icon: 'support' },
  { title: '預購賣場', desc: '預購商品', target: 'links-sns', icon: 'bag' },
  { title: '現貨賣場', desc: '現貨商品', target: 'links-sns', icon: 'box' },
  { title: '常見問題', desc: '付款與出貨 FAQ', target: 'faq', icon: 'faq' },
  { title: '關於我們', desc: '規則與品牌介紹', target: 'about-us', icon: 'about' },
]

const TABS: { id: BrowseTab; label: string; icon: QuickIconId }[] = [
  { id: 'news', label: '最新公告', icon: 'news' },
  { id: 'member', label: '會員禮遇', icon: 'about' },
  { id: 'about', label: '關於我們', icon: 'about' },
  { id: 'links', label: '連結專區', icon: 'link' },
  { id: 'guide', label: '購物指南', icon: 'bag' },
  { id: 'faq', label: '常見問題', icon: 'faq' },
  { id: 'support', label: '聯絡客服', icon: 'support' },
]

function QuickIcon({ kind }: { kind: QuickIconId }) {
  const c = 'kp-qa-ic'
  switch (kind) {
    case 'search':
      return <IconSearch className={c} />
    case 'news':
      return <IconBag className={c} />
    case 'link':
      return <IconExternal className={c} />
    case 'support':
      return <IconLine className={c} />
    case 'bag':
      return <IconBag className={c} />
    case 'box':
      return <IconBox className={c} />
    case 'faq':
      return <IconThreads className={c} />
    default:
      return <IconUsers className={c} />
  }
}

function TabIcon({ kind }: { kind: QuickIconId }) {
  return <QuickIcon kind={kind} />
}

function SocialIcon({ kind }: { kind: 'line' | 'bag' | 'insta' | 'threads' | 'box' | 'users' }) {
  const c = 'kp-sns-ic'
  switch (kind) {
    case 'line':
      return <IconLine className={c} />
    case 'insta':
      return <IconInsta className={c} />
    case 'threads':
      return <IconThreads className={c} />
    case 'bag':
      return <IconBag className={c} />
    case 'box':
      return <IconBox className={c} />
    default:
      return <IconUsers className={c} />
  }
}

export function PortalMarketingSections({ portal }: { portal: PortalConfig }) {
  const news = announcementsFor(portal)
  const social = buildSocialRows(portal)
  const { browseTab: tab, openBrowseTab, navigatePortalAnchor } = usePortalBrowse()

  const combinedForLine = [portal.officialInfo || '', portal.about || ''].filter(Boolean).join('\n\n')
  const lineHref = resolvePortalLineHref(portal.lineFriendUrl, portal.serviceUrl, combinedForLine)
  const officialBlocksRaw = parseBracketBlocks(portal.officialInfo || '')
  const officialBlocks = officialBlocksRaw.filter(
    (b) => !(b.title.includes('官方') && b.title.includes('LINE') && !b.body.trim()),
  )
  const { intro: aboutIntro, rest: aboutRest } = splitAboutIntroAndRest(portal.about || '')
  const aboutBlocks = parseBracketBlocks(aboutRest)

  const goQuick = useCallback(
    (target: string) => {
      navigatePortalAnchor(target)
    },
    [navigatePortalAnchor],
  )

  const selectTab = (id: BrowseTab) => {
    openBrowseTab(id)
  }

  return (
    <>
      <section className="kp-section kp-qa-section">
        <h2 className="kp-h2">快捷功能</h2>
        <p className="kp-qa-hint">點選後會捲動至下方分區；訂單查詢固定在上方的搜尋區。</p>
        <div className="kp-qa-grid">
          {QUICK.map((q) => (
            <button
              key={q.title}
              type="button"
              className="kp-qa-card"
              aria-label={q.desc}
              onClick={() => goQuick(q.target)}
            >
              <QuickIcon kind={q.icon} />
              <span className="kp-qa-title">{q.title}</span>
            </button>
          ))}
        </div>
      </section>

      <div id="kp-browse" className="kp-browse">
        <div className="kp-browse-head">
          <h2 className="kp-h2 kp-browse-title">瀏覽分區</h2>
          <p className="kp-browse-sub">點選分頁只顯示該區內容，減少單頁資訊量。</p>
        </div>

        <div className="kp-tab-strip" role="tablist" aria-label="顧客專區分頁">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={'kp-tab-btn' + (tab === t.id ? ' is-active' : '')}
              onClick={() => selectTab(t.id)}
            >
              <span className="kp-tab-ic-wrap" aria-hidden>
                <TabIcon kind={t.icon} />
              </span>
              <span className="kp-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="kp-tab-panels">
          <section
            id="latest-news"
            role="tabpanel"
            hidden={tab !== 'news'}
            className={'kp-tab-panel kp-tab-panel-news' + (tab === 'news' ? ' is-open' : '')}
          >
            <div className="kp-news-inner">
              <div className="kp-section-head kp-news-head">
                <h3 className="kp-h3-tab">最新公告 / NEWS</h3>
              </div>
              <ul className="kp-news-list">
                {news.slice(0, 8).map((n) => (
                  <li key={n.id} className="kp-news-item">
                    <div className="kp-news-top">
                      <span className={'kp-news-cat kp-cat-' + (n.category || '系統')}>{n.category}</span>
                      <time className="kp-news-date" dateTime={n.date}>
                        {n.date}
                      </time>
                    </div>
                    <p className="kp-news-title">{n.title}</p>
                    {n.description ? <p className="kp-news-desc">{n.description}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div role="tabpanel" hidden={tab !== 'member'} className={'kp-tab-panel' + (tab === 'member' ? ' is-open' : '')}>
            <PortalMembershipSection portal={portal} />
          </div>

          <section
            id="about-us"
            role="tabpanel"
            hidden={tab !== 'about'}
            className={'kp-tab-panel kp-tab-panel-about' + (tab === 'about' ? ' is-open' : '')}
          >
            <div className="kp-about-shell">
              <div className="kp-about-hero">
                <h3 className="kp-about-hero-title">關於 Heina Shop</h3>
                <p className="kp-about-hero-sub">代購規則、首次交易與匯率說明集中於此；官方 LINE 請使用下方按鈕，不在此暴露完整網址。</p>
                <a href={lineHref} className="kp-about-line-btn" target="_blank" rel="noreferrer">
                  <IconLine className="kp-about-line-btn-ic" aria-hidden />
                  開啟官方 LINE
                </a>
                <p className="kp-about-hero-micro">若按鈕無法開啟，請至手機的 LINE 搜尋官方帳號或從社群置頂連結進入。</p>
              </div>

              {aboutIntro ? (
                <div className="kp-about-intro-card">
                  <p className="kp-about-intro-text">{aboutIntro}</p>
                </div>
              ) : null}

              <div className="kp-about-acc-list">
                {officialBlocks.map((b) => (
                  <details key={b.id} className="kp-about-details">
                    <summary className="kp-about-summary">{b.title}</summary>
                    {b.body ? (
                      <div className="kp-about-body">
                        {b.body.split('\n').map((line, i) => (
                          <p key={i} className="kp-about-body-line">
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="kp-about-body-muted">此段落無額外文字；請使用上方「開啟官方 LINE」按鈕。</p>
                    )}
                  </details>
                ))}
                {aboutBlocks.map((b) => (
                  <details key={`a-${b.id}`} className="kp-about-details">
                    <summary className="kp-about-summary">{b.title}</summary>
                    {b.body ? (
                      <div className="kp-about-body">
                        {b.body.split('\n').map((line, i) => (
                          <p key={i} className="kp-about-body-line">
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </details>
                ))}
              </div>

              <div className="kp-about-chip-grid">
                {[
                  { t: '首購與訂金', d: '首次請先私訊官方 LINE；連線高額訂金成數依公告。' },
                  { t: '會員與隱私', d: '升等依後台認列；查詢頁不顯示累積金額。' },
                  { t: '取貨與免責', d: '賣貨便／面交；代購不適用鑑賞期，以公告為準。' },
                ].map((x) => (
                  <div key={x.t} className="kp-about-chip">
                    <h4>{x.t}</h4>
                    <p>{x.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="links-sns"
            role="tabpanel"
            hidden={tab !== 'links'}
            className={'kp-tab-panel' + (tab === 'links' ? ' is-open' : '')}
          >
            <h3 className="kp-h3-tab kp-sns-tab-title">連結專區 / SNS</h3>
            <ul className="kp-sns-list">
              {social.map((row) => {
                const disabled = row.href === '#'
                return (
                  <li key={row.id}>
                    <a
                      href={row.href}
                      className={'kp-sns-row' + (disabled ? ' kp-sns-row-disabled' : '')}
                      {...(disabled ? {} : { target: '_blank', rel: 'noreferrer' })}
                      aria-disabled={disabled}
                      onClick={disabled ? (e) => e.preventDefault() : undefined}
                    >
                      <span className="kp-sns-icon-wrap">
                        <SocialIcon kind={row.icon} />
                      </span>
                      <span className="kp-sns-text">
                        <span className="kp-sns-label">{row.label}</span>
                        <span className="kp-sns-desc">{row.description}</span>
                      </span>
                      <IconExternal className="kp-sns-go" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>

          <section role="tabpanel" hidden={tab !== 'guide'} className={'kp-tab-panel' + (tab === 'guide' ? ' is-open' : '')}>
            <h3 className="kp-h3-tab">代購流程說明</h3>
            <p className="kp-support-text" style={{ marginBottom: '0.75rem' }}>
              以下為官方流程圖（購物、交易規則、匯率）。點圖可放大閱讀。
            </p>
            <HeinaGuideInfographics variant="portal" />
            <h3 className="kp-h3-tab">購買流程摘要</h3>
            <ol className="kp-process-list">
              {PROCESS_STEPS.map((s) => (
                <li key={s.n} className="kp-process-step">
                  <span className="kp-process-num">{s.n}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="faq" role="tabpanel" hidden={tab !== 'faq'} className={'kp-tab-panel' + (tab === 'faq' ? ' is-open' : '')}>
            <h3 className="kp-h3-tab">常見問題 FAQ</h3>
            <div className="kp-faq-list">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="kp-faq-item kp-faq-details">
                  <summary className="kp-faq-q">{item.q}</summary>
                  <p className="kp-faq-a">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section
            id="support"
            role="tabpanel"
            hidden={tab !== 'support'}
            className={'kp-tab-panel kp-support-panel' + (tab === 'support' ? ' is-open' : '')}
          >
            <h3 className="kp-h3-tab">有任何問題，都歡迎聯絡我們</h3>
            <p className="kp-support-text">
              首次交易、訂金成數、改名、查無訂單、付款對帳或運送問題，請透過官方 LINE 聯絡；聯絡時請備妥社群暱稱與截圖以利處理。
            </p>
            <div className="kp-support-actions">
              <a href={lineHref} className="kp-btn-primary" target="_blank" rel="noreferrer">
                加官方 LINE
              </a>
              <button type="button" className="kp-btn-secondary" onClick={() => selectTab('faq')}>
                查看常見問題
              </button>
            </div>
            <p className="kp-support-hint">聯絡時請提供：社群暱稱、訂單商品、付款截圖或問題描述。</p>
          </section>
        </div>
      </div>
    </>
  )
}
