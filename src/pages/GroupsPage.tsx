import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Card, Btn, PageHeader, Chip, Empty } from '../components/ui'
import { GroupSetupModal, type GroupSetupFormValues } from '../components/groups/GroupSetupModal'
import { DataRowCard } from '../components/app/DataRowCard'
import { useDaigouStore } from '../daigou/store'
import { ALL_GROUP_STATUSES, GROUP_STATUS_LABEL } from '../daigou/constants'
import type { GroupStatus } from '../daigou/types'
import { downloadCsv } from '../daigou/csv'

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function chipTone(st: GroupStatus): 'neutral' | 'ok' | 'warn' | 'bad' | 'info' {
  if (st === 'open') return 'ok'
  if (st === 'closing_soon') return 'warn'
  if (st === 'waiting_arrival' || st === 'balance_collection' || st === 'arrived' || st === 'sorting') return 'warn'
  if (st === 'international_transit' || st === 'waiting_official_ship') return 'info'
  if (st === 'cancelled') return 'bad'
  if (st === 'completed') return 'ok'
  return 'neutral'
}

function groupPipelineProgress(st: GroupStatus): number {
  if (st === 'cancelled') return 0
  const i = ALL_GROUP_STATUSES.indexOf(st)
  const idx = i < 0 ? 0 : i
  const max = Math.max(1, ALL_GROUP_STATUSES.length - 2)
  return Math.min(100, Math.round((idx / max) * 100))
}

export function GroupsPage() {
  const [searchParams] = useSearchParams()
  const dashClosing = searchParams.get('dash') === 'closing'
  const dashSaleEnd = searchParams.get('dash') === 'sale-end'
  const today = new Date().toISOString().slice(0, 10)
  const groups = useDaigouStore((s) => s.groups)
  const addGroup = useDaigouStore((s) => s.addGroup)
  const defaultExchangeRate = useDaigouStore((s) => s.settings.defaultExchangeRate)
  const addToast = useDaigouStore((s) => s.addToast)
  const [q, setQ] = useState('')
  const [stFilter, setStFilter] = useState<GroupStatus | 'all'>('all')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const okQ = !q || g.name.toLowerCase().includes(q.toLowerCase()) || g.orderNumber.includes(q)
      const okS = stFilter === 'all' || g.status === stFilter
      if (!okQ || !okS) return false
      if (dashClosing) {
        if (g.archived) return false
        if (!['open', 'closing_soon'].includes(g.status)) return false
        const close = g.closingDate
        if (close < today || close > addDaysISO(today, 7)) return false
      }
      if (dashSaleEnd) {
        if (g.archived) return false
        if (!['open', 'closing_soon', 'draft'].includes(g.status)) return false
        const end = String(g.saleEndDate || '').trim()
        if (!end || end < today || end > addDaysISO(today, 7)) return false
      }
      return true
    })
  }, [groups, q, stFilter, dashClosing, dashSaleEnd, today])

  function exportCsv() {
    const rows: (string | number)[][] = [
      [
        '團名',
        '狀態',
        '截團日',
        '販售結束',
        '購買日期',
        '官方出貨',
        '團 JPY 合計',
        '訂單編號',
        '物流編號',
        '信用卡資訊',
      ],
      ...filtered.map((g) => [
        g.name,
        GROUP_STATUS_LABEL[g.status],
        g.closingDate,
        g.saleEndDate,
        g.actualOrderDate || '',
        g.officialShipDate,
        g.jpyAmountTotal,
        g.orderNumber,
        g.logisticsNumber,
        g.internalNotes || '',
      ]),
    ]
    downloadCsv('團務匯出.csv', rows)
    addToast('已匯出團務 CSV', 'ok')
  }

  function submitNew(values: GroupSetupFormValues) {
    if (!values.name.trim()) {
      addToast('請填寫團務名稱', 'err')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    addGroup({
      name: values.name.trim(),
      status: 'draft',
      closingDate: values.closingDate || today,
      saleEndDate: values.saleEndDate || today,
      officialShipDate: values.officialShipDate || today,
      actualOrderDate: values.purchaseDate || undefined,
      exchangeRate: Number(defaultExchangeRate) || 0.22,
      jpyAmountTotal: Number(values.jpyAmountTotal) || 0,
      orderNumber: values.orderNumber.trim() || `JP-${Date.now()}`,
      logisticsNumber: values.logisticsNumber.trim(),
      purchaseLink: values.purchaseLink.trim(),
      notes: '',
      internalNotes: values.cardPayNote.trim(),
    })
    setOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="團務管理"
        subtitle="開團、截團、到貨、收尾款與出貨狀態一目瞭然"
        action={
          <>
            <Btn variant="secondary" onClick={exportCsv}>
              匯出 CSV
            </Btn>
            <Btn onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              新增團
            </Btn>
          </>
        }
      />

      {dashClosing ? (
        <Card className="mb-4 !p-3 text-body text-ds-warning">
          已套用總覽穿透篩選：<span className="font-semibold">7 日內即將截團</span>
          <Link to="/groups" className="ml-3 text-ds-primary underline">
            清除
          </Link>
        </Card>
      ) : null}

      {dashSaleEnd ? (
        <Card className="mb-4 !p-3 text-body text-ds-warning">
          已套用總覽穿透篩選：<span className="font-semibold">7 日內即將結束販賣</span>
          <Link to="/groups" className="ml-3 text-ds-primary underline">
            清除
          </Link>
        </Card>
      ) : null}

      <Card className="mb-6 flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted" />
          <input
            className="w-full rounded-xl border border-white/[0.1] bg-ds-surface py-2.5 pl-10 pr-3 text-body text-ds-text outline-none transition focus:border-ds-primary/45 focus:ring-2 focus:ring-ds-primary/20"
            placeholder="搜尋團名、訂單編號…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-white/[0.1] bg-ds-surface px-3 py-2.5 text-body font-medium text-ds-text"
          value={stFilter}
          onChange={(e) => setStFilter(e.target.value as GroupStatus | 'all')}
        >
          <option value="all">全部狀態</option>
          {ALL_GROUP_STATUSES.map((st) => (
            <option key={st} value={st}>
              {GROUP_STATUS_LABEL[st]}
            </option>
          ))}
        </select>
      </Card>

      {filtered.length === 0 ? (
        <Empty
          title="沒有符合的團務"
          hint="調整篩選或建立一團新的代購。"
          action={<Btn onClick={() => setOpen(true)}>新增團</Btn>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const pct = groupPipelineProgress(g.status)
            return (
              <Link key={g.id} to={`/groups/${g.id}`} className="block">
                <DataRowCard>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-section font-semibold tracking-tight text-ds-text">{g.name}</p>
                      <p className="mt-1 text-meta text-ds-text-muted">
                        截團 {g.closingDate} · JPY {g.jpyAmountTotal.toLocaleString()}
                      </p>
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-meta text-ds-text-muted">
                          <span>團務進度</span>
                          <span className="tabular-nums text-ds-text-secondary">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-ds-primary to-[#8EB7FF] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-meta text-ds-text-muted">時間軸細節請見團務詳情頁</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Chip tone={chipTone(g.status)}>{GROUP_STATUS_LABEL[g.status]}</Chip>
                      {g.archived ? <Chip tone="neutral">已封存</Chip> : null}
                    </div>
                  </div>
                </DataRowCard>
              </Link>
            )
          })}
        </div>
      )}

      <GroupSetupModal open={open} onClose={() => setOpen(false)} onSubmit={submitNew} />
    </div>
  )
}
