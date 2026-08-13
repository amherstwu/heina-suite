import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LiveLine, LiveSession } from './liveTypes'
import { liveCustomerKey, liveSessionNameKey } from './liveTypes'
import {
  deleteLiveSessionArtifacts,
  syncLiveSessionToShipping,
  type LiveDeleteResult,
  type LiveSyncResult,
} from './liveSync'

function rid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`
}

function remapCustomerPhotos(
  photos: Record<string, string[]> | undefined,
  fromKey: string,
  toName: string,
): Record<string, string[]> {
  const map = { ...(photos || {}) }
  const fromEntry = Object.entries(map).find(([k]) => liveCustomerKey(k) === fromKey)
  if (!fromEntry) return map
  const [, urls] = fromEntry
  delete map[fromEntry[0]]
  const toKey = liveCustomerKey(toName)
  const existingKey = Object.keys(map).find((k) => liveCustomerKey(k) === toKey)
  if (existingKey) {
    map[existingKey] = [...(map[existingKey] || []), ...urls].slice(0, 8)
  } else if (toName.trim()) {
    map[toName.trim()] = urls.slice(0, 8)
  }
  return map
}

function mergeCustomerPhotoMaps(
  a?: Record<string, string[]>,
  b?: Record<string, string[]>,
): Record<string, string[]> {
  const out: Record<string, string[]> = { ...(a || {}) }
  for (const [name, urls] of Object.entries(b || {})) {
    const key = liveCustomerKey(name)
    const existingKey = Object.keys(out).find((k) => liveCustomerKey(k) === key) || name
    out[existingKey] = [...(out[existingKey] || []), ...urls].slice(0, 8)
  }
  return out
}

function clearLineSyncMarks(lines: LiveLine[]): LiveLine[] {
  return lines.map((l) =>
    l.syncedOrderId || l.matchedCustomerId
      ? { ...l, syncedOrderId: undefined, matchedCustomerId: undefined }
      : l,
  )
}

/** 把 source 併入 target（保留 target.id） */
function mergeSessionInto(target: LiveSession, source: LiveSession): LiveSession {
  const notes = [target.notes, source.notes].map((n) => String(n || '').trim()).filter(Boolean)
  return {
    ...target,
    name: target.name.trim() || source.name.trim() || '未命名連線',
    lines: [...target.lines, ...clearLineSyncMarks(source.lines)],
    photoUrls: [...(target.photoUrls || []), ...(source.photoUrls || [])].slice(0, 12),
    customerPhotoUrls: mergeCustomerPhotoMaps(target.customerPhotoUrls, source.customerPhotoUrls),
    notes: notes.join('\n'),
    updatedAt: Date.now(),
    syncedAt: undefined,
  }
}

function findSessionByName(sessions: LiveSession[], name: string, excludeId?: string) {
  const key = liveSessionNameKey(name)
  return sessions.find((s) => s.id !== excludeId && liveSessionNameKey(s.name) === key) ?? null
}

export type LiveRenameResult = {
  id: string
  merged: boolean
  message?: string
}

type LiveStore = {
  sessions: LiveSession[]
  addSession: (name: string, lines?: LiveLine[], photoUrls?: string[]) => string
  updateSession: (id: string, patch: Partial<LiveSession>) => void
  /** 改名；若已有同名連線則併入該場並回傳合併後的 id */
  renameSession: (id: string, nextName: string) => LiveRenameResult
  /** 把同名連線全部併成一場（啟動／手動統整用） */
  consolidateSessionsByName: () => { mergedCount: number }
  deleteSession: (id: string) => LiveDeleteResult
  appendLines: (id: string, lines: LiveLine[]) => void
  updateLine: (sessionId: string, lineId: string, patch: Partial<LiveLine>) => void
  removeLine: (sessionId: string, lineId: string) => void
  renameCustomer: (sessionId: string, fromKey: string, nextName: string) => void
  removeCustomer: (sessionId: string, customerKey: string) => void
  addPhotos: (sessionId: string, urls: string[]) => void
  removePhoto: (sessionId: string, index: number) => void
  addCustomerPhotos: (sessionId: string, customerName: string, urls: string[]) => void
  removeCustomerPhoto: (sessionId: string, customerName: string, index: number) => void
  syncToShipping: (sessionId: string) => LiveSyncResult
  /** 出貨頁刪除客單後，清掉對應連線明細的同步標記 */
  clearSyncedOrderIds: (orderIds: string[]) => void
}

export const useLiveStore = create<LiveStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession(name, lines = [], photoUrls = []) {
        const displayName = name.trim() || '未命名連線'
        const existing = findSessionByName(get().sessions, displayName)
        if (existing) {
          set((s) => ({
            sessions: s.sessions.map((x) =>
              x.id === existing.id
                ? {
                    ...x,
                    name: x.name.trim() || displayName,
                    lines: [...x.lines, ...lines],
                    photoUrls: [...(x.photoUrls || []), ...photoUrls].slice(0, 12),
                    updatedAt: Date.now(),
                    syncedAt: undefined,
                  }
                : x,
            ),
          }))
          return existing.id
        }

        const id = rid('live')
        const now = Date.now()
        const session: LiveSession = {
          id,
          name: displayName,
          createdAt: now,
          updatedAt: now,
          photoUrls,
          customerPhotoUrls: {},
          lines,
          notes: '',
        }
        set((s) => ({ sessions: [session, ...s.sessions] }))
        return id
      },

      updateSession(id, patch) {
        // 改名請走 renameSession，避免繞過同名合併
        if (patch.name != null) {
          get().renameSession(id, patch.name)
          const rest = { ...patch }
          delete rest.name
          if (Object.keys(rest).length === 0) return
          const survivor = get().sessions.find(
            (s) => liveSessionNameKey(s.name) === liveSessionNameKey(patch.name!),
          )
          const targetId = survivor?.id ?? id
          set((s) => ({
            sessions: s.sessions.map((x) =>
              x.id === targetId ? { ...x, ...rest, updatedAt: Date.now() } : x,
            ),
          }))
          return
        }
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x,
          ),
        }))
      },

      renameSession(id, nextName) {
        const displayName = nextName.trim() || '未命名連線'
        const source = get().sessions.find((x) => x.id === id)
        if (!source) return { id, merged: false, message: '找不到連線' }

        const sameNameSelf = liveSessionNameKey(source.name) === liveSessionNameKey(displayName)
        if (sameNameSelf && source.name === displayName) {
          return { id, merged: false }
        }

        const target = findSessionByName(get().sessions, displayName, id)
        if (!target) {
          set((s) => ({
            sessions: s.sessions.map((x) =>
              x.id === id
                ? { ...x, name: displayName, updatedAt: Date.now(), syncedAt: undefined }
                : x,
            ),
          }))
          return { id, merged: false }
        }

        // 併入已存在的同名連線，清掉被吸收場次的出貨同步資料
        deleteLiveSessionArtifacts(source.id)
        const merged = mergeSessionInto({ ...target, name: target.name.trim() || displayName }, source)
        set((s) => ({
          sessions: s.sessions
            .filter((x) => x.id !== source.id)
            .map((x) => (x.id === target.id ? merged : x)),
        }))
        return {
          id: target.id,
          merged: true,
          message: `已與同名連線「${merged.name}」合併`,
        }
      },

      consolidateSessionsByName() {
        const sessions = get().sessions
        const groups = new Map<string, LiveSession[]>()
        for (const s of sessions) {
          const key = liveSessionNameKey(s.name)
          const arr = groups.get(key) ?? []
          arr.push(s)
          groups.set(key, arr)
        }

        let mergedCount = 0
        const absorbedIds: string[] = []
        const survivors = new Map<string, LiveSession>()

        for (const [, list] of groups) {
          if (list.length === 1) {
            survivors.set(list[0].id, list[0])
            continue
          }
          // 保留建立較早的一場
          const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt)
          let keep = sorted[0]
          for (const extra of sorted.slice(1)) {
            deleteLiveSessionArtifacts(extra.id)
            keep = mergeSessionInto(keep, extra)
            absorbedIds.push(extra.id)
            mergedCount += 1
          }
          survivors.set(keep.id, keep)
        }

        if (!mergedCount) return { mergedCount: 0 }

        set({
          sessions: sessions
            .filter((s) => !absorbedIds.includes(s.id))
            .map((s) => survivors.get(s.id) ?? s),
        })
        return { mergedCount }
      },

      deleteSession(id) {
        const result = deleteLiveSessionArtifacts(id)
        set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }))
        return result
      },

      appendLines(id, lines) {
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id
              ? { ...x, lines: [...x.lines, ...lines], updatedAt: Date.now(), syncedAt: undefined }
              : x,
          ),
        }))
      },

      updateLine(sessionId, lineId, patch) {
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id !== sessionId
              ? x
              : {
                  ...x,
                  updatedAt: Date.now(),
                  syncedAt: undefined,
                  lines: x.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
                },
          ),
        }))
      },

      removeLine(sessionId, lineId) {
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== sessionId) return x
            const target = x.lines.find((l) => l.id === lineId)
            const lines = x.lines.filter((l) => l.id !== lineId)
            let customerPhotoUrls = x.customerPhotoUrls || {}
            if (target) {
              const key = liveCustomerKey(target.customerName)
              const stillHas = lines.some((l) => liveCustomerKey(l.customerName) === key)
              if (!stillHas) {
                customerPhotoUrls = { ...customerPhotoUrls }
                for (const k of Object.keys(customerPhotoUrls)) {
                  if (liveCustomerKey(k) === key) delete customerPhotoUrls[k]
                }
              }
            }
            return {
              ...x,
              lines,
              customerPhotoUrls,
              updatedAt: Date.now(),
              syncedAt: undefined,
            }
          }),
        }))
      },

      renameCustomer(sessionId, fromKey, nextName) {
        const name = nextName.trim()
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== sessionId) return x
            const lines = x.lines.map((l) =>
              liveCustomerKey(l.customerName) === fromKey ? { ...l, customerName: name } : l,
            )
            return {
              ...x,
              lines,
              customerPhotoUrls: remapCustomerPhotos(x.customerPhotoUrls, fromKey, name),
              updatedAt: Date.now(),
              syncedAt: undefined,
            }
          }),
        }))
      },

      removeCustomer(sessionId, customerKey) {
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== sessionId) return x
            const lines = x.lines.filter((l) => liveCustomerKey(l.customerName) !== customerKey)
            const customerPhotoUrls = { ...(x.customerPhotoUrls || {}) }
            for (const k of Object.keys(customerPhotoUrls)) {
              if (liveCustomerKey(k) === customerKey) delete customerPhotoUrls[k]
            }
            return {
              ...x,
              lines,
              customerPhotoUrls,
              updatedAt: Date.now(),
              syncedAt: undefined,
            }
          }),
        }))
      },

      addPhotos(sessionId, urls) {
        if (!urls.length) return
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId
              ? { ...x, photoUrls: [...x.photoUrls, ...urls].slice(0, 12), updatedAt: Date.now() }
              : x,
          ),
        }))
      },

      removePhoto(sessionId, index) {
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId
              ? {
                  ...x,
                  photoUrls: x.photoUrls.filter((_, i) => i !== index),
                  updatedAt: Date.now(),
                }
              : x,
          ),
        }))
      },

      addCustomerPhotos(sessionId, customerName, urls) {
        if (!urls.length) return
        const name = customerName.trim() || '（未填名字）'
        const key = liveCustomerKey(name)
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== sessionId) return x
            const map = { ...(x.customerPhotoUrls || {}) }
            const existingKey = Object.keys(map).find((k) => liveCustomerKey(k) === key) || name
            map[existingKey] = [...(map[existingKey] || []), ...urls].slice(0, 8)
            return { ...x, customerPhotoUrls: map, updatedAt: Date.now() }
          }),
        }))
      },

      removeCustomerPhoto(sessionId, customerName, index) {
        const key = liveCustomerKey(customerName)
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== sessionId) return x
            const map = { ...(x.customerPhotoUrls || {}) }
            const existingKey = Object.keys(map).find((k) => liveCustomerKey(k) === key)
            if (!existingKey) return x
            const next = (map[existingKey] || []).filter((_, i) => i !== index)
            if (next.length) map[existingKey] = next
            else delete map[existingKey]
            return { ...x, customerPhotoUrls: map, updatedAt: Date.now() }
          }),
        }))
      },

      syncToShipping(sessionId) {
        const session = get().sessions.find((x) => x.id === sessionId)
        if (!session) {
          return {
            ok: false,
            message: '找不到連線',
            orderCount: 0,
            customerCount: 0,
            shipmentCount: 0,
            updatedLines: [],
          }
        }
        const result = syncLiveSessionToShipping(session)
        if (result.ok) {
          set((s) => ({
            sessions: s.sessions.map((x) =>
              x.id === sessionId
                ? {
                    ...x,
                    lines: result.updatedLines,
                    syncedAt: Date.now(),
                    updatedAt: Date.now(),
                  }
                : x,
            ),
          }))
        }
        return result
      },

      clearSyncedOrderIds(orderIds) {
        const idSet = new Set(orderIds.filter(Boolean))
        if (!idSet.size) return
        set((s) => ({
          sessions: s.sessions.map((session) => {
            let changed = false
            const lines = session.lines.map((line) => {
              if (!line.syncedOrderId || !idSet.has(line.syncedOrderId)) return line
              changed = true
              return { ...line, syncedOrderId: undefined, matchedCustomerId: undefined }
            })
            if (!changed) return session
            return {
              ...session,
              lines,
              syncedAt: undefined,
              updatedAt: Date.now(),
            }
          }),
        }))
      },
    }),
    { name: 'heina-live-sessions-v1' },
  ),
)

export function newLiveLineId() {
  return rid('ll')
}
