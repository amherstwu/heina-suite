import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clipboard, Package, Search, Truck } from 'lucide-react'
import { Card, Btn, PageHeader, Chip, Modal, Empty } from '../components/ui'
import { useDaigouStore } from '../daigou/store'
import { ALL_SHIPMENT_RECORD_STATUSES } from '../daigou/constants'
import type { ShipmentRecord, ShipmentRecordStatus } from '../daigou/types'
import { downloadCsv } from '../daigou/csv'
import { getShipmentTimelineSteps } from '../daigou/shipmentRecordTimeline'

function initialShipmentFilters(searchParams: URLSearchParams) {
  const qRaw = searchParams.get('q') ?? ''
  const d = searchParams.get('dash')
  const statusFromUrl =
    d === 'status' && qRaw && ALL_SHIPMENT_RECORD_STATUSES.includes(qRaw as ShipmentRecordStatus)
      ? (qRaw as ShipmentRecordStatus)
      : ('all' as const)
  /** 儀表板用 q=狀態中文時只套狀態篩選，不把同一字串當全文搜尋（hay 不含狀態會誤篩成 0 筆） */
  const q = d === 'status' && statusFromUrl !== 'all' ? '' : qRaw
  return { q, st: statusFromUrl }
}

export function ShipmentRecordsPage() {
  const [searchParams] = useSearchParams()
  const searchKey = searchParams.toString()
  const shipmentRecords = useDaigouStore((s) => s.shipmentRecords)
  const orders = useDaigouStore((s) => s.orders)
  const customers = useDaigouStore((s) => s.customers)
  const groups = useDaigouStore((s) => s.groups)
  const batchPacked = useDaigouStore((s) => s.batchShipmentRecordsPacked)
  const batchShipped = useDaigouStore((s) => s.batchShipmentRecordsShipped)
  const batchTracking = useDaigouStore((s) => s.batchShipmentRecordsTracking)
  const createFromOrders = useDaigouStore((s) => s.createShipmentRecordsFromOrders)
  const addToast = useDaigouStore((s) => s.addToast)
  const [q, setQ] = useState(() => initialShipmentFilters(searchParams).q)
  const [st, setSt] = useState<ShipmentRecordStatus | 'all'>(() => initialShipmentFilters(searchParams).st)
  const [gid, setGid] = useState<string | 'all'>('all')
  const [method, setMethod] = useState<string | 'all'>('all')
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [timelineRec, setTimelineRec] = useState<ShipmentRecord | null>(null)
  const [trackOpen, setTrackOpen] = useState(false)
  const [trackNo, setTrackNo] = useState('')
  const [orderPickOpen, setOrderPickOpen] = useState(false)
  const [orderPick, setOrderPick] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const init = initialShipmentFilters(new URLSearchParams(searchKey))
    setQ(init.q)
    setSt(init.st)
  }, [searchKey])

  const filtered = useMemo(() => {
    return shipmentRecords.filter((r) => {
      const cust = customers.find((c) => c.id === r.customerId)
      const o = orders.find((x) => x.id === r.orderId)
      const hay = `${r.id}${r.orderId}${o?.lookupCode ?? ''}${cust?.name ?? ''}${cust?.lineDisplayName ?? ''}${r.trackingNo ?? ''}`.toLowerCase()
      const okQ = !q || hay.includes(q.toLowerCase())
      const okS = st === 'all' || r.status === st
      const okG = gid === 'all' || r.groupId === gid
      const okM = method === 'all' || r.shippingMethod === method
      return okQ && okS && okG && okM
    })
  }, [shipmentRecords, orders, customers, q, st, gid, method])

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of ALL_SHIPMENT_RECORD_STATUSES) m.set(s, 0)
    for (const r of shipmentRecords) m.set(r.status, (m.get(r.status) ?? 0) + 1)
    return m
  }, [shipmentRecords])

  const selectedIds = Object.entries(sel).filter(([, v]) => v).map(([k]) => k)
  const methods = useMemo(() => ['all', ...new Set(shipmentRecords.map((r) => r.shippingMethod))], [shipmentRecords])

  function toggle(id: string) {
    setSel((s) => ({ ...s, [id]: !s[id] }))
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      [
        '出貨紀錄ID',
        '訂單ID',
        '查詢碼',
        '客戶',
        '團ID',
        '方式',
        '物流',
        '追蹤碼',
        '件數',
        '重量',
        '運費',
        '包材費',
        '狀態',
        '收件人',
        '電話',
        '地址',
        '門市',
        '店號',
        '寄出日',
        '送達日',
        '備註',
        '建立',
        '更新',
      ],
      ...filtered.map((r) => {
        const o = orders.find((x) => x.id === r.orderId)
        const c = customers.find((x) => x.id === r.customerId)
        return [
          r.id,
          r.orderId,
          o?.lookupCode ?? '',
          c?.name ?? '',
          r.groupId ?? '',
          r.shippingMethod,
          r.carrier,
          r.trackingNo ?? '',
          r.packageCount,
          r.packageWeight ?? '',
          r.shippingFee,
          r.packagingFee ?? '',
          r.status,
          r.receiverName,
          r.receiverPhone,
          r.receiverAddress ?? '',
          r.receiverStoreName ?? '',
          r.receiverStoreId ?? '',
          r.shippedAt ?? '',
          r.deliveredAt ?? '',
          r.notes ?? '',
          r.createdAt,
          r.updatedAt,
        ]
      }),
    ]
    downloadCsv('出貨紀錄.csv', rows)
    addToast('已匯出 CSV', 'ok')
  }

  async function copyNotify() {
    const r = filtered.find((x) => sel[x.id])
    if (!r) {
      addToast('請先勾選一筆', 'err')
      return
    }
    const c = customers.find((x) => x.id === r.customerId)
    const o = orders.find((x) => x.id === r.orderId)
    const text = `${c?.name ?? '您好'}，您的訂單 ${o?.lookupCode ?? r.orderId} 已安排出貨（${r.shippingMethod}／${r.carrier}）。追蹤編號：${r.trackingNo ?? '待補'}。若為超商取件請留意簡訊與取貨期限。`
    await navigator.clipboard.writeText(text)
    addToast('已複製寄件通知', 'ok')
  }

  function applyTracking() {
    if (!trackNo.trim()) {
      addToast('請輸入追蹤碼', 'err')
      return
    }
    batchTracking(selectedIds, trackNo.trim())
    setTrackOpen(false)
    setTrackNo('')
  }

  function submitOrderBatch() {
    const ids = Object.entries(orderPick).filter(([, v]) => v).map(([k]) => k)
    createFromOrders(ids)
    setOrderPickOpen(false)
    setOrderPick({})
  }

  return (
    <div>
      <PageHeader
        title="出貨紀錄"
        subtitle="完整物流歷程、批次作業與時間軸檢視（與舊版「出貨」並存）"
        action={
          <>
            <Btn variant="secondary" onClick={exportCsv}>
              匯出 CSV
            </Btn>
            <Btn variant="secondary" onClick={() => setOrderPickOpen(true)}>
              從訂單批次建立
            </Btn>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ALL_SHIPMENT_RECORD_STATUSES.slice(0, 6).map((k) => (
          <Card key={k} className="!p-3">
            <p className="text-[10px] font-semibold text-zinc-500">{k}</p>
            <p className="text-lg font-bold text-zinc-900">{statusCounts.get(k) ?? 0}</p>
          </Card>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_SHIPMENT_RECORD_STATUSES.slice(6).map((k) => (
          <Card key={k} className="!p-3">
            <p className="text-[10px] font-semibold text-zinc-500">{k}</p>
            <p className="text-lg font-bold text-zinc-900">{statusCounts.get(k) ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 flex flex-wrap gap-2">
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => batchPacked(selectedIds)}>
          <Package className="h-4 w-4" />
          批次已包裝
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => batchShipped(selectedIds)}>
          <Truck className="h-4 w-4" />
          批次已寄出
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={() => setTrackOpen(true)}>
          批次更新追蹤碼
        </Btn>
        <Btn variant="secondary" className="!py-2 text-xs" disabled={selectedIds.length === 0} onClick={copyNotify}>
          <Clipboard className="h-4 w-4" />
          複製寄件通知
        </Btn>
      </Card>

      <Card className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="客戶、訂單、查詢碼、追蹤碼…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={st} onChange={(e) => setSt(e.target.value as ShipmentRecordStatus | 'all')}>
          <option value="all">全部狀態</option>
          {ALL_SHIPMENT_RECORD_STATUSES.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={gid} onChange={(e) => setGid(e.target.value)}>
          <option value="all">全部團別</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm md:col-span-1" value={method} onChange={(e) => setMethod(e.target.value)}>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m === 'all' ? '全部方式' : m}
            </option>
          ))}
        </select>
      </Card>

      {filtered.length === 0 ? (
        <Empty title="沒有出貨紀錄" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="p-2 w-8" />
                <th className="p-2">紀錄 ID</th>
                <th className="p-2">訂單</th>
                <th className="p-2">客戶</th>
                <th className="p-2">方式</th>
                <th className="p-2">狀態</th>
                <th className="p-2">追蹤</th>
                <th className="p-2">運費</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const o = orders.find((x) => x.id === r.orderId)
                const c = customers.find((x) => x.id === r.customerId)
                return (
                  <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50/80">
                    <td className="p-2">
                      <input type="checkbox" checked={!!sel[r.id]} onChange={() => toggle(r.id)} />
                    </td>
                    <td className="p-2 font-mono text-xs">{r.id}</td>
                    <td className="p-2">
                      <Link className="font-semibold text-indigo-700 hover:underline" to={`/orders/${r.orderId}`}>
                        {o?.lookupCode ?? r.orderId}
                      </Link>
                    </td>
                    <td className="p-2">{c?.name}</td>
                    <td className="p-2 text-xs">
                      {r.shippingMethod}
                      <br />
                      <span className="text-zinc-500">{r.carrier}</span>
                    </td>
                    <td className="p-2">
                      <Chip tone={r.status === '退回' || r.status === '遺失 / 異常' ? 'bad' : r.status === '逾期未取' ? 'warn' : 'neutral'}>{r.status}</Chip>
                    </td>
                    <td className="max-w-[140px] truncate p-2 font-mono text-xs">{r.trackingNo ?? '—'}</td>
                    <td className="p-2 tabular-nums">{r.shippingFee}</td>
                    <td className="p-2">
                      <Btn variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setTimelineRec(r)}>
                        時間軸
                      </Btn>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!timelineRec} title="出貨時間軸" size="lg" onClose={() => setTimelineRec(null)}>
        {timelineRec ? (
          <div>
            <p className="mb-4 text-xs text-zinc-500">
              訂單：{orders.find((x) => x.id === timelineRec.orderId)?.lookupCode} · 目前狀態：
              <strong>{timelineRec.status}</strong>
            </p>
            <ol className="space-y-3">
              {getShipmentTimelineSteps(timelineRec).map((step, idx) => (
                <li
                  key={step.label}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${
                    step.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-zinc-100 bg-zinc-50'
                  } ${step.warn ? 'border-amber-300 bg-amber-50' : ''}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold ring-1 ring-zinc-200">
                    {step.done ? '✓' : idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900">{step.label}</p>
                    {step.warn ? <p className="text-xs text-amber-800">此筆有例外狀態，請以實際物流為準。</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </Modal>

      <Modal open={trackOpen} title="批次更新追蹤碼" onClose={() => setTrackOpen(false)}>
        <p className="mb-2 text-xs text-zinc-500">將套用至已勾選的 {selectedIds.length} 筆</p>
        <input className="mb-3 w-full rounded-xl border px-3 py-2 text-sm" placeholder="追蹤號碼" value={trackNo} onChange={(e) => setTrackNo(e.target.value)} />
        <Btn className="w-full" onClick={applyTracking}>
          確認更新
        </Btn>
      </Modal>

      <Modal open={orderPickOpen} title="從訂單批次建立出貨紀錄" size="lg" onClose={() => setOrderPickOpen(false)}>
        <p className="mb-3 text-xs text-zinc-500">勾選訂單後建立新的出貨紀錄（預設賣貨便／7-ELEVEN）。</p>
        <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {orders.slice(0, 25).map((o) => {
            const c = customers.find((x) => x.id === o.customerId)
            return (
              <label key={o.id} className="flex items-center gap-2 rounded-lg border border-zinc-100 px-2 py-1.5 hover:bg-zinc-50">
                <input type="checkbox" checked={!!orderPick[o.id]} onChange={() => setOrderPick((p) => ({ ...p, [o.id]: !p[o.id] }))} />
                <span className="font-mono text-indigo-700">{o.lookupCode}</span>
                <span className="text-zinc-600">{c?.name}</span>
              </label>
            )
          })}
        </div>
        <Btn className="mt-4 w-full" onClick={submitOrderBatch}>
          建立出貨紀錄
        </Btn>
      </Modal>
    </div>
  )
}
