import { useEffect, useState, type ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import type { PortalConfig } from '../../api/types'
import { faqFor, processStepsFor } from './staticContent'
import { guideInfographicsFor } from './mergePortal'
import { HeinaGuideInfographics } from './HeinaGuideInfographics'
import { teachCardsFor } from './portalTeachCards'

type OpenId = 'guide' | 'faq' | 'search-tips' | 'thread-usage' | 'chat-reminders' | 'order-howto'

function LineArt({ children }: { children: ReactNode }) {
  return (
    <svg className="lk-teach-illu" viewBox="0 0 72 64" aria-hidden>
      {children}
    </svg>
  )
}

const ink = '#7dae62'
const blush = '#f4a0b4'

const ILLUSTRATIONS: Record<OpenId, ReactNode> = {
  guide: (
    <LineArt>
      <circle cx="30" cy="26" r="14" fill="#fff" stroke={ink} strokeWidth="3" />
      <circle cx="30" cy="26" r="7" fill="none" stroke="#d7efc4" strokeWidth="2" />
      <path d="M40 36l14 16" stroke={blush} strokeWidth="6" strokeLinecap="round" />
    </LineArt>
  ),
  'search-tips': (
    <LineArt>
      <path d="M24 22h26l-3 28H27z" fill="#fff8f4" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 22v-5a7 7 0 0 1 14 0v5" fill="none" stroke={ink} strokeWidth="3" />
    </LineArt>
  ),
  'thread-usage': (
    <LineArt>
      <ellipse cx="28" cy="28" rx="16" ry="12" fill="#fff" stroke={ink} strokeWidth="3" />
      <ellipse cx="46" cy="38" rx="14" ry="11" fill="#fff5f8" stroke={ink} strokeWidth="3" />
      <circle cx="22" cy="28" r="2" fill={blush} />
      <circle cx="28" cy="28" r="2" fill={blush} />
      <circle cx="34" cy="28" r="2" fill={blush} />
    </LineArt>
  ),
  'chat-reminders': (
    <LineArt>
      <rect x="14" y="14" width="44" height="34" rx="7" fill="#fff" stroke={ink} strokeWidth="3" />
      <path d="M14 26h44" stroke={ink} strokeWidth="2.5" />
      <circle cx="22" cy="20" r="2" fill={blush} />
      <circle cx="29" cy="20" r="2" fill="#d7efc4" />
      <circle cx="36" cy="20" r="2" fill="#d7efc4" />
      <rect x="22" y="32" width="20" height="8" rx="2" fill="#fde7ee" />
    </LineArt>
  ),
  'order-howto': (
    <LineArt>
      <path d="M16 16h8l5 24h26" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 22h26l-3 16H33z" fill="#fff" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="36" cy="48" r="3.2" fill={blush} />
      <circle cx="50" cy="48" r="3.2" fill={blush} />
    </LineArt>
  ),
  faq: (
    <LineArt>
      <path
        d="M18 16h30a10 10 0 0 1 10 10v10a10 10 0 0 1-10 10H34l-8 8v-8H18a10 10 0 0 1-10-10V26a10 10 0 0 1 10-10z"
        fill="#fff"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="20" fontWeight="700" fill={blush}>
        ?
      </text>
    </LineArt>
  ),
}

const CARDS: { id: OpenId; title: string; hint: string }[] = [
  { id: 'guide', title: '代購流程', hint: '流程圖與文字摘要' },
  { id: 'search-tips', title: '搜尋商品小撇步', hint: '找商品的方式' },
  { id: 'thread-usage', title: '討論串使用', hint: '討論串怎麼用' },
  { id: 'chat-reminders', title: '聊天室小提醒', hint: '聊天室注意事項' },
  { id: 'order-howto', title: '喊單操作', hint: '怎麼留言喊單' },
  { id: 'faq', title: '常見問題', hint: '查單、付款與出貨' },
]

export function LookupTeachSection({ portal }: { portal: PortalConfig }) {
  const [open, setOpen] = useState<OpenId | null>(null)
  const steps = processStepsFor(portal)
  const faq = faqFor(portal).slice(0, 8)
  const imageCards = teachCardsFor(portal)
  const current = CARDS.find((c) => c.id === open)
  const imageCard = imageCards.find((c) => c.id === open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <section className="lk-site-block lk-teach" id="guide" aria-labelledby="lk-teach-title">
      <div className="lk-teach-head">
        <h2 id="lk-teach-title" className="lk-teach-banner">
          <BookOpen className="lk-teach-banner-icon" aria-hidden />
          使用教學
        </h2>
        <p className="lk-teach-lead">點擊卡片即可展開詳細說明與步驟</p>
      </div>
      <div className="lk-teach-grid">
        {CARDS.map((card, i) => {
          return (
          <button
            key={card.id}
            type="button"
            id={card.id === 'faq' ? 'faq' : undefined}
            className={`lk-teach-card${card.id === 'search-tips' ? ' lk-teach-card--search' : ''}${card.id === 'guide' ? ' lk-teach-card--guide' : ''}`}
            onClick={() => setOpen(card.id)}
          >
            <span className="lk-teach-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="lk-teach-spark" aria-hidden />
            <span className="lk-teach-body">
              <span className="lk-teach-icon" aria-hidden>
                {ILLUSTRATIONS[card.id]}
              </span>
              <span className="lk-teach-copy">
                <span className="lk-teach-title">{card.title}</span>
                <span className="lk-teach-hint">{card.hint}</span>
                <span className="lk-teach-go">查看教學 ›</span>
              </span>
            </span>
          </button>
          )
        })}
      </div>

      {open && current ? (
        <div className="lk-teach-backdrop" onClick={() => setOpen(null)}>
          <div
            className="lk-teach-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lk-teach-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lk-teach-dialog-head">
              <h3 id="lk-teach-dialog-title">{current.title}</h3>
              <button type="button" className="lk-teach-close" onClick={() => setOpen(null)} aria-label="關閉">
                ×
              </button>
            </div>
            <div className="lk-teach-dialog-body">
              {open === 'guide' ? (
                <>
                  <p className="lk-site-block-desc">官方流程圖：購物、交易規則與匯率計算（點圖可放大）</p>
                  <HeinaGuideInfographics variant="lookup" items={guideInfographicsFor(portal)} />
                  <div className="lk-site-block-head lk-site-block-head--sub">
                    <h3 className="lk-site-block-subtitle">文字摘要</h3>
                    <p className="lk-site-block-desc">從下單到取貨的步驟說明</p>
                  </div>
                  <ol className="lk-steps">
                    {steps.map((s) => (
                      <li key={s.n} className="lk-step">
                        <span className="lk-step-num">{s.n}</span>
                        <div>
                          <p className="lk-step-title">{s.title}</p>
                          <p className="lk-step-detail">{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
              {open === 'faq' ? (
                <div className="lk-faq-list">
                  {faq.map((item) => (
                    <details key={item.id || item.q} className="lk-faq-item">
                      <summary>{item.q}</summary>
                      <p>{item.a}</p>
                    </details>
                  ))}
                </div>
              ) : null}
              {imageCard ? (
                imageCard.images?.length ? (
                  <div className="lk-teach-images">
                    {imageCard.images.map((img) => (
                      <img key={img.id} src={img.src} alt={img.alt || imageCard.title || ''} />
                    ))}
                  </div>
                ) : (
                  <p className="lk-site-block-desc">這張教學卡還沒有圖片。</p>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
