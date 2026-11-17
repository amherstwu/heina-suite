import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from '../../context/useApi'
import { isGasHost } from '../../adapters/gas'
import type { PreorderGroup, PreorderItem, PreorderOrder } from '../../api/types'
import { demoPreorderGroups } from './demoPreorderSeed'
import '../../ui.css'
import './preorder.css'

const initialGroup = (): Omit<PreorderGroup, 'id' | 'orders'> => ({
  name: '',
  status: '已登記',
  closingDate: '',
  saleEndDate: '',
  purchaseDate: '',
  purchasePlace: '',
  officialShipDate: '',
  jpyAmount: '',
  creditCard: '',
  orderId: '',
  logisticsId: '',
  purchaseLink: '',
})

export function PreorderPage() {
  const api = useApi()
  const [groups, setGroups] = useState<PreorderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedFromCloud, setLoadedFromCloud] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'groups' | 'accounting'>('groups')
  const [viewGroupId, setViewGroupId] = useState<string | null>(null)

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [groupForm, setGroupForm] = useState(initialGroup)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({
    id: '',
    customerName: '',
    items: [] as PreorderItem[],
    deposit: 0,
    domesticShip: 0,
    intlShip: 0,
    paymentStatus: '未付款',
    paymentInfo: '',
  })
  const [tempItem, setTempItem] = useState({ name: '', qty: 1, jpy: '', twd: '' })

  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [batchItem, setBatchItem] = useState({ name: '', qty: 1, jpy: '', twd: '' })
  const [batchCustomers, setBatchCustomers] = useState('')
  const [batchDepositMode, setBatchDepositMode] = useState<'leave20' | 'full' | 'custom'>('leave20')
  const [batchCustomDep, setBatchCustomDep] = useState(0)

  const [acctImported, setAcctImported] = useState(false)
  const [acctList, setAcctList] = useState<
    { name: string; totalDeposit: number; orders: (PreorderOrder & { groupName: string })[] }[]
  >([])
  const [billCustomer, setBillCustomer] = useState<(typeof acctList)[0] | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [tempDeps, setTempDeps] = useState<Record<string, string>>({})
  const [batchNote, setBatchNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadedFromCloud(false)
    try {
      const data = await api.call<PreorderGroup[]>({ module: 'preorder', action: 'export' })
      setGroups(Array.isArray(data) ? data : [])
      setLoadedFromCloud(true)
    } catch (e) {
      console.error(e)
      setLoadedFromCloud(false)
      if (!isGasHost()) {
        setGroups(demoPreorderGroups())
        setStatusMsg('載入失敗，已顯示本機預購示範資料')
      } else {
        setGroups([])
        setStatusMsg('載入失敗')
      }
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const saveCloud = async () => {
    if (!loadedFromCloud) {
      setStatusMsg('讀取未成功，已停止同步，避免覆蓋雲端預購')
      setTimeout(() => setStatusMsg(''), 2500)
      return
    }
    let payload: PreorderGroup[] | { groups: PreorderGroup[]; confirmEmptyOverwrite: boolean } = groups
    if (groups.length === 0) {
      const ok = window.confirm('目前沒有預購資料。確定要用空白資料覆蓋雲端預購表嗎？')
      if (!ok) {
        setStatusMsg('已取消同步')
        setTimeout(() => setStatusMsg(''), 2500)
        return
      }
      payload = { groups, confirmEmptyOverwrite: true }
    }
    setStatusMsg('同步中…')
    try {
      await api.call({ module: 'preorder', action: 'save', payload })
      setStatusMsg('已同步')
    } catch (e) {
      console.error(e)
      setStatusMsg(e instanceof Error ? e.message : '同步失敗')
    }
    setTimeout(() => setStatusMsg(''), 2500)
  }

  const currentGroup = groups.find((g) => g.id === viewGroupId)

  const calcTwd = (items: PreorderItem[]) =>
    items.reduce((s, i) => s + (Number(i.twd) || 0) * (Number(i.qty) || 0), 0)

  const buildAcctList = (gs: PreorderGroup[]) => {
    const map: Record<string, (typeof acctList)[0]> = {}
    gs.forEach((g) => {
      (g.orders || []).forEach((o) => {
        if (o.paymentStatus !== '未付款') return
        const name = (o.customerName || '').trim()
        if (!name) return
        if (!map[name]) map[name] = { name, totalDeposit: 0, orders: [] }
        map[name].totalDeposit += Number(o.deposit || 0)
        map[name].orders.push({ ...o, groupName: g.name })
      })
    })
    return Object.values(map).sort((a, b) => b.totalDeposit - a.totalDeposit)
  }

  const importAccounting = () => {
    setAcctList(buildAcctList(groups))
    setAcctImported(true)
  }

  const totalSelectedDep = useMemo(() => {
    if (!billCustomer) return 0
    return billCustomer.orders
      .filter((o) => selectedGroups.includes(o.groupName || '其他'))
      .reduce((s, o) => {
        const v = tempDeps[o.id] !== undefined ? Number(tempDeps[o.id]) : Number(o.deposit)
        return s + v
      }, 0)
  }, [billCustomer, selectedGroups, tempDeps])

  if (loading) return <div className="po-loading">預購資料載入中…</div>

  if (activeTab === 'accounting') {
    if (!acctImported) {
      return (
        <div className="po-acct-intro">
          <button type="button" className="heina-btn-outline" onClick={() => setActiveTab('groups')}>
            ← 返回
          </button>
          <h1>帳務中心</h1>
          <button type="button" className="heina-btn" onClick={importAccounting}>
            匯入訂金帳務
          </button>
        </div>
      )
    }
    return (
      <div>
        <button type="button" className="heina-btn-outline" onClick={() => setActiveTab('groups')}>
          ← 返回
        </button>
        <h2>帳務（未付款）</h2>
        <div className="po-grid">
          {acctList.map((c) => (
            <button
              type="button"
              key={c.name}
              className="heina-card po-acct-row"
              onClick={() => {
                const gnames = [...new Set(c.orders.map((o) => o.groupName || '其他'))]
                setBillCustomer(c)
                setSelectedGroups(gnames)
                setTempDeps({})
                setBatchNote('')
              }}
            >
              <strong>{c.name}</strong>
              <span>${c.totalDeposit}</span>
            </button>
          ))}
        </div>
        {billCustomer && (
          <div className="po-modal-back" onClick={() => setBillCustomer(null)}>
            <div className="heina-card po-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{billCustomer.name}</h3>
              {[...new Set(billCustomer.orders.map((o) => o.groupName || '其他'))].map((gName) => (
                <label key={gName} className="po-bill-grp">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(gName)}
                    onChange={() =>
                      setSelectedGroups((p) =>
                        p.includes(gName) ? p.filter((x) => x !== gName) : [...p, gName],
                      )
                    }
                  />
                  {gName}
                </label>
              ))}
              {billCustomer.orders.map((o) => (
                <div key={o.id} className="po-bill-order">
                  <div>{o.groupName}</div>
                  <input
                    type="number"
                    className="heina-input"
                    value={tempDeps[o.id] ?? o.deposit}
                    onChange={(e) => setTempDeps({ ...tempDeps, [o.id]: e.target.value })}
                  />
                </div>
              ))}
              <input
                className="heina-input"
                placeholder="付款備註"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
              />
              <p>已選訂金合計：${totalSelectedDep}</p>
              <button
                type="button"
                className="heina-btn"
                onClick={() => {
                  if (!selectedGroups.length) {
                    alert('請選團')
                    return
                  }
                  const ids = billCustomer.orders
                    .filter((o) => selectedGroups.includes(o.groupName || '其他'))
                    .map((o) => o.id)
                  const note = batchNote
                    ? `${batchNote} (實收:$${totalSelectedDep})`
                    : `實收:$${totalSelectedDep}`
                  setGroups((gs) => {
                    const next = gs.map((g) => ({
                      ...g,
                      orders: g.orders.map((o) => {
                        if (!ids.includes(o.id)) return o
                        const dep = Number(tempDeps[o.id] ?? o.deposit)
                        const tw = Number(o.totalTwd)
                        const dom = Number(o.domesticShip)
                        const intl = Number(o.intlShip)
                        return {
                          ...o,
                          paymentStatus: '已付訂金',
                          deposit: dep,
                          balance: tw - dep + dom + intl,
                          paymentInfo: note,
                        }
                      }),
                    }))
                    setAcctList(buildAcctList(next))
                    return next
                  })
                  setBillCustomer(null)
                }}
              >
                確認收款
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (viewGroupId && currentGroup) {
    return (
      <div>
        <button type="button" className="heina-btn-outline" onClick={() => setViewGroupId(null)}>
          ← 返回
        </button>
        <h2>{currentGroup.name}</h2>
        <button
          type="button"
          className="heina-btn-outline"
          onClick={() => {
            setBatchItem({ name: '', qty: 1, jpy: '', twd: '' })
            setBatchCustomers('')
            setBatchDepositMode('leave20')
            setIsBatchOpen(true)
          }}
        >
          批次新增
        </button>
        <button
          type="button"
          className="heina-btn"
          onClick={() => {
            setOrderForm({
              id: '',
              customerName: '',
              items: [],
              deposit: 0,
              domesticShip: 0,
              intlShip: 0,
              paymentStatus: '未付款',
              paymentInfo: '',
            })
            setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
            setIsOrderModalOpen(true)
          }}
        >
          新增客訂
        </button>
        <div className="po-grid">
          {(currentGroup.orders || []).map((o) => (
            <div key={o.id} className="heina-card">
              <strong>{o.customerName}</strong> {o.paymentStatus}
              <button
                type="button"
                className="heina-btn-outline"
                onClick={() => {
                  setOrderForm({
                    id: o.id,
                    customerName: o.customerName,
                    items: o.items || [],
                    deposit: o.deposit,
                    domesticShip: o.domesticShip,
                    intlShip: o.intlShip,
                    paymentStatus: o.paymentStatus,
                    paymentInfo: o.paymentInfo,
                  })
                  setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
                  setIsOrderModalOpen(true)
                }}
              >
                編輯
              </button>
            </div>
          ))}
        </div>

        {isOrderModalOpen && (
          <div className="po-modal-back" onClick={() => setIsOrderModalOpen(false)}>
            <div className="heina-card po-modal" onClick={(e) => e.stopPropagation()}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const items = [
                    ...orderForm.items,
                    ...(tempItem.name
                      ? [
                          {
                            id: String(Date.now()) + Math.random().toString(16).slice(2),
                            name: tempItem.name,
                            qty: Number(tempItem.qty),
                            jpy: Number(tempItem.jpy),
                            twd: Number(tempItem.twd),
                          },
                        ]
                      : []),
                  ]
                  if (!items.length) {
                    alert('請加入商品')
                    return
                  }
                  const totalTwd = calcTwd(items)
                  const dep =
                    orderForm.paymentStatus === '貨到付款'
                      ? 0
                      : totalTwd > 20
                        ? totalTwd - 20
                        : Number(orderForm.deposit)
                  const dom = Number(orderForm.domesticShip) || 0
                  const intl = Number(orderForm.intlShip) || 0
                  const newO: PreorderOrder = {
                    ...orderForm,
                    items,
                    id: orderForm.id || String(Date.now()),
                    totalTwd,
                    deposit: dep,
                    balance: totalTwd - dep + dom + intl,
                  }
                  setGroups((gs) =>
                    gs.map((g) =>
                      g.id === viewGroupId
                        ? {
                            ...g,
                            orders: orderForm.id
                              ? g.orders.map((x) => (x.id === orderForm.id ? newO : x))
                              : [newO, ...g.orders],
                          }
                        : g,
                    ),
                  )
                  setIsOrderModalOpen(false)
                }}
              >
                <input
                  required
                  className="heina-input"
                  placeholder="客人"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                />
                <input
                  className="heina-input"
                  placeholder="品名"
                  value={tempItem.name}
                  onChange={(e) => setTempItem({ ...tempItem, name: e.target.value })}
                />
                <input
                  type="number"
                  className="heina-input"
                  placeholder="台幣單價"
                  value={tempItem.twd}
                  onChange={(e) => setTempItem({ ...tempItem, twd: e.target.value })}
                />
                <button type="button" className="heina-btn-outline" onClick={() => {
                  if (!tempItem.name) return
                  setOrderForm((o) => ({
                    ...o,
                    items: [
                      ...o.items,
                      {
                        id: String(Date.now()) + Math.random().toString(16).slice(2),
                        name: tempItem.name,
                        qty: Number(tempItem.qty),
                        jpy: Number(tempItem.jpy),
                        twd: Number(tempItem.twd),
                      },
                    ],
                  }))
                  setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
                }}>
                  加入品項
                </button>
                <select
                  className="heina-input"
                  value={orderForm.paymentStatus}
                  onChange={(e) => setOrderForm({ ...orderForm, paymentStatus: e.target.value })}
                >
                  {['未付款', '已付訂金', '已付款', '貨到付款'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <button type="submit" className="heina-btn">
                  儲存
                </button>
              </form>
            </div>
          </div>
        )}

        {isBatchOpen && (
          <div className="po-modal-back" onClick={() => setIsBatchOpen(false)}>
            <div className="heina-card po-modal po-modal-wide" onClick={(e) => e.stopPropagation()}>
              <h3>批次新增（同商品多人）</h3>
              <input
                className="heina-input"
                placeholder="品名"
                value={batchItem.name}
                onChange={(e) => setBatchItem({ ...batchItem, name: e.target.value })}
              />
              <div className="po-row">
                <input
                  type="number"
                  className="heina-input"
                  placeholder="每人數量"
                  value={batchItem.qty}
                  onChange={(e) => setBatchItem({ ...batchItem, qty: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className="heina-input"
                  placeholder="$單價"
                  value={batchItem.twd}
                  onChange={(e) => setBatchItem({ ...batchItem, twd: e.target.value })}
                />
              </div>
              <textarea
                className="heina-input"
                rows={6}
                placeholder="每行一位客人，支援 小美,2"
                value={batchCustomers}
                onChange={(e) => setBatchCustomers(e.target.value)}
              />
              <select
                className="heina-input"
                value={batchDepositMode}
                onChange={(e) => setBatchDepositMode(e.target.value as typeof batchDepositMode)}
              >
                <option value="leave20">訂金留 20</option>
                <option value="full">全額</option>
                <option value="custom">自訂</option>
              </select>
              {batchDepositMode === 'custom' && (
                <input
                  type="number"
                  className="heina-input"
                  value={batchCustomDep}
                  onChange={(e) => setBatchCustomDep(Number(e.target.value))}
                />
              )}
              <button
                type="button"
                className="heina-btn"
                onClick={() => {
                  if (!viewGroupId || !batchItem.name) return
                  const lines = batchCustomers.split('\n').map((s) => s.trim()).filter(Boolean)
                  const parsed = lines.map((line) => {
                    const m =
                      line.match(/^(.+?)[,，]\s*(\d+)$/) ||
                      line.match(/^(.+?)\s*[xX＊*]\s*(\d+)$/) ||
                      line.match(/^(.+?)\s+(\d+)$/)
                    if (m) return { name: m[1].trim(), qty: Math.max(1, Number(m[2])) }
                    return { name: line, qty: 1 }
                  })
                  const unitQ = Math.max(1, Number(batchItem.qty) || 1)
                  const unitTwd = Math.max(0, Number(batchItem.twd) || 0)
                  const newOrders: PreorderOrder[] = parsed.map((c) => {
                    const q = c.qty * unitQ
                    const totalTwd = unitTwd * q
                    const dep =
                      batchDepositMode === 'full'
                        ? totalTwd
                        : batchDepositMode === 'custom'
                          ? Math.max(0, batchCustomDep)
                          : totalTwd > 20
                            ? totalTwd - 20
                            : 0
                    const item: PreorderItem = {
                      id: String(Date.now()) + Math.random(),
                      name: batchItem.name,
                      qty: q,
                      jpy: Number(batchItem.jpy) || 0,
                      twd: unitTwd,
                    }
                    return {
                      id: String(Date.now()) + Math.random(),
                      customerName: c.name,
                      items: [item],
                      deposit: dep,
                      domesticShip: 0,
                      intlShip: 0,
                      paymentStatus: '未付款',
                      paymentInfo: '',
                      totalTwd,
                      balance: totalTwd - dep,
                    }
                  })
                  setGroups((gs) =>
                    gs.map((g) =>
                      g.id === viewGroupId ? { ...g, orders: [...newOrders, ...g.orders] } : g,
                    ),
                  )
                  setIsBatchOpen(false)
                }}
              >
                建立
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {statusMsg && <div className="po-toast">{statusMsg}</div>}
      <header className="po-head">
        <h1>預購管理</h1>
        <div className="po-head-actions">
          <button type="button" className="heina-btn" onClick={() => void saveCloud()}>
            同步雲端
          </button>
          <button type="button" className="heina-btn-outline" onClick={() => void load()}>
            重新載入
          </button>
          <button type="button" className="heina-btn-outline" onClick={() => setActiveTab('accounting')}>
            帳務中心
          </button>
        </div>
      </header>
      <button
        type="button"
        className="heina-btn"
        onClick={() => {
          setEditingGroupId(null)
          setGroupForm(initialGroup())
          setIsGroupModalOpen(true)
        }}
      >
        開團
      </button>
      <div className="po-grid">
        {groups.map((g) => (
          <button
            type="button"
            key={g.id}
            className="heina-card po-group"
            onClick={() => setViewGroupId(g.id)}
          >
            <h3>{g.name}</h3>
            <span>{g.status}</span>
          </button>
        ))}
      </div>

      {isGroupModalOpen && (
        <div className="po-modal-back" onClick={() => setIsGroupModalOpen(false)}>
          <div className="heina-card po-modal" onClick={(e) => e.stopPropagation()}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (editingGroupId) {
                  setGroups((gs) =>
                    gs.map((x) =>
                      x.id === editingGroupId ? { ...x, ...groupForm, id: editingGroupId, orders: x.orders } : x,
                    ),
                  )
                } else {
                  setGroups([{ ...groupForm, id: String(Date.now()), orders: [] }, ...groups])
                }
                setIsGroupModalOpen(false)
              }}
            >
              <input
                required
                className="heina-input"
                placeholder="團名"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
              <input
                className="heina-input"
                placeholder="購買地"
                value={groupForm.purchasePlace}
                onChange={(e) => setGroupForm({ ...groupForm, purchasePlace: e.target.value })}
              />
              <button type="submit" className="heina-btn">
                儲存
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
