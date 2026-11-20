import { isLocalGasPreviewHost, localPreviewHubHref } from '../../utils/localPreview'
import './localPreviewBar.css'

/** 本機預覽時顯示：可隨時回到 /preview/ 入口（整頁跳轉，非 hash 路由） */
export function LocalPreviewBar() {
  if (!isLocalGasPreviewHost()) return null
  if (window.location.pathname.startsWith('/preview')) return null

  return (
    <a className="local-preview-bar" href={localPreviewHubHref()} title="回到本機預覽首頁">
      ← 本機預覽首頁
    </a>
  )
}
