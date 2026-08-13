import { useRef, useState } from 'react'
import { ImagePlus, Link2, Trash2 } from 'lucide-react'
import { compressImageFileToDataUrl } from './compressImageFile'
import './GroupImageGalleryEditor.css'

const MAX_IMAGES = 12

type Props = {
  imageUrls: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function GroupImageGalleryEditor({ imageUrls, onChange, maxImages = MAX_IMAGES }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlDraft, setUrlDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function removeAt(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index))
  }

  function addUrl(raw: string) {
    const url = raw.trim()
    if (!url) return
    if (imageUrls.length >= maxImages) {
      setMsg(`最多 ${maxImages} 張圖片`)
      return
    }
    if (url.startsWith('data:')) {
      setMsg('請貼外部圖片網址（https://），或改用上方「上傳圖片」')
      return
    }
    if (imageUrls.includes(url)) {
      setMsg('此圖片已在列表中')
      return
    }
    onChange([...imageUrls, url])
    setUrlDraft('')
    setMsg('')
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setMsg('')
    const errors: string[] = []
    try {
      const next = [...imageUrls]
      for (const file of Array.from(files)) {
        if (next.length >= maxImages) {
          errors.push(`已達上限 ${maxImages} 張`)
          break
        }
        const looksImage =
          file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)
        if (!looksImage) {
          errors.push(`略過「${file.name}」（非圖片）`)
          continue
        }
        try {
          const dataUrl = await compressImageFileToDataUrl(file)
          if (dataUrl && !next.includes(dataUrl)) next.push(dataUrl)
        } catch (e) {
          errors.push(e instanceof Error ? e.message : `「${file.name}」處理失敗`)
        }
      }
      if (next.length !== imageUrls.length) onChange(next)
      if (errors.length) setMsg(errors.join('；'))
      else if (next.length > imageUrls.length) setMsg('已加入圖片（已自動壓縮以便儲存）')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="group-gallery">
      {imageUrls.length ? (
        <ul className="group-gallery-grid">
          {imageUrls.map((url, index) => (
            <li key={`${index}-${url.slice(0, 32)}`} className="group-gallery-item">
              <img className="group-gallery-thumb" src={url} alt="" loading="lazy" />
              <button
                type="button"
                className="group-gallery-remove"
                aria-label="移除圖片"
                onClick={() => removeAt(index)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="group-gallery-empty">尚未上傳圖片</p>
      )}

      <div className="group-gallery-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/*"
          multiple
          className="group-gallery-file"
          onChange={(e) => void onFilesSelected(e.target.files)}
        />
        <button
          type="button"
          className="group-gallery-btn"
          disabled={busy || imageUrls.length >= maxImages}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={16} />
          {busy ? '壓縮處理中…' : '上傳圖片'}
        </button>
        <div className="group-gallery-url-row">
          <input
            className="group-gallery-url-input"
            placeholder="或貼上圖片網址 https://"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addUrl(urlDraft)
              }
            }}
          />
          <button type="button" className="group-gallery-btn group-gallery-btn--ghost" onClick={() => addUrl(urlDraft)}>
            <Link2 size={16} />
            加入
          </button>
        </div>
      </div>
      {msg ? <p className="group-gallery-msg">{msg}</p> : null}
      <p className="group-gallery-hint">
        最多 {maxImages} 張；上傳會自動壓成可儲存的小圖。超大 AI／截圖也能傳，畫質會略降。iPhone HEIC
        請先轉 JPG，或改貼外部圖片連結。
      </p>
    </div>
  )
}
