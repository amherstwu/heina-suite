import type { PortalConfig } from '../../api/types'
import {
  announcementsFor,
  FOOTER_STATS,
} from './staticContent'
import { CustomerLookupOpenGroupsSection } from './CustomerLookupOpenGroupsSection'
import { LookupTeachSection } from './LookupTeachSection'
import { IconInsta, IconLine, IconThreads, IconUsers } from './PortalIcons'
import { visibleSocialIconSlots } from './portalSocialIcons'
import './heinaGuideInfographics.css'

type Props = {
  portal: PortalConfig
  showInfo: boolean
}

export function CustomerLookupSiteSections({ portal, showInfo }: Props) {
  if (!showInfo) return null

  const announcements = announcementsFor(portal).slice(0, 4)
  const lineHref = portal.lineFriendUrl || portal.serviceUrl || ''
  const socialIcons = visibleSocialIconSlots(portal)

  return (
    <div className="lk-site-sections">
      <CustomerLookupOpenGroupsSection />

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

      <LookupTeachSection portal={portal} />

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
          {socialIcons.length ? (
            <nav className="lk-social-icons" aria-label="社群連結">
              {socialIcons.map((slot) => (
                <a
                  key={slot.id}
                  className="lk-social-icon"
                  href={slot.url}
                  target="_blank"
                  rel="noreferrer"
                  title={slot.label}
                  aria-label={slot.label}
                >
                  {slot.iconUrl ? (
                    <img src={slot.iconUrl} alt="" />
                  ) : slot.kind === 'ig' ? (
                    <IconInsta className="lk-social-ic" />
                  ) : slot.kind === 'threads' ? (
                    <IconThreads className="lk-social-ic" />
                  ) : slot.kind === 'line' ? (
                    <IconLine className="lk-social-ic" />
                  ) : (
                    <IconUsers className="lk-social-ic" />
                  )}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      <p className="lk-site-copyright">{FOOTER_STATS.copyright}</p>
    </div>
  )
}
