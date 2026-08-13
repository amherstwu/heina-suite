/**
 * Vite `base` → React Router `basename`（僅當為子路徑時非空）。
 * `base: './'` 時常為 `./` 或 `/`，此時不設 basename。
 */
export function viteAppBasename(): string | undefined {
  const raw = import.meta.env.BASE_URL ?? '/'
  if (raw === './' || raw === '/' || raw === '' || raw === '.') return undefined
  const normalized = raw.startsWith('/') ? raw : `/${raw}`
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

/** 從 location.pathname 去掉 basename，供 path→hash 白名單比對 */
export function stripViteBasename(pathname: string, base: string | undefined): string {
  if (!base) return pathname
  if (pathname === base || pathname === `${base}/`) return '/'
  if (pathname.startsWith(`${base}/`)) {
    const rest = pathname.slice(base.length)
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  return pathname
}
