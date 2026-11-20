import type { PortalConfig, PortalSocialIconKind, PortalSocialIconSlot } from '../../api/types'
import {
  HEINA_COMMUNITY_LINE_URL,
  HEINA_INSTAGRAM_URL,
  HEINA_THREADS_URL,
} from '../../daigou/heinaPublicCopy'

export const SOCIAL_ICON_SLOT_MIN = 3
export const SOCIAL_ICON_SLOT_MAX = 6

export function defaultSocialIconSlots(portal?: PortalConfig | null): PortalSocialIconSlot[] {
  return [
    {
      id: 'ig',
      label: 'IG',
      url: String(portal?.instagramUrl || HEINA_INSTAGRAM_URL).trim(),
      kind: 'ig',
    },
    {
      id: 'threads',
      label: 'Threads',
      url: String(portal?.threadsUrl || HEINA_THREADS_URL).trim(),
      kind: 'threads',
    },
    {
      id: 'community',
      label: '社群',
      url: String(portal?.groupUrl || HEINA_COMMUNITY_LINE_URL).trim(),
      kind: 'line',
    },
  ]
}

function normalizeKind(raw: unknown): PortalSocialIconKind {
  const k = String(raw || '').trim()
  if (k === 'ig' || k === 'threads' || k === 'line' || k === 'custom') return k
  return 'custom'
}

export function parseSocialIconSlots(raw: unknown): PortalSocialIconSlot[] | undefined {
  if (Array.isArray(raw)) {
    const slots = raw
      .map((item, i) => {
        const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
        const url = String(o.url || '').trim()
        const label = String(o.label || '').trim()
        const id = String(o.id || '').trim() || `sns_${i}`
        return {
          id,
          label: label || `連結 ${i + 1}`,
          url,
          kind: normalizeKind(o.kind),
          iconUrl: String(o.iconUrl || '').trim() || undefined,
        } satisfies PortalSocialIconSlot
      })
    return slots.length ? slots : undefined
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseSocialIconSlots(JSON.parse(raw))
    } catch {
      return undefined
    }
  }
  return undefined
}

export function socialIconSlotsFor(portal?: PortalConfig | null): PortalSocialIconSlot[] {
  const parsed = parseSocialIconSlots(portal?.socialIconSlots)
  if (parsed?.length) {
    const padded = [...parsed]
    const fallback = defaultSocialIconSlots(portal)
    while (padded.length < SOCIAL_ICON_SLOT_MIN) {
      padded.push({
        ...fallback[padded.length]!,
        id: `${fallback[padded.length]!.id}_${padded.length}`,
      })
    }
    return padded.slice(0, SOCIAL_ICON_SLOT_MAX)
  }
  return defaultSocialIconSlots(portal)
}

export function visibleSocialIconSlots(portal?: PortalConfig | null): PortalSocialIconSlot[] {
  return socialIconSlotsFor(portal).filter((s) => String(s.url || '').trim())
}
