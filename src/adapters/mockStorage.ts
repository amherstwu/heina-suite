const KEYS = {
  groupbuy: 'heina_suite_gb_v1',
  ledger: 'heina_suite_ledger_v1',
  preorder: 'heina_suite_preorder_v1',
  storefrontCatalog: 'heina.storefront.catalog',
} as const

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    const name = e instanceof DOMException ? e.name : ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      throw new Error('本機儲存空間不足（圖片過大）。請減少張數、改用較小圖，或貼外部圖片連結後再存。')
    }
    throw e
  }
}

export { KEYS }
