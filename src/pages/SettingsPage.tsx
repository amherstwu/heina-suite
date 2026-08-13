import { useState, useEffect } from 'react'

import { Palette, Shield } from 'lucide-react'
import { Card, Btn, PageHeader } from '../components/ui'
import { PageGrid, Col } from '../components/app/PageLayout'
import { cx } from '../components/app/cx'
import { useDaigouStore } from '../daigou/store'
import { mockApi } from '../daigou/store'
import { COLOR_PRESET_OPTIONS, THEME_PRESETS } from '../daigou/themePresets'
import { clearAdminSession, hashAdminPassword } from '../auth/adminSession'
import {
  DEFAULT_ADMIN_LOGIN_LOCK_MINUTES,
  DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS,
  DEFAULT_ADMIN_SESSION_HOURS,
  isDefaultAdminPasswordHash,
} from '../auth/adminDefaults'
import { clearLoginLock } from '../auth/adminFirewall'

function normalizeHex(v: string | undefined, fallback: string): string {
  const t = (v || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t
  return fallback
}

const field =
  'mt-1.5 w-full rounded-xl border border-[color:var(--ds-chrome-border)] bg-ds-surface-raised/70 px-3 py-2.5 text-body text-ds-text outline-none transition placeholder:text-ds-text-muted focus:border-ds-primary/45 focus:ring-2 focus:ring-ds-primary/15'

const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.14em] text-ds-text-muted'

