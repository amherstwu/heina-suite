/** 銀行帳號安全查詢：共用閘道密碼＋群名登記＋進出紀錄 */

export type BankViewerAccessLog = {
  id: string
  at: number
  /** 客人填寫的群裡名字 */
  customerName: string
  ok: boolean
  reason: 'ok' | 'bad_password' | 'empty_name' | 'disabled' | 'empty_password'
}

export type BankViewerConfig = {
  enabled: boolean
  /**
   * 共用查詢密碼（約每三個月更換）。
   * 儲存／RPC 欄位名用 accessPassword，避免部分環境對 password 欄位處理異常。
   */
  accessPassword: string
  passwordUpdatedAt: number
  /** 銀行帳號說明（多行文字） */
  bankInfo: string
  /** 進出／失敗紀錄（新→舊，有上限） */
  logs: BankViewerAccessLog[]
}

/** 給 getAppData 等公開讀取：不含明文密碼 */
export type BankViewerPublicMeta = {
  enabled: boolean
  passwordSet: boolean
  passwordUpdatedAt: number
  /** 密碼已超過約幾個月（供後台提醒） */
  monthsSincePasswordUpdate: number
}

export const BANK_VIEWER_LOG_LIMIT = 400
export const BANK_VIEWER_PASSWORD_MONTHS = 3

export function defaultBankViewerConfig(): BankViewerConfig {
  return {
    enabled: true,
    accessPassword: '',
    passwordUpdatedAt: 0,
    bankInfo:
      '請向團主索取查詢密碼後於此頁查看匯款帳號。\n\n（後台可編輯實際銀行帳號資訊。正式站密碼放在 Apps Script 指令碼屬性 HEINA_BANK_PASSWORD）',
    logs: [],
  }
}

function pickAccessPassword(raw: Record<string, unknown>, fallback: string): string {
  const candidates = [raw.accessPassword, raw.password]
  for (const c of candidates) {
    if (c == null) continue
    const s = String(c).trim()
    if (s) return s
  }
  return fallback
}

export function normalizeBankViewerConfig(raw: unknown): BankViewerConfig {
  const d = defaultBankViewerConfig()
  if (!raw || typeof raw !== 'object') return d
  const o = raw as Record<string, unknown> & Partial<BankViewerConfig>
  const logs = Array.isArray(o.logs)
    ? o.logs
        .filter((x) => x && typeof x === 'object')
        .map((x) => {
          const row = x as Partial<BankViewerAccessLog>
          return {
            id: String(row.id || `bl_${Date.now()}`),
            at: Number(row.at) || Date.now(),
            customerName: String(row.customerName || '').trim(),
            ok: Boolean(row.ok),
            reason: (row.reason as BankViewerAccessLog['reason']) || (row.ok ? 'ok' : 'bad_password'),
          } satisfies BankViewerAccessLog
        })
        .slice(0, BANK_VIEWER_LOG_LIMIT)
    : []
  return {
    enabled: o.enabled !== false,
    accessPassword: pickAccessPassword(o, d.accessPassword),
    passwordUpdatedAt: Number(o.passwordUpdatedAt) || d.passwordUpdatedAt,
    bankInfo: String(o.bankInfo ?? d.bankInfo),
    logs,
  }
}

export function monthsSince(ts: number, now = Date.now()): number {
  const ms = Math.max(0, now - (Number(ts) || 0))
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4375))
}

export function toBankViewerPublicMeta(cfg: BankViewerConfig): BankViewerPublicMeta {
  return {
    enabled: cfg.enabled,
    passwordSet: Boolean(String(cfg.accessPassword || '').trim()),
    passwordUpdatedAt: cfg.passwordUpdatedAt,
    monthsSincePasswordUpdate: monthsSince(cfg.passwordUpdatedAt),
  }
}

