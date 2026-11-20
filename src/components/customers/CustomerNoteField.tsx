import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import './customerNoteField.css'

type Props = {
  value?: string
  onSave: (next: string) => void
  compact?: boolean
  autoSize?: boolean
  className?: string
}

function fitTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = '0px'
  el.style.height = `${el.scrollHeight}px`
}

export function CustomerNoteField({ value, onSave, compact, autoSize, className }: Props) {
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  useLayoutEffect(() => {
    if (!autoSize) return
    fitTextarea(inputRef.current)
  }, [autoSize, draft])

  function stopCardNav(e: MouseEvent) {
    e.stopPropagation()
  }

  return (
    <label
      className={[
        'customer-note-field',
        compact ? 'customer-note-field--compact' : '',
        autoSize ? 'customer-note-field--autosize' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={stopCardNav}
    >
      <span className="customer-note-field-label">對客備註</span>
      <textarea
        ref={inputRef}
        className="customer-note-field-input"
        rows={autoSize ? 1 : compact ? 2 : 3}
        value={draft}
        placeholder="客人查單或通知時可看到的備註"
        onChange={(e) => {
          setDraft(e.target.value)
          if (autoSize) fitTextarea(e.currentTarget)
        }}
        onBlur={() => {
          const next = draft.trim()
          if (next !== (value ?? '').trim()) onSave(next)
        }}
        onClick={stopCardNav}
      />
    </label>
  )
}
