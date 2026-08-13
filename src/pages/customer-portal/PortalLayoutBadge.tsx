import type { PortalEffectiveLayout } from './portalLayoutPreference'

export function PortalLayoutBadge({ layout }: { layout: PortalEffectiveLayout }) {
  const isDesktop = layout === 'desktop'
  return (
    <span
      className={'kp-layout-badge' + (isDesktop ? ' kp-layout-badge--desktop' : ' kp-layout-badge--mobile')}
      aria-hidden
    >
      {isDesktop ? '電腦版' : '手機版'}
    </span>
  )
}
