/**
 * 初次安裝預設團主密碼（SHA-256 + pepper，見 adminSession.ts）。
 * 登入後請至「設定 → 安全與防火牆」立即修改。
 */
export const DEFAULT_ADMIN_PASSWORD = 'HeinaOwner2026'

/** 與 hashAdminPassword(DEFAULT_ADMIN_PASSWORD) 一致 */
export const DEFAULT_ADMIN_PASSWORD_HASH =
  'ee020aad8651bcf2db73d0c7dec418e95f9e6a80d20bb44ea0dac14023cdd50d'

export const DEFAULT_ADMIN_SESSION_HOURS = 12
export const DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS = 5
export const DEFAULT_ADMIN_LOGIN_LOCK_MINUTES = 15

export function isDefaultAdminPasswordHash(hash: string | undefined | null): boolean {
  return (hash ?? '').trim() === DEFAULT_ADMIN_PASSWORD_HASH
}
