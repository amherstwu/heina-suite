import type { PortalConfig } from '../../api/types'
import {
  announcementsFor,
  faqFor,
  FOOTER_STATS,
  processStepsFor,
} from './staticContent'
import { guideInfographicsFor } from './mergePortal'
import { CustomerLookupOpenGroupsSection } from './CustomerLookupOpenGroupsSection'
import { HeinaGuideInfographics } from './HeinaGuideInfographics'
import './heinaGuideInfographics.css'

type Props = {
  portal: PortalConfig
  showInfo: boolean
}

export function CustomerLookupSiteSections({ portal, showInfo }: Props) {
  if (!showInfo) return null

  const announcements = announcementsFor(portal).slice(0, 4)
  const lineHref = portal.lineFriendUrl || portal.serviceUrl || ''
  const faq = faqFor(portal).slice(0, 8)
  const steps = processStepsFor(portal)

  return (
    <div className="lk-site-sections">
      <section className="lk-site-block" id="news" aria-labelledby="lk-news-title">
        <div className="lk-site-block-head">
          <h2 id="lk-news-title" className="lk-site-block-title">
            最新公告
          </h2>
          <p className="lk-site-block-desc">出貨、活動與系統相關消息</p>
        </div>
        <ul className="lk-news-list">
          {announcements.map((a) => (
            <li key={a.id} className="lk-news-item">
              <div className="lk-news-meta">
                <span className="lk-news-date">{a.date}</span>
                {a.category ? <span className="lk-news-tag">{a.category}</span> : null}
              </div>
              <p className="lk-news-title">{a.title}</p>
              {a.description ? <p className="lk-news-body">{a.description}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <CustomerLookupOpenGroupsSection />

      <section className="lk-site-block" id="guide" aria-labelledby="lk-guide-title">
        <div className="lk-site-block-head">
          <h2 id="lk-guide-title" className="lk-site-block-title">
            代購流程說明
          </h2>
          <p className="lk-site-block-desc">官方流程圖：購物、交易規則與匯率計算（點圖可放大）</p>
        </div>
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
      </section>

      <section className="lk-site-block" id="faq" aria-labelledby="lk-faq-title">
        <div className="lk-site-block-head">
          <h2 id="lk-faq-title" className="lk-site-block-title">
            常見問題
          </h2>
          <p className="lk-site-block-desc">查單、付款與出貨相關說明</p>
        </div>
        <div className="lk-faq-list">
          {faq.map((item) => (
            <details key={item.id || item.q} className="lk-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lk-site-block lk-site-block--contact" id="contact" aria-labelledby="lk-contact-title">
        <div className="lk-site-block-head">
          <h2 id="lk-contact-title" className="lk-site-block-title">
            聯絡客服
          </h2>
          <p className="lk-site-block-desc">查不到訂單或需協助時，請透過官方 LINE 聯繫</p>
        </div>
        <div className="lk-contact-box">
          {lineHref ? (
            <a className="lk-contact-btn" href={lineHref} target="_blank" rel="noreferrer">
              官方 LINE 客服
            </a>
          ) : null}
          {portal.extraNote?.trim() ? <p className="lk-contact-note">{portal.extraNote.trim()}</p> : null}
        </div>
      </section>

      <p className="lk-site-copyright">{FOOTER_STATS.copyright}</p>
    </div>
  )
}
