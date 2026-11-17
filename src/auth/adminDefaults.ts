/**
 * 後台登入鎖定與工作階段預設。
 * 管理密碼不寫在前端。正式站由 Apps Script 指令碼屬性 HEINA_ADMIN_PASSWORD 驗證。
 * 未設定 VITE_GAS_URL 的本機預覽，第一次使用時由管理員自行建立密碼（只存在該瀏覽器）。
 */
export const DEFAULT_ADMIN_SESSION_HOURS = 12
export const DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS = 5
export const DEFAULT_ADMIN_LOGIN_LOCK_MINUTES = 15
