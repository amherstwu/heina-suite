import type { PortalConfig, PortalTeachCard, PortalTeachCardId, PortalTeachImage } from '../../api/types'

export const TEACH_IMAGE_CARDS: { id: PortalTeachCardId; title: string; hint: string }[] = [
  { id: 'search-tips', title: '搜尋商品小撇步', hint: '怎麼用關鍵字找到想買的商品' },
  { id: 'thread-usage', title: '討論串使用', hint: '各店討論串要怎麼留言、問價' },
  { id: 'chat-reminders', title: '聊天室小提醒', hint: '聊天室裡要注意的事' },
  { id: 'order-howto', title: '喊單操作', hint: '記事本怎麼截圖、留言數量' },
]

const IDS = new Set(TEACH_IMAGE_CARDS.map((c) => c.id))

function parseImages(raw: unknown): PortalTeachImage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => {
      const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      const src = String(o.src || '').trim()
      if (!src) return null
      return {
        id: String(o.id || `img_${i}`),
        src,
        alt: String(o.alt || '').trim() || undefined,
      }
    })
    .filter((x): x is PortalTeachImage => !!x)
}

export function parseTeachCards(raw: unknown): PortalTeachCard[] | undefined {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.trim()
      ? (() => {
          try {
            const v = JSON.parse(raw) as unknown
            return Array.isArray(v) ? v : []
          } catch {
            return []
          }
        })()
      : []
  if (!list.length) return undefined
  const out: PortalTeachCard[] = []
  for (const item of list) {
    const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const id = String(o.id || '') as PortalTeachCardId
    if (!IDS.has(id)) continue
    out.push({
      id,
      title: String(o.title || '').trim() || undefined,
      images: parseImages(o.images),
    })
  }
  return out.length ? out : undefined
}

export function teachCardsFor(portal?: PortalConfig | null): PortalTeachCard[] {
  const saved = parseTeachCards(portal?.teachCards) || []
  const byId = new Map(saved.map((c) => [c.id, c]))
  return TEACH_IMAGE_CARDS.map((base) => {
    const o = byId.get(base.id)
    return {
      id: base.id,
      title: String(o?.title || '').trim() || base.title,
      images: o?.images || [],
    }
  })
}