export function SettingsPage() {
  const settings = useDaigouStore((s) => s.settings)
  const addToast = useDaigouStore((s) => s.addToast)
  const [local, setLocal] = useState(settings)
  const [adminPwdNew, setAdminPwdNew] = useState('')
  const [adminPwdNew2, setAdminPwdNew2] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  function saveAppearanceAndSecurity() {
    mockApi.saveSettings({
      ...local,
      // 密碼改由下方「確認修改密碼」單獨處理，避免誤觸儲存改到密碼
      adminPasswordHash: settings.adminPasswordHash,
    })
  }

  async function confirmPasswordChange() {
    if (!adminPwdNew.trim()) {
      addToast('請輸入新密碼', 'err')
      return
    }
    if (adminPwdNew.length < 6) {
      addToast('管理密碼至少 6 字元', 'err')
      return
    }
    if (adminPwdNew !== adminPwdNew2) {
      addToast('兩次管理密碼不一致', 'err')
      return
    }
    if (!window.confirm('確定要修改後台管理密碼？修改後需重新登入。')) return

    setPwdBusy(true)
    try {
      const hash = await hashAdminPassword(adminPwdNew.trim())
      mockApi.saveSettings({
        ...local,
        adminPasswordHash: hash,
      })
      setAdminPwdNew('')
      setAdminPwdNew2('')
      clearAdminSession()
      clearLoginLock()
      addToast('已更新管理密碼，請重新登入後台', 'info')
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="設定"
        subtitle="安全與外觀；變更後請儲存。"
        action={
          <>
            <Btn variant="secondary" to="/integrations">
              工具中心
            </Btn>
            <Btn onClick={() => saveAppearanceAndSecurity()}>儲存設定</Btn>
          </>
        }
      />

      <PageGrid>
        <Col span={6}>
          <Card className="!p-5 md:!p-6" hover={false} animateEnter={false}>
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <Shield className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-section font-semibold tracking-tight text-ds-text">安全與防火牆</h2>
                <p className="mt-0.5 text-meta leading-relaxed text-ds-text-secondary">
                  後台密碼、登入鎖定與工作階段；顧客查詢不受影響。
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-ds-surface-raised/30 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20"
                  checked={local.adminAuthEnabled !== false}
                  onChange={(e) => setLocal((s) => ({ ...s, adminAuthEnabled: e.target.checked }))}
                />
                <span className="text-sm text-ds-text">啟用後台密碼閘道（關閉後任何人可進管理區，僅限本機除錯）</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-meta font-semibold text-ds-text-secondary">登入有效（小時）</span>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    className={field}
                    value={local.adminSessionHours ?? DEFAULT_ADMIN_SESSION_HOURS}
                    onChange={(e) =>
                      setLocal((s) => ({
                        ...s,
                        adminSessionHours: Math.max(1, Math.min(168, Number(e.target.value) || 12)),
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-meta font-semibold text-ds-text-secondary">錯誤次數鎖定</span>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    className={field}
                    value={local.adminLoginMaxAttempts ?? DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS}
                    onChange={(e) =>
                      setLocal((s) => ({
                        ...s,
                        adminLoginMaxAttempts: Math.max(3, Math.min(20, Number(e.target.value) || 5)),
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-meta font-semibold text-ds-text-secondary">鎖定（分鐘）</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className={field}
                    value={local.adminLoginLockMinutes ?? DEFAULT_ADMIN_LOGIN_LOCK_MINUTES}
                    onChange={(e) =>
                      setLocal((s) => ({
                        ...s,
                        adminLoginLockMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 15)),
                      }))
                    }
                  />
                </label>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-ds-surface/40 p-4">
                <p className={sectionTitle}>變更管理密碼</p>
                {isDefaultAdminPasswordHash(local.adminPasswordHash) ? (
                  <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
                    仍使用系統預設密碼，建議立即修改。
                  </p>
                ) : null}
                <label className="mt-3 block">
                  <span className="text-meta font-semibold text-ds-text-secondary">新密碼（至少 6 字元）</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={field}
                    value={adminPwdNew}
                    onChange={(e) => setAdminPwdNew(e.target.value)}
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-meta font-semibold text-ds-text-secondary">再輸入一次確認</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={field}
                    value={adminPwdNew2}
                    onChange={(e) => setAdminPwdNew2(e.target.value)}
                  />
                </label>
                <Btn
                  className="mt-4 w-full sm:w-auto"
                  disabled={pwdBusy || !adminPwdNew.trim()}
                  onClick={() => void confirmPasswordChange()}
                >
                  {pwdBusy ? '處理中…' : '確認修改密碼'}
                </Btn>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                <Btn onClick={() => saveAppearanceAndSecurity()}>儲存設定</Btn>
              </div>

              <p className="text-[11px] leading-relaxed text-ds-text-muted">
                「儲存設定」只存閘道與外觀；改密碼請按「確認修改密碼」。GAS 公開網址仍建議搭配 Cloudflare Access 或 IP
                白名單。
              </p>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="!p-5 md:!p-6" hover={false} animateEnter={false}>
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ds-primary/15 text-ds-primary">
                <Palette className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-section font-semibold tracking-tight text-ds-text">外觀與配色</h2>
                <p className="mt-0.5 text-meta leading-relaxed text-ds-text-secondary">淺／深色底＋十組馬卡龍配色，即時套用到導覽與背景。</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <p className={sectionTitle}>介面亮度</p>
              <div className="flex rounded-xl border border-white/[0.08] bg-ds-surface/80 p-1">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLocal((s) => ({ ...s, theme: t }))}
                    className={cx(
                      'flex-1 rounded-lg py-2.5 text-sm font-semibold transition touch-manipulation',
                      local.theme === t
                        ? 'bg-ds-primary/18 text-ds-text shadow-[0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-ds-primary/25'
                        : 'text-ds-text-muted hover:text-ds-text-secondary',
                    )}
                  >
                    {t === 'light' ? '淺色' : '深色'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className={sectionTitle}>馬卡龍配色（10 組）</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COLOR_PRESET_OPTIONS.map((row) => {
                  const acc = THEME_PRESETS[row.id]
                  const active = local.colorPreset === row.id
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setLocal((s) => ({ ...s, colorPreset: row.id }))}
                      className={cx(
                        'flex flex-col gap-2 rounded-xl border p-3 text-left transition touch-manipulation',
                        active
                          ? 'border-ds-primary/45 bg-ds-primary/10 ring-2 ring-ds-primary/25 shadow-[0_0_24px_color-mix(in_srgb,var(--color-ds-primary)_12%,transparent)]'
                          : 'border-white/[0.08] bg-ds-surface-raised/35 hover:border-ds-primary/20 hover:bg-ds-surface-raised/55',
                      )}
                    >
                      <span className="flex h-2 w-full overflow-hidden rounded-full ring-1 ring-white/10">
                        <span className="h-full min-w-0 flex-1" style={{ background: acc.primary }} />
                        <span className="h-full min-w-0 flex-1" style={{ background: acc.secondary }} />
                        <span className="h-full min-w-0 flex-1" style={{ background: acc.highlight }} />
                      </span>
                      <span className="text-xs font-semibold leading-tight text-ds-text">{row.label}</span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setLocal((s) => ({ ...s, colorPreset: 'custom' }))}
                className={cx(
                  'mt-1 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition touch-manipulation',
                  local.colorPreset === 'custom'
                    ? 'border-ds-primary/45 bg-ds-primary/10 text-ds-text ring-2 ring-ds-primary/25'
                    : 'border-dashed border-white/[0.14] bg-ds-surface/40 text-ds-text-secondary hover:border-ds-primary/30 hover:text-ds-text',
                )}
              >
                自訂三色（Hex）
              </button>
            </div>

            {local.colorPreset === 'custom' ? (
              <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
                <p className={sectionTitle}>自訂色票</p>
                <div className="grid gap-3 sm:grid-cols-1">
                  {(
                    [
                      ['accentPrimary', '主色', THEME_PRESETS.default.primary],
                      ['accentSecondary', '輔色', THEME_PRESETS.default.secondary],
                      ['accentHighlight', '亮點', THEME_PRESETS.default.highlight],
                    ] as const
                  ).map(([key, label, fb]) => (
                    <label key={key} className="block min-w-0">
                      <span className="text-meta font-semibold text-ds-text-secondary">{label}</span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={`${label} 色票`}
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/[0.1] bg-ds-surface p-1"
                          value={normalizeHex(local[key], fb)}
                          onChange={(e) => setLocal((s) => ({ ...s, [key]: e.target.value }))}
                        />
                        <input
                          type="text"
                          spellCheck={false}
                          placeholder={fb}
                          className={cx(field, 'mt-0 flex-1 font-mono text-meta')}
                          value={local[key] ?? ''}
                          onChange={(e) => setLocal((s) => ({ ...s, [key]: e.target.value }))}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </Col>
      </PageGrid>
    </div>
  )
}
