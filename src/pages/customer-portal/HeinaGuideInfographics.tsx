import { useCallback, useEffect, useRef, useState } from 'react'
import { HEINA_GUIDE_INFOGRAPHICS, type HeinaGuideInfographic } from './heinaGuideInfographicData'
import './heinaGuideInfographics.css'

type Props = {
  /** 查詢頁 / 行銷頁 / 後台群規 */
  variant?: 'lookup' | 'portal' | 'admin'
  className?: string
  /** 覆寫預設三張流程圖（來自訂單自助後台） */
  items?: HeinaGuideInfographic[]
}

export function HeinaGuideInfographics({ variant = 'lookup', className = '', items }: Props) {
  const list = items?.length ? items : HEINA_GUIDE_INFOGRAPHICS
  const [active, setActive] = useState<HeinaGuideInfographic | null>(null)
  const [slide, setSlide] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const rootClass =
    variant === 'admin'
      ? 'heina-guide-grid heina-guide-grid--admin'
      : variant === 'portal'
        ? 'heina-guide-grid heina-guide-grid--portal'
        : 'heina-guide-grid'

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const syncSlide = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.heina-guide-card'))
    if (!cards.length) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    cards.forEach((card, i) => {
      const center = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(center - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setSlide(best)
  }, [])

  const goToSlide = (index: number) => {
    const el = scrollerRef.current
    const card = el?.querySelectorAll<HTMLElement>('.heina-guide-card')[index]
    if (!el || !card) return
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    setSlide(index)
  }

  return (
    <>
      <div className={`heina-guide-block ${className}`.trim()}>
        <p className="heina-guide-swipe-hint">左右滑動查看流程圖 · 點圖可放大</p>
        <div
          ref={scrollerRef}
          className={rootClass}
          onScroll={syncSlide}
          role="region"
          aria-roledescription="carousel"
          aria-label="代購流程說明圖"
        >
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              className="heina-guide-card"
              onClick={() => setActive(item)}
              aria-label={`放大查看：${item.title}`}
            >
              <div className="heina-guide-card-media">
                <img src={item.src} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="heina-guide-card-copy">
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
                <em>點擊放大</em>
              </div>
            </button>
          ))}
        </div>
        {list.length > 1 ? (
          <div className="heina-guide-dots" role="tablist" aria-label="流程圖頁碼">
            {list.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === slide}
                aria-label={`${item.title}（${i + 1}/${list.length}）`}
                className={'heina-guide-dot' + (i === slide ? ' is-active' : '')}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {active ? (
        <div
          className="heina-guide-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="heina-guide-lightbox-close"
            aria-label="關閉"
            onClick={() => setActive(null)}
          >
            ×
          </button>
          <figure className="heina-guide-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={active.src} alt={active.alt} />
            <figcaption>
              <strong>{active.title}</strong>
              <span>{active.desc}</span>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  )
}
