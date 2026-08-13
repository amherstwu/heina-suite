import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useApi } from '../../context/useApi'
import type { PublicGroupCatalogItem } from '../../api/types'
import { HOME_OPEN_GROUP_PIN_LIMIT } from './mergePortal'
import {
  listClosingSoonPublicGroups,
  openGroupsListHref,
  pickHomeOpenGroupPreview,
} from '../open-groups/openGroupsUtils'
import { LookupGroupPosterCard } from './LookupGroupPosterCard'

const PREVIEW_LIMIT = HOME_OPEN_GROUP_PIN_LIMIT
const CLOSING_SOON_DAYS = 5
const CLOSING_SOON_HOME_LIMIT = 3

export function CustomerLookupOpenGroupsSection() {
  const api = useApi()
  const [groups, setGroups] = useState<PublicGroupCatalogItem[]>([])
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const res = await api.call<{ groups: PublicGroupCatalogItem[]; homeOpenGroupIds?: string[] }>({
          module: 'groupbuy',
          action: 'listPublicGroups',
        })
        if (cancelled) return
        setGroups(res.groups || [])
        setPinnedIds(
          (res.homeOpenGroupIds || [])
            .map((id) => String(id || '').trim())
            .filter(Boolean)
            .slice(0, HOME_OPEN_GROUP_PIN_LIMIT),
        )
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setGroups([])
          setPinnedIds([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  const preview = useMemo(
    () => pickHomeOpenGroupPreview(groups, pinnedIds, PREVIEW_LIMIT),
    [groups, pinnedIds],
  )

  const closingSoonAll = useMemo(
    () => listClosingSoonPublicGroups(groups, CLOSING_SOON_DAYS),
    [groups],
  )
  const closingSoon = useMemo(
    () => closingSoonAll.slice(0, CLOSING_SOON_HOME_LIMIT),
    [closingSoonAll],
  )
  const closingMoreCount = Math.max(0, closingSoonAll.length - closingSoon.length)

  const moreCount = Math.max(0, groups.length - preview.length)

  return (
    <>
      <section className="lk-site-block" id="closing-soon" aria-labelledby="lk-closing-soon-title">
        <div className="lk-site-block-head">
          <h2 id="lk-closing-soon-title" className="lk-site-block-title">
            即將結單
          </h2>
          <p className="lk-site-block-desc">
            近{CLOSING_SOON_DAYS}日結單共有
            <span className="lk-site-block-desc-em">{closingSoonAll.length}</span>
            團
            {closingMoreCount > 0 ? (
              <>
                ，其他即將結單還有
                <span className="lk-site-block-desc-em">{closingMoreCount}</span>
                團請去開團專區
              </>
            ) : null}
          </p>
        </div>

        {loading ? (
          <p className="lk-og-empty">載入開團資訊中…</p>
        ) : closingSoon.length === 0 ? (
          <p className="lk-og-empty">近期沒有即將結單的開團</p>
        ) : (
          <div className="lk-og-rail" role="list">
            {closingSoon.map((g) => (
              <div key={g.id} className="lk-og-rail-item" role="listitem">
                <LookupGroupPosterCard group={g} />
              </div>
            ))}
          </div>
        )}

        {closingMoreCount > 0 ? (
          <div className="lk-og-cta-wrap" style={{ marginTop: '0.85rem' }}>
            <Link to={openGroupsListHref()} className="lk-og-cta">
              <span className="lk-og-cta-label">查看其餘即將結單（還有 {closingMoreCount} 團）</span>
              <ArrowRight className="lk-og-cta-icon" size={20} aria-hidden />
            </Link>
          </div>
        ) : null}
      </section>

      <section className="lk-site-block" id="open-groups" aria-labelledby="lk-open-groups-title">
        <div className="lk-site-block-head">
          <h2 id="lk-open-groups-title" className="lk-site-block-title">
            開團專區(場販+通販)
          </h2>
          <p className="lk-og-shout-note">
            喊單請前往記事本留言，也可用關鍵字搜尋團務
          </p>
        </div>

        {loading ? (
          <p className="lk-og-empty">載入開團資訊中…</p>
        ) : preview.length === 0 ? (
          <p className="lk-og-empty">目前沒有公開開團</p>
        ) : (
          <div className="lk-og-rail" role="list">
            {preview.map((g) => (
              <div key={g.id} className="lk-og-rail-item" role="listitem">
                <LookupGroupPosterCard group={g} pinned={pinnedIds.includes(g.id)} />
              </div>
            ))}
          </div>
        )}

        <div className="lk-og-cta-wrap">
          <Link to={openGroupsListHref()} className="lk-og-cta">
            <span className="lk-og-cta-label">
              {moreCount > 0 ? `查看其他開團（還有 ${moreCount} 團）` : '前往開團專區'}
            </span>
            <ArrowRight className="lk-og-cta-icon" size={20} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  )
}
