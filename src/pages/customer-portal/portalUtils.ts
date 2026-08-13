/** 顧客專區「瀏覽分區」分頁 id（與 PortalMarketingSections TABS 一致） */
export type PortalBrowseTab = 'news' | 'member' | 'about' | 'links' | 'guide' | 'faq' | 'support'

export function formatTwd(n: number) {
  const v = Number(n)
  if (Number.isNaN(v)) return '—'
  return `NT$ ${Math.round(v).toLocaleString('zh-TW')}`
}

export function dash(s: string | undefined | null) {
  const t = String(s ?? '').trim()
  return t ? t : '尚未更新'
}

export function smoothScrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
