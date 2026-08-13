import { Monitor, Smartphone } from 'lucide-react'
import type { PortalLayoutMode } from '../customer-portal/portalLayoutPreference'

const OPTIONS: { id: PortalLayoutMode; short: string }[] = [
  { id: 'auto', short: '自動' },
  { id: 'desktop', short: '網站' },
  { id: 'mobile', short: '手機' },
]

export function StorefrontLayoutToggle({
  mode,
  onChange,
}: {
  mode: PortalLayoutMode
  onChange: (m: PortalLayoutMode) => void
}) {
  return (
    <div className="sf-layout-toggle" role="group" aria-label="版面模式">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={mode === o.id ? 'is-active' : ''}
          aria-pressed={mode === o.id}
          onClick={() => onChange(o.id)}
          title={o.id === 'desktop' ? '網站版' : o.id === 'mobile' ? '手機版' : '自動'}
        >
          {o.id === 'desktop' ? <Monitor size={14} /> : o.id === 'mobile' ? <Smartphone size={14} /> : 'A'}
          <span>{o.short}</span>
        </button>
      ))}
    </div>
  )
}
