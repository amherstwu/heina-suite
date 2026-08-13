import { Monitor, Smartphone } from 'lucide-react'
import type { PortalLayoutMode } from './portalLayoutPreference'

const OPTIONS: { id: PortalLayoutMode; label: string; short: string }[] = [
  { id: 'auto', label: '自動', short: '自動' },
  { id: 'desktop', label: '網站版', short: '網站' },
  { id: 'mobile', label: '手機版', short: '手機' },
]

export function PortalLayoutToggle({
  mode,
  onChange,
  className = '',
}: {
  mode: PortalLayoutMode
  onChange: (m: PortalLayoutMode) => void
  className?: string
}) {
  return (
    <div
      className={'kp-layout-toggle ' + className}
      role="group"
      aria-label="版面模式"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'kp-layout-toggle-btn' + (mode === o.id ? ' is-active' : '')}
          aria-pressed={mode === o.id}
          onClick={() => onChange(o.id)}
          title={o.label}
        >
          {o.id === 'desktop' ? (
            <Monitor size={14} aria-hidden />
          ) : o.id === 'mobile' ? (
            <Smartphone size={14} aria-hidden />
          ) : (
            <span className="kp-layout-toggle-auto" aria-hidden>
              A
            </span>
          )}
          <span className="kp-layout-toggle-label">{o.short}</span>
        </button>
      ))}
    </div>
  )
}
