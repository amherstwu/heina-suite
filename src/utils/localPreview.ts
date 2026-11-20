/** 本機 GAS 預覽（127.0.0.1:5280，與 open-local-preview.bat 相同） */
export function isLocalGasPreviewHost(): boolean {
  if (typeof window === 'undefined') return false
  const { hostname, port } = window.location
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') return false
  return port === '5280' || port === ''
}

export function localPreviewHubHref(): string {
  return `${window.location.origin}/preview/`
}
