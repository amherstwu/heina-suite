import { FOOTER_STATS } from './staticContent'
import { usePortalBrowse } from './usePortalBrowse'

const FOOT_LINKS: { id: string; label: string }[] = [
  { id: 'order-search', label: '訂單查詢' },
  { id: 'latest-news', label: '最新公告' },
  { id: 'links-sns', label: '連結專區' },
  { id: 'about-us', label: '關於我們' },
  { id: 'faq', label: 'FAQ' },
]

export function PortalFooter() {
  const { navigatePortalAnchor } = usePortalBrowse()

  return (
    <footer className="kp-footer">
      <div className="kp-footer-inner">
        <div className="kp-footer-stats">
          <span>今日瀏覽量：{FOOTER_STATS.todayViews}</span>
          <span className="kp-footer-sep" aria-hidden>
            |
          </span>
          <span>本月瀏覽量：{FOOTER_STATS.monthViews.toLocaleString('zh-TW')}</span>
        </div>
        <p className="kp-footer-design">{FOOTER_STATS.designerLine}</p>
        {FOOTER_STATS.taxId ? <p className="kp-footer-tax">統編：{FOOTER_STATS.taxId}</p> : null}
        <p className="kp-footer-copy">{FOOTER_STATS.copyright}</p>
        <nav className="kp-footer-nav" aria-label="頁尾連結">
          {FOOT_LINKS.map((l) => (
            <button key={l.id} type="button" className="kp-footer-link" onClick={() => navigatePortalAnchor(l.id)}>
              {l.label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  )
}