/** 從 getAppData 剝除明文密碼 */
export function stripBankViewerForPublic(
  cfg: BankViewerConfig | undefined,
): BankViewerPublicMeta | undefined {
  if (!cfg) return undefined
  return toBankViewerPublicMeta(normalizeBankViewerConfig(cfg))
}

export function appendBankViewerLog(
  cfg: BankViewerConfig,
  entry: Omit<BankViewerAccessLog, 'id' | 'at'> & { id?: string; at?: number },
): BankViewerConfig {
  const row: BankViewerAccessLog = {
    id: entry.id || `bl_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    at: entry.at || Date.now(),
    customerName: String(entry.customerName || '').trim(),
    ok: Boolean(entry.ok),
    reason: entry.reason,
  }
  return {
    ...cfg,
    logs: [row, ...(cfg.logs || [])].slice(0, BANK_VIEWER_LOG_LIMIT),
  }
}

export function verifyBankViewerAccess(
  cfg: BankViewerConfig,
  payload: { accessPassword?: string; password?: string; customerName?: string },
): {
  ok: boolean
  message: string
  bankInfo?: string
  nextConfig: BankViewerConfig
} {
  const customerName = String(payload.customerName || '').trim()
  const accessPassword = String(payload.accessPassword ?? payload.password ?? '')

  if (!cfg.enabled) {
    return {
      ok: false,
      message: '目前未開放查詢銀行帳號，請私訊團主。',
      nextConfig: appendBankViewerLog(cfg, {
        customerName,
        ok: false,
        reason: 'disabled',
      }),
    }
  }

  if (!customerName) {
    return {
      ok: false,
      message: '請填寫你在群裡的名字。',
      nextConfig: appendBankViewerLog(cfg, {
        customerName: '',
        ok: false,
        reason: 'empty_name',
      }),
    }
  }

  const want = String(cfg.accessPassword || '')
  if (!want.trim()) {
    return {
      ok: false,
      message: '團主尚未設定查詢密碼，請私訊索取。',
      nextConfig: appendBankViewerLog(cfg, {
        customerName,
        ok: false,
        reason: 'empty_password',
      }),
    }
  }

  if (accessPassword !== want) {
    return {
      ok: false,
      message: '查詢密碼錯誤。請向團主索取最新密碼後再試。',
      nextConfig: appendBankViewerLog(cfg, {
        customerName,
        ok: false,
        reason: 'bad_password',
      }),
    }
  }

  const nextConfig = appendBankViewerLog(cfg, {
    customerName,
    ok: true,
    reason: 'ok',
  })

  return {
    ok: true,
    message: '驗證成功',
    bankInfo: String(cfg.bankInfo || '').trim() || '（尚無銀行帳號資料，請私訊團主）',
    nextConfig,
  }
}

export function mergeBankViewerSave(
  prev: BankViewerConfig,
  patch: {
    enabled?: boolean
    bankInfo?: string
    /** 留空＝不更改密碼 */
    newPassword?: string
    clearLogs?: boolean
  },
): BankViewerConfig {
  const base = normalizeBankViewerConfig(prev)
  const next: BankViewerConfig = {
    ...base,
    enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : base.enabled,
    bankInfo: patch.bankInfo !== undefined ? String(patch.bankInfo) : base.bankInfo,
    logs: patch.clearLogs ? [] : base.logs,
  }
  const np = patch.newPassword !== undefined ? String(patch.newPassword).trim() : ''
  if (np) {
    next.accessPassword = np
    next.passwordUpdatedAt = Date.now()
  }
  if (!String(next.accessPassword || '').trim()) {
    next.accessPassword = base.accessPassword || ''
  }
  return next
}

export function bankViewerLogReasonLabel(reason: BankViewerAccessLog['reason']): string {
  switch (reason) {
    case 'ok':
      return '成功查看'
    case 'bad_password':
      return '密碼錯誤'
    case 'empty_name':
      return '未填群名'
    case 'disabled':
      return '功能關閉'
    case 'empty_password':
      return '未設密碼'
    default:
      return reason
  }
}
