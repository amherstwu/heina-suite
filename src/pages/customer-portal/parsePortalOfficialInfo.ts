import { HEINA_OFFICIAL_LINE_URL } from '../../daigou/heinaPublicCopy'

const URL_PATTERN = /https?:\/\/[^\s)\]］>]+/g

export type OfficialBracketBlock = {
  id: string
  title: string
  body: string
}

function slugId(s: string, i: number) {
  const base = s.replace(/[^\w\u4e00-\u9fff-]+/g, '').slice(0, 20)
  return `blk-${i}-${base || 'x'}`
}

/** 從文案中找出官方 LINE／LIFF 連結（用於按鈕，不直接顯示網址） */
export function extractLineUrlFromText(text: string): string | null {
  const urls = text.match(URL_PATTERN) ?? []
  const hit = urls.find((u) => /line\.me|liff\.line/i.test(u))
  return hit ?? null
}

export function stripUrlsFromText(text: string): string {
  return text.replace(URL_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 將含【標題】分段的說明拆成區塊（已先移除網址字串）。
 * 第一段若不以【開頭，則整段收進「說明」。
 */
export function parseBracketBlocks(text: string): OfficialBracketBlock[] {
  const cleaned = stripUrlsFromText(text)
  if (!cleaned) return []
  const parts = cleaned.split(/\n(?=【)/)
  const out: OfficialBracketBlock[] = []
  let i = 0
  for (const part of parts) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^【([^】]+)】(.*)/s)
    if (m) {
      const title = `【${m[1]}】`
      const body = String(m[2] ?? '').trim()
      out.push({ id: slugId(title, i++), title, body })
    } else {
      out.push({ id: slugId('note', i++), title: '說明', body: p })
    }
  }
  return out
}

/** 關於我們：簡介（第一個【之前的段落）與其餘可折疊內容 */
export function splitAboutIntroAndRest(about: string): { intro: string; rest: string } {
  const t = about.trim()
  if (!t) return { intro: '', rest: '' }
  const idx = t.search(/\n【/)
  if (idx === -1) return { intro: t, rest: '' }
  return { intro: t.slice(0, idx).trim(), rest: t.slice(idx + 1).trim() }
}

export function resolvePortalLineHref(portalLine: string | undefined, portalService: string | undefined, fromText: string): string {
  const a = (portalLine || '').trim()
  if (a) return a
  const b = (portalService || '').trim()
  if (b) return b
  const c = extractLineUrlFromText(fromText)
  if (c) return c
  return HEINA_OFFICIAL_LINE_URL
}
