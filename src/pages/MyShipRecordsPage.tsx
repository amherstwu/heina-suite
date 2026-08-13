import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clipboard, Copy, Search } from 'lucide-react'
import { Card, Btn, PageHeader, Empty } from '../components/ui'
import { DataRowCard } from '../components/app/DataRowCard'
import { StatusBadge } from '../components/app/StatusBadge'
import { useDaigouStore } from '../daigou/store'
import { ALL_MYSHIP_STATUSES } from '../daigou/constants'
import type { MyShipRecord, MyShipStatus } from '../daigou/types'
import { downloadCsv } from '../daigou/csv'
import {
  MYSHIP_OVERDUE_WARN,
  MYSHIP_PICKUP_REMIND,
  MYSHIP_SHIPPED_NOTIFY,
  buildMyShipFormCopy,
  fillMyShipText,
  myShipVarsFromRecord,
} from '../daigou/myShipCopy'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysLeft(deadline?: string) {
  if (!deadline) return null
  const end = new Date(deadline + 'T23:59:59').getTime()
  return Math.ceil((end - Date.now()) / 86400000)
}

function isOverdueRow(r: MyShipRecord) {
  if (!r.pickupDeadline) return false
  if (['已取貨', '已退回', '尚未建立'].includes(r.status)) return false
  if (r.status === '逾期未取') return true
  return r.pickupDeadline < todayISO() && !['已取貨', '已退回'].includes(r.status)
}

function showCountdown(r: MyShipRecord) {
  return (r.status === '已到店' || r.status === '待取貨') && r.pickupDeadline
}

