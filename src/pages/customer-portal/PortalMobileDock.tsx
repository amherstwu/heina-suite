import { smoothScrollTo } from './portalUtils'
import { usePortalBrowse } from './usePortalBrowse'

const ITEMS = [
  { id: 'order-search', label: '查單' },
  { id: 'kp-browse', label: '公告' },
  { id: 'kp-hero', label: '首頁' },
] as const

/** 手機版專用底部快捷列（電腦版隱藏） */
export function PortalMobileDock() {
  const { openBrowseTab } = usePortalBrowse()

  return (
    <nav className="kp-mobile-dock" aria-label="手機版快捷選單">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="kp-mobile-dock-btn"
          onClick={() => {
            if (item.id === 'kp-browse') {
              openBrowseTab('news')
            }
            smoothScrollTo(item.id)
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
