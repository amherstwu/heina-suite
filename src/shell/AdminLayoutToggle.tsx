import { Monitor, Smartphone } from 'lucide-react'
import type { AdminLayoutMode } from '../layout/adminLayoutPreference'

const OPTIONS: { id: AdminLayoutMode; label: string; short: string }[] = [
  { id: 'auto', label: '自動', short: '自動' },
  { id: 'desktop', label: '網站版', short: '網站' },
  { id: 'mobile', label: '手機版', short: '手機' },
]

export function AdminLayoutToggle({
  mode,
  onChange,
  className = '',
}: {
  mode: AdminLayoutMode
  onChange: (m: AdminLayoutMode) => void
  className?: string
}) {
  return (
    <div className={'admin-layout-toggle ' + className} role="group" aria-label="後台版面模式">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'admin-layout-toggle-btn' + (mode === o.id ? ' is-active' : '')}
          aria-pressed={mode === o.id}
          onClick={() => onChange(o.id)}
          title={o.label}
        >
          {o.id === 'desktop' ? (
            <Monitor size={14} aria-hidden />
          ) : o.id === 'mobile' ? (
            <Smartphone size={14} aria-hidden />
          ) : (
            <span className="admin-layout-toggle-auto" aria-hidden>
              A
            </span>
          )}
          <span>{o.short}</span>
        </button>
      ))}
    </div>
  )
}
