import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MonitorSmartphone, Smartphone, X } from 'lucide-react'
import { Btn, Card, PageHeader } from '../components/ui'
import { cx } from '../components/app/cx'
import { StaffLookupMemberPreview } from './staffLookup/StaffLookupMemberPreview'
import { useDaigouStore } from '../daigou/store'

type Device = 'desktop' | 'mobile'

export function AdminCustomerPreviewPage() {
  const customers = useDaigouStore((s) => s.customers)
  const orders = useDaigouStore((s) => s.orders)
  const groups = useDaigouStore((s) => s.groups)

  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  const [device, setDevice] = useState<Device>('desktop')
  const [customerId, setCustomerId] = useState(() => customers[0]?.id ?? '')

  const selected = customers.find((c) => c.id === customerId) ?? customers[0]
  const previewOrders = useMemo(() => {
    if (!selected) return []
    return orders.filter((o) => o.customerId === selected.id).slice(0, 40)
  }, [orders, selected])

  const lineName = selected?.lineDisplayName ?? '（請選擇客戶）'

  return (
    <div className="space-y-4">
      <PageHeader
        title="前台預覽"
        subtitle="在後台內嵌預覽顧客查單相關版面，不會切換到公開網址，也不會送出真實查詢請求。"
        action={
          <Btn variant="secondary" to="/nickname-search">
            返回暱稱查單
          </Btn>
        }
      />

      <Card className="!overflow-visible !p-0">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] bg-ds-primary/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-ds-text">前台預覽模式</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-ds-text-secondary">
              你正在以後台預覽模式查看顧客查單頁。這不會切換到公開前台，也不會送出真實資料。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-meta font-semibold text-ds-text-secondary">裝置</span>
            <div className="flex rounded-lg border border-white/[0.1] bg-ds-card/50 p-0.5">
              <button
                type="button"
                aria-label="桌機預覽"
                aria-pressed={device === 'desktop'}
                className={cx(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  device === 'desktop' ? 'bg-ds-primary/25 text-ds-text' : 'text-ds-text-secondary hover:bg-white/[0.06]',
                )}
                onClick={() => setDevice('desktop')}
              >
                <MonitorSmartphone className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                桌機
              </button>
              <button
                type="button"
                aria-label="手機預覽"
                aria-pressed={device === 'mobile'}
                className={cx(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  device === 'mobile' ? 'bg-ds-primary/25 text-ds-text' : 'text-ds-text-secondary hover:bg-white/[0.06]',
                )}
                onClick={() => setDevice('mobile')}
              >
                <Smartphone className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                手機
              </button>
            </div>
            <label className="flex items-center gap-2 text-meta font-semibold text-ds-text-secondary">
              示範客戶
              <select
                className="rounded-lg border border-white/[0.1] bg-ds-surface px-2 py-1.5 text-sm text-ds-text"
                value={customerId || selected?.id || ''}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.slice(0, 80).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.lineDisplayName || c.name}
                  </option>
                ))}
              </select>
            </label>
            <Btn variant="ghost" to="/dashboard" className="!min-h-9 !px-2" aria-label="關閉預覽並回總覽">
              <X className="h-4 w-4" />
              關閉
            </Btn>
          </div>
        </div>

        <div className={cx('p-4 md:p-6', device === 'mobile' && 'flex justify-center bg-ds-surface/50')}>
          <div
            className={cx(
              'overflow-hidden transition-[max-width,box-shadow] duration-300',
              device === 'mobile'
                ? 'w-full max-w-[390px] rounded-[2rem] border-[10px] border-zinc-800 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.55)]'
                : 'w-full max-w-none rounded-2xl border border-white/[0.08] bg-black/20 shadow-inner',
            )}
          >
            {previewOrders.length === 0 ? (
              <div className="p-8 text-center text-body text-ds-text-secondary">此客戶尚無訂單可預覽，請換一位示範客戶。</div>
            ) : (
              <StaffLookupMemberPreview lineDisplayName={lineName} orders={previewOrders} groupsById={groupsById} />
            )}
          </div>
        </div>
        <p className="border-t border-white/[0.06] px-4 py-3 text-center text-meta text-ds-text-muted">
          公開查單中心網址給客人使用：
          <Link className="ml-1 font-semibold text-ds-primary hover:underline" to="/lookup" target="_blank" rel="noreferrer">
            開啟顧客查單（新分頁）
          </Link>
        </p>
      </Card>
    </div>
  )
}