export function MyShipRecordsPage() {
  const [searchParams] = useSearchParams()
  const dash = searchParams.get('dash') ?? ''
  const myShipRecords = useDaigouStore((s) => s.myShipRecords)
  const orders = useDaigouStore((s) => s.orders)
  const customers = useDaigouStore((s) => s.customers)
  const shipmentRecords = useDaigouStore((s) => s.shipmentRecords)
  const batchDeadline = useDaigouStore((s) => s.batchMyShipPickupDeadline)
  const batchArrived = useDaigouStore((s) => s.batchMyShipArrivedStore)
  const batchPicked = useDaigouStore((s) => s.batchMyShipPickedUp)
  const batchOverdue = useDaigouStore((s) => s.batchMyShipOverdue)
  const batchReturned = useDaigouStore((s) => s.batchMyShipReturned)
  const importPaste = useDaigouStore((s) => s.importMyShipPaste)
  const linkMyShip = useDaigouStore((s) => s.linkMyShipToShipment)
  const addToast = useDaigouStore((s) => s.addToast)
  const [q, setQ] = useState('')
  const [st, setSt] = useState<MyShipStatus | 'all'>('all')
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [deadlineInput, setDeadlineInput] = useState('')
  const [paste, setPaste] = useState('')

  const filtered = useMemo(() => {
    return myShipRecords.filter((r) => {
      const cust = customers.find((c) => c.id === r.customerId)
      const o = orders.find((x) => x.id === r.orderId)
      const hay = `${r.id}${r.orderId}${o?.lookupCode ?? ''}${cust?.name ?? ''}${r.receiverStoreName}${r.trackingNo ?? ''}${r.myShipOrderNo ?? ''}`.toLowerCase()
      const okQ = !q || hay.includes(q.toLowerCase())
      const okS = st === 'all' || r.status === st
      if (!okQ || !okS) return false
      if (dash === 'overdue' && !isOverdueRow(r)) return false
      if (dash === 'pickup-soon') {
        const left = daysLeft(r.pickupDeadline)
        if (left == null || left > 4 || left < 0) return false
        if (!['待取貨', '已到店', '運送中'].includes(r.status)) return false
      }
      return true
    })
  }, [myShipRecords, customers, orders, q, st, dash])

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of ALL_MYSHIP_STATUSES) m.set(s, 0)
    for (const r of myShipRecords) m.set(r.status, (m.get(r.status) ?? 0) + 1)
    return m
  }, [myShipRecords])

  const selectedIds = Object.entries(sel).filter(([, v]) => v).map(([k]) => k)

  function toggle(id: string) {
    setSel((s) => ({ ...s, [id]: !s[id] }))
  }

  function orderLookup(r: MyShipRecord) {
    return orders.find((o) => o.id === r.orderId)?.lookupCode ?? r.orderId
  }

  async function copyForm(r: MyShipRecord) {
    await navigator.clipboard.writeText(buildMyShipFormCopy(r, orderLookup(r)))
    addToast('已複製賣貨便資料', 'ok')
  }

  async function copyShipped(r: MyShipRecord) {
    const v = myShipVarsFromRecord(r, orderLookup(r))
    await navigator.clipboard.writeText(fillMyShipText(MYSHIP_SHIPPED_NOTIFY, v))
    addToast('已複製寄件通知', 'ok')
  }

  async function copyPickup(r: MyShipRecord) {
    const v = myShipVarsFromRecord(r, orderLookup(r))
    await navigator.clipboard.writeText(fillMyShipText(MYSHIP_PICKUP_REMIND, v))
    addToast('已複製取貨提醒', 'ok')
  }

  async function copyOverdue(r: MyShipRecord) {
    const v = myShipVarsFromRecord(r, orderLookup(r))
    await navigator.clipboard.writeText(fillMyShipText(MYSHIP_OVERDUE_WARN, v))
    addToast('已複製逾期未取提醒', 'ok')
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      [
        '紀錄ID',
        '訂單ID',
        '查詢碼',
        '出貨紀錄ID',
        '客戶',
        '寄件人',
        '收件人',
        '門市',
        '店號',
        '地址',
        '訂單號',
        '寄件碼',
        '追蹤',
        '運費',
        '代收',
        '付款類型',
        '尺寸',
        '狀態',
        '取貨期限',
        '建立日',
      ],
      ...filtered.map((r) => {
        const o = orders.find((x) => x.id === r.orderId)
        const c = customers.find((x) => x.id === r.customerId)
        return [
          r.id,
          r.orderId,
          o?.lookupCode ?? '',
          r.shipmentId ?? '',
          c?.name ?? '',
          r.senderName,
          r.receiverName,
          r.receiverStoreName,
          r.receiverStoreId,
          r.receiverStoreAddress,
          r.myShipOrderNo ?? '',
          r.myShipShippingCode ?? '',
          r.trackingNo ?? '',
          r.shippingFee,
          r.collectionAmount ?? '',
          r.paymentType,
          r.packageSize,
          r.status,
          r.pickupDeadline ?? '',
          r.createdDate,
        ]
      }),
    ]
    downloadCsv('賣貨便紀錄.csv', rows)
    addToast('已匯出 CSV', 'ok')
  }

  function applyDeadlineBatch() {
    if (!deadlineInput) {
      addToast('請選擇期限日期', 'err')
      return
    }
    batchDeadline(selectedIds, deadlineInput)
  }

  function linkFirstShipment(r: MyShipRecord) {
    const sr = shipmentRecords.find((x) => x.orderId === r.orderId)
    if (!sr) {
      addToast('此訂單尚無出貨紀錄可連結', 'err')
      return
    }
    linkMyShip(r.id, sr.id)
  }

  return (
    <div>
      <PageHeader
        title="賣貨便紀錄"
        subtitle="7-ELEVEN MyShip／賣貨便專用：門市、期限、批次狀態與一鍵複製"
        action={
          <Btn variant="secondary" onClick={exportCsv}>
            匯出 CSV
          </Btn>
        }
      />

      {dash ? (
        <Card className="mb-4 !p-3 text-sm text-amber-800">
          已套用總覽穿透篩選：
          {dash === 'overdue' ? '逾期／將逾期包裹' : dash === 'pickup-soon' ? '即將到期取貨' : dash}
          <Link to="/myship-records" className="ml-3 font-semibold text-indigo-700 underline">
            清除
          </Link>
        </Card>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ALL_MYSHIP_STATUSES.slice(0, 7).map((k) => (
          <Card key={k} className="!p-3">
            <p className="line-clamp-2 text-[10px] font-semibold text-zinc-500">{k}</p>
            <p className="text-lg font-bold text-zinc-900">{statusCounts.get(k) ?? 0}</p>
          </Card>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ALL_MYSHIP_STATUSES.slice(7).map((k) => (
          <Card key={k} className="!p-3">
            <p className="line-clamp-2 text-[10px] font-semibold text-zinc-500">{k}</p>
            <p className="text-lg font-bold text-zinc-900">{statusCounts.get(k) ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 flex flex-wrap gap-2">
        <input
          type="date"
          className="rounded-xl border border-zinc-200 px-2 py-2 text-sm"
          value={deadlineInput}
          onChange={(e) => setDeadlineInput(e.target.value)}
        />
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={applyDeadlineBatch}>
          批次更新取貨期限
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => batchArrived(selectedIds)}>
          批次已到店
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => batchPicked(selectedIds)}>
          批次已取貨
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => batchOverdue(selectedIds)}>
          批次逾期未取
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => batchReturned(selectedIds)}>
          批次已退回
        </Btn>
      </Card>

      <Card className="mb-6 !p-4">
        <p className="text-meta font-semibold text-ds-text-secondary">貼上更新（CSV／TSV）</p>
        <p className="mt-1 text-meta leading-relaxed text-ds-text-muted">
          第一列可含表頭。資料欄：<code className="rounded-md bg-ds-surface-raised px-1.5 py-0.5 text-ds-text-secondary">id</code>、
          <code className="rounded-md bg-ds-surface-raised px-1.5 py-0.5 text-ds-text-secondary">trackingNo</code>、
          <code className="rounded-md bg-ds-surface-raised px-1.5 py-0.5 text-ds-text-secondary">status</code>、
          <code className="rounded-md bg-ds-surface-raised px-1.5 py-0.5 text-ds-text-secondary">pickupDeadline</code>、
          <code className="rounded-md bg-ds-surface-raised px-1.5 py-0.5 text-ds-text-secondary">myShipOrderNo</code>、
          <code className="rounded-md bg-ds-surface-raised px-1.5 py-0.5 text-ds-text-secondary">myShipShippingCode</code>（逗號或 Tab 分隔）
        </p>
        <textarea className="mt-2 w-full font-mono text-meta" rows={4} placeholder={`my1\tTW991000\t已寄件\t2026-05-10`} value={paste} onChange={(e) => setPaste(e.target.value)} />
        <Btn variant="secondary" className="mt-2" onClick={() => importPaste(paste)}>
          套用貼上內容
        </Btn>
      </Card>

      <Card className="mb-6 !p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted" />
          <input
            className="w-full py-2.5 pl-10 pr-3"
            placeholder="搜尋訂單、客戶、門市、追蹤碼…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="mt-3 w-full sm:max-w-xs" value={st} onChange={(e) => setSt(e.target.value as MyShipStatus | 'all')}>
          <option value="all">全部狀態</option>
          {ALL_MYSHIP_STATUSES.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Card>

      {filtered.length === 0 ? (
        <Empty title="沒有賣貨便紀錄" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const overdue = isOverdueRow(r)
            const dleft = daysLeft(r.pickupDeadline)
            const cd = showCountdown(r)
            const warnSoon = !overdue && cd && dleft != null && dleft <= 2
            return (
              <DataRowCard
                key={r.id}
                clickable={false}
                glow={overdue ? 'danger' : warnSoon ? 'warning' : 'none'}
                pulse={overdue}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/20" checked={!!sel[r.id]} onChange={() => toggle(r.id)} />
                    <Link className="font-mono text-sm font-bold text-ds-primary hover:text-ds-highlight hover:underline" to={`/orders/${r.orderId}`}>
                      {orderLookup(r)}
                    </Link>
                    {overdue ? (
                      <StatusBadge tone="bad" icon={AlertTriangle}>
                        逾期未取
                      </StatusBadge>
                    ) : null}
                    <StatusBadge tone="info">{r.status}</StatusBadge>
                  </div>
                  <div className="text-right text-meta text-ds-text-muted">
                    <div>
                      取貨期限 <span className="font-semibold text-ds-text">{r.pickupDeadline ?? '—'}</span>
                    </div>
                    {cd && dleft != null ? (
                      <div
                        className={`mt-1 inline-flex min-h-8 items-center justify-end rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                          dleft <= 0
                            ? 'bg-ds-danger/15 text-ds-danger ring-ds-danger/40'
                            : dleft <= 2
                              ? 'bg-ds-warning/15 text-ds-warning ring-ds-warning/40'
                              : 'bg-ds-success/10 text-ds-success ring-ds-success/30'
                        }`}
                      >
                        剩 {dleft} 天
                      </div>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-body font-semibold text-ds-text">{r.receiverStoreName}</p>
                <p className="text-meta text-ds-text-secondary">
                  店號 {r.receiverStoreId} · {r.receiverStoreAddress}
                </p>
                <p className="mt-1 text-meta text-ds-text-muted">
                  追蹤 {r.trackingNo ?? '—'} · 運費 {r.shippingFee} · 代收 {r.collectionAmount ?? 0} · {r.paymentType} · {r.packageSize}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                  <Btn variant="secondary" className="!min-h-11 !py-2 text-xs" onClick={() => copyForm(r)}>
                    <Copy className="h-3.5 w-3.5" />
                    複製賣貨便資料
                  </Btn>
                  <Btn variant="secondary" className="!min-h-11 !py-2 text-xs" onClick={() => copyShipped(r)}>
                    <Clipboard className="h-3.5 w-3.5" />
                    複製寄件通知
                  </Btn>
                  <Btn variant="secondary" className="!min-h-11 !py-2 text-xs" onClick={() => copyPickup(r)}>
                    複製取貨提醒
                  </Btn>
                  <Btn variant="secondary" className="!min-h-11 !py-2 text-xs" onClick={() => copyOverdue(r)}>
                    複製逾期未取提醒
                  </Btn>
                  {!r.shipmentId ? (
                    <Btn variant="ghost" className="!min-h-11 !py-2 text-xs" onClick={() => linkFirstShipment(r)}>
                      連結出貨紀錄
                    </Btn>
                  ) : (
                    <span className="self-center text-meta text-ds-text-muted">已連結 {r.shipmentId}</span>
                  )}
                </div>
              </DataRowCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
