import type {
  PortalAnnouncement,
  PortalConfig,
  PortalFaqItem,
  PortalGuideInfographic,
  PortalProcessStep,
} from '../../api/types'
import {
  HEINA_COMMUNITY_LINE_URL,
  HEINA_INSTAGRAM_URL,
  HEINA_OFFICIAL_LINE_URL,
  HEINA_PORTAL_ABOUT_DEFAULT,
  HEINA_PORTAL_OFFICIAL_INFO_DEFAULT,
  HEINA_THREADS_URL,
} from '../../daigou/heinaPublicCopy'
import { HEINA_GUIDE_INFOGRAPHICS } from './heinaGuideInfographicData'

export const HOME_OPEN_GROUP_PIN_LIMIT = 3

const PORTAL_FALLBACK: PortalConfig = {
  title: 'Heina訂單自助查詢',
  intro: '輸入您的社群暱稱，即可快速查看訂單、付款與出貨狀態。',
  websiteUrl: '',
  groupUrl: '',
  extraNote: '付款後請回傳後五碼；金額疑問請先聯絡代購主再匯款。',
  lookupDesc: '請輸入在社群裡的完整名字或完整訂單編號，以及團主設定的 4 位數專屬查單密碼。沒有專屬密碼請私訊官方 LINE。',
}

function parseJsonArray<T>(raw: unknown): T[] | undefined {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const v = JSON.parse(raw) as unknown
      return Array.isArray(v) ? (v as T[]) : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

function parseAnnouncements(raw: unknown): PortalAnnouncement[] | undefined {
  return parseJsonArray<PortalAnnouncement>(raw)
}

/** 合併試算表／GAS 回傳的 portal（可多欄位），缺值時使用 Heina Shop 顧客專區預設文案 */
export function normalizePortal(raw: unknown): PortalConfig {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const announcements = parseAnnouncements(o.announcements)
  const faqItems = parseJsonArray<PortalFaqItem>(o.faqItems)
  const processSteps = parseJsonArray<PortalProcessStep>(o.processSteps)
  const homeOpenGroupIdsRaw = parseJsonArray<string>(o.homeOpenGroupIds) ?? (
    Array.isArray(o.homeOpenGroupIds)
      ? (o.homeOpenGroupIds as unknown[]).map((x) => String(x || '').trim()).filter(Boolean)
      : undefined
  )
  const homeOpenGroupIds = (homeOpenGroupIdsRaw || [])
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .slice(0, HOME_OPEN_GROUP_PIN_LIMIT)
  const guideInfographics = parseJsonArray<PortalGuideInfographic>(o.guideInfographics)
  const merged: PortalConfig = {
    ...PORTAL_FALLBACK,
    title: String(o.title ?? o.brandName ?? PORTAL_FALLBACK.title),
    intro: String(o.intro ?? o.subtitle ?? PORTAL_FALLBACK.intro),
    websiteUrl: String(o.websiteUrl ?? ''),
    groupUrl: String(o.groupUrl ?? ''),
    extraNote: String(o.extraNote ?? PORTAL_FALLBACK.extraNote),
    lookupDesc: String(o.lookupDesc ?? PORTAL_FALLBACK.lookupDesc ?? '').trim() || PORTAL_FALLBACK.lookupDesc,
    brandName: o.brandName != null ? String(o.brandName) : undefined,
    subtitle: o.subtitle != null ? String(o.subtitle) : undefined,
    about: o.about != null ? String(o.about) : undefined,
    officialInfo: o.officialInfo != null ? String(o.officialInfo) : undefined,
    serviceUrl: o.serviceUrl != null ? String(o.serviceUrl) : undefined,
    linePayUrl: o.linePayUrl != null ? String(o.linePayUrl) : undefined,
    footer: o.footer != null ? String(o.footer) : undefined,
    lineFriendUrl: o.lineFriendUrl != null ? String(o.lineFriendUrl) : undefined,
    lineShoppingUrl: o.lineShoppingUrl != null ? String(o.lineShoppingUrl) : undefined,
    instagramUrl: o.instagramUrl != null ? String(o.instagramUrl) : undefined,
    threadsUrl: o.threadsUrl != null ? String(o.threadsUrl) : undefined,
    preorderShopUrl: o.preorderShopUrl != null ? String(o.preorderShopUrl) : undefined,
    spotShopUrl: o.spotShopUrl != null ? String(o.spotShopUrl) : undefined,
    announcements: announcements ?? (o.announcements as PortalConfig['announcements']),
    faqItems: faqItems ?? (o.faqItems as PortalConfig['faqItems']),
    processSteps: processSteps ?? (o.processSteps as PortalConfig['processSteps']),
    homeOpenGroupIds: homeOpenGroupIds.length ? homeOpenGroupIds : undefined,
    guideInfographics: guideInfographics?.length ? guideInfographics : undefined,
  }
  if (!String(merged.lineFriendUrl || '').trim()) merged.lineFriendUrl = HEINA_OFFICIAL_LINE_URL
  if (!String(merged.serviceUrl || '').trim()) merged.serviceUrl = HEINA_OFFICIAL_LINE_URL
  if (!String(merged.groupUrl || '').trim()) merged.groupUrl = HEINA_COMMUNITY_LINE_URL
  if (!String(merged.instagramUrl || '').trim()) merged.instagramUrl = HEINA_INSTAGRAM_URL
  if (!String(merged.threadsUrl || '').trim()) merged.threadsUrl = HEINA_THREADS_URL
  if (!String(merged.officialInfo || '').trim()) merged.officialInfo = HEINA_PORTAL_OFFICIAL_INFO_DEFAULT
  if (!String(merged.about || '').trim()) merged.about = HEINA_PORTAL_ABOUT_DEFAULT
  return merged
}

/** 前台顯示用：內建三張流程圖，可被 portal.guideInfographics 覆寫 */
export function guideInfographicsFor(portal?: PortalConfig | null) {
  const overrides = Array.isArray(portal?.guideInfographics) ? portal!.guideInfographics! : []
  const byId = new Map(overrides.map((g) => [g.id, g]))
  return HEINA_GUIDE_INFOGRAPHICS.map((base) => {
    const o = byId.get(base.id)
    if (!o) return { ...base }
    const src = String(o.src || '').trim()
    return {
      id: base.id,
      title: String(o.title || '').trim() || base.title,
      desc: String(o.desc || '').trim() || base.desc,
      src: src || base.src,
      alt: String(o.alt || '').trim() || base.alt,
    }
  })
}

/** 後台編輯用初始列（含目前圖源） */
export function editableGuideInfographics(portal?: PortalConfig | null): PortalGuideInfographic[] {
  return guideInfographicsFor(portal).map((g) => ({
    id: g.id,
    title: g.title,
    desc: g.desc,
    src: g.src,
    alt: g.alt,
  }))
}
