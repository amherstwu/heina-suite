import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './groupImageSwipe.css'

type Props = {
  images: string[]
  /** 無圖時顯示的字（通常為團名首字） */
  emptyLabel?: string
  className?: string
  imgClassName?: string
  /** 詳情頁用較高比例 */
  size?: 'card' | 'detail' | 'poster'
  alt?: string
}

/**
 * 同一團多張照片：左右滑動（觸控捲動＋按鈕）。
 * 若包在 Link 內，滑動後會抑制誤觸點擊導頁。
 */
export function GroupImageSwipe({
  images,
  emptyLabel = '團',
  className = '',
  imgClassName = '',
  size = 'card',
  alt = '',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const dragMoved = useRef(false)
  const startX = useRef(0)

  const count = images.length

  const syncIndexFromScroll = useCallback(() => {
    const el = trackRef.current
    if (!el || !count) return
    const w = el.clientWidth || 1
    const next = Math.round(el.scrollLeft / w)
    setIndex(Math.max(0, Math.min(count - 1, next)))
  }, [count])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onScroll = () => syncIndexFromScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [syncIndexFromScroll])

  useEffect(() => {
    setIndex(0)
    const el = trackRef.current
    if (el) el.scrollTo({ left: 0 })
  }, [images.join('|')])

  function goTo(i: number) {
    const el = trackRef.current
    if (!el || count <= 0) return
    const next = Math.max(0, Math.min(count - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setIndex(next)
  }

  function onPointerDown(e: ReactPointerEvent) {
    dragMoved.current = false
    startX.current = e.clientX
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (Math.abs(e.clientX - startX.current) > 8) dragMoved.current = true
  }

  function onClickCapture(e: ReactMouseEvent) {
    if (dragMoved.current) {
      e.preventDefault()
      e.stopPropagation()
      dragMoved.current = false
    }
  }

  if (!count) {
    return (
      <div className={`gis gis--${size} gis--empty ${className}`.trim()} aria-hidden>
        <span className="gis-empty-label">{emptyLabel}</span>
      </div>
    )
  }

  if (count === 1) {
    return (
      <div className={`gis gis--${size} ${className}`.trim()}>
        <img className={`gis-img ${imgClassName}`.trim()} src={images[0]} alt={alt} loading="lazy" />
      </div>
    )
  }

  return (
    <div
      className={`gis gis--${size} gis--multi ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClickCapture={onClickCapture}
    >
      <div
        ref={trackRef}
        className="gis-track"
        role="region"
        aria-roledescription="carousel"
        aria-label="開團照片"
      >
        {images.map((url, i) => (
          <div key={`${i}-${url.slice(0, 32)}`} className="gis-slide">
            <img
              className={`gis-img ${imgClassName}`.trim()}
              src={url}
              alt={alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="gis-nav gis-nav--prev"
        aria-label="上一張"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          goTo(index - 1)
        }}
        disabled={index <= 0}
      >
        <ChevronLeft className="gis-nav-icon" aria-hidden />
      </button>
      <button
        type="button"
        className="gis-nav gis-nav--next"
        aria-label="下一張"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          goTo(index + 1)
        }}
        disabled={index >= count - 1}
      >
        <ChevronRight className="gis-nav-icon" aria-hidden />
      </button>

      <div className="gis-dots" role="tablist" aria-label="照片頁碼">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`第 ${i + 1} 張`}
            className={'gis-dot' + (i === index ? ' is-active' : '')}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goTo(i)
            }}
          />
        ))}
      </div>
      <span className="gis-count" aria-hidden>
        {index + 1}/{count}
      </span>
    </div>
  )
}
