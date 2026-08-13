import { useEffect, useState } from 'react'
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

  return (
    <>
      <div className={`${rootClass} ${className}`.trim()}>
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
