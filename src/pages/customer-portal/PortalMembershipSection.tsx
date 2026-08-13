import type { PortalConfig } from '../../api/types'
import { MEMBERSHIP_TIERS } from '../../daigou/membershipTiers'
import { HEINA_OFFICIAL_LINE_URL, HEINA_PORTAL_MEMBERSHIP_LEAD } from '../../daigou/heinaPublicCopy'
import { smoothScrollTo } from './portalUtils'

export function PortalMembershipSection({ portal }: { portal: PortalConfig }) {
  const lineHref = (portal.lineFriendUrl || portal.serviceUrl || HEINA_OFFICIAL_LINE_URL).trim() || HEINA_OFFICIAL_LINE_URL

  return (
    <section id="membership" className="kp-section kp-mship-section">
      <div className="kp-section-head">
        <h2 className="kp-h2">會員禮遇與等級制度</h2>
        <p className="kp-lead kp-mship-lead">
          消費可升等、等級愈高公告禮遇愈完整；本頁與對外說明皆不顯示累積金額或門檻數字，金額認列與調整僅於闆娘後台處理。
        </p>
      </div>

      <div className="kp-mship-prose">
        {HEINA_PORTAL_MEMBERSHIP_LEAD.split('\n\n').map((para, i) => (
          <p key={i} className="kp-mship-p">
            {para}
          </p>
        ))}
      </div>

      <h3 className="kp-mship-subh">各等級禮遇摘要（實際以公告為準）</h3>
      <p className="kp-mship-micro">
        下列為制度摘要，不具體標示金額門檻。生日禮、包材加值、限量保留、年度感謝等是否適用，依每次開團／社群記事本與官方 LINE 通知為準。
      </p>

      <div className="kp-mship-tier-grid">
        {MEMBERSHIP_TIERS.map((t) => (
          <article key={t.id} className="kp-mship-tier-card">
            <header className="kp-mship-tier-head">
              <span className="kp-mship-tier-badge">{t.label}</span>
            </header>
            <ul className="kp-mship-tier-ul">
              {t.memberBenefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="kp-mship-foot">
        <p className="kp-mship-foot-p">
          若您與家人共用裝置查單，建議查畢關閉分頁。若需客服協助改名、對帳、或會員等級疑義，請私訊官方 LINE（請勿在公開社團留下完整個資）。
        </p>
        <div className="kp-mship-foot-actions">
          <a href={lineHref} className="kp-btn-primary" target="_blank" rel="noreferrer">
            開啟官方 LINE
          </a>
          <button type="button" className="kp-btn-secondary" onClick={() => smoothScrollTo('order-search')}>
            返回查詢訂單
          </button>
        </div>
      </div>
    </section>
  )
}
