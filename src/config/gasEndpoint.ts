/** Apps Script Web App URL (`.../exec`). Set at build time with VITE_GAS_URL. */
export function gasWebAppUrl(): string {
  const raw = String(import.meta.env.VITE_GAS_URL || '').trim()
  return raw.replace(/\/+$/, '')
}

export function hasRemoteGas(): boolean {
  return /^https:\/\//i.test(gasWebAppUrl())
}
