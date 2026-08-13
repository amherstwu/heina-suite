import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../context/useApi'
import type {
  BankJournalRow,
  GroupBuyGroup,
  GroupBuyOrder,
  GroupBuySavePayload,
  PortalConfig,
} from '../../api/types'
import { agentLog } from '../../debug/agentLog'
import '../../ui.css'
import './groupbuy.css'

const demoGroup = (): GroupBuyGroup => ({
  id: 'demo-123',
  name: '【範例】測試團務 (可刪除)',
  closingDate: '2026-12-31',
  saleEndDate: '2026-12-31',
  officialShipDate: '2027-01-01',
  status: '已登記',
  jpyAmount: '10000',
  orderId: 'DEMO-001',
  logisticsId: 'LOG-001',
  purchaseLink: '',
  orders: [
    {
      id: 'ord-123',
      customerName: '測試客戶',
      paymentStatus: '未付款',
      deposit: 1000,
      domesticShip: 60,
      intlShip: 100,
      balance: 1180,
      totalTwd: 1020,
      paymentInfo: '',
      items: [{ name: '測試徽章', qty: 1, jpy: 1000, twd: 1020 }],
    },
  ],
})

function calcOrderTwd(items: GroupBuyOrder['items']) {
  return items.reduce((s, i) => s + (Number(i.twd) || 0), 0)
}

export function GroupBuyPage() {
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [appMode, setAppMode] = useState<'gateway' | 'admin'>('gateway')
  const [groups, setGroups] = useState<GroupBuyGroup[]>([])
  const [bankJournal, setBankJournal] = useState<BankJournalRow[]>([])
  const [exchangeRate, setExchangeRate] = useState(0.22)
  const [portalConfig, setPortalConfig] = useState<PortalConfig>({
    title: '訂單自助查詢',
    intro: '輸入社群暱稱即可查詢訂單狀態與付款資訊。',
    websiteUrl: '',
    groupUrl: '',
    extraNote: '付款後請填寫：付款日期、後五碼，等待對帳完成後即可在此查看狀態。',
  })
  const [statusMsg, setStatusMsg] = useState('')

  const [activeTab, setActiveTab] = useState<'groups' | 'accounting' | 'info'>('groups')
  const [viewGroupId, setViewGroupId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const emptyGroupForm = () => ({
    id: '' as string,
    name: '',
    closingDate: '',
    saleEndDate: '',
    officialShipDate: '',
    status: '已登記',
    jpyAmount: '',
    orderId: '',
    logisticsId: '',
    purchaseLink: '',
  })
  const [groupForm, setGroupForm] = useState(emptyGroupForm)

  const [orderForm, setOrderForm] = useState({
    id: '',
    customerName: '',
    items: [] as GroupBuyOrder['items'],
    deposit: 0,
    domesticShip: 0,
    intlShip: 0,
    balance: 0,
    paymentStatus: '未付款',
    paymentInfo: '',
  })
  const [tempItem, setTempItem] = useState({ name: '', qty: 1, jpy: '' as string | number, twd: '' as string | number })

  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string
    orders: (GroupBuyOrder & { groupName: string })[]
  } | null>(null)
  const [selectedPayGroups, setSelectedPayGroups] = useState<string[]>([])
  const [editingAmounts, setEditingAmounts] = useState<Record<string, number | string>>({})
  const [payConfirmNote, setPayConfirmNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // #region agent log
      agentLog({
        runId: 'baseline',
        hypothesisId: 'H3',
        location: 'GroupBuyPage.load',
        message: 'GroupBuy load start',
        data: { action: 'getAppData' },
      })
      // #endregion
      const data = await api.call<{
        groups: GroupBuyGroup[]
        bankJournal: BankJournalRow[]
        exchangeRate: number
        portalConfig: PortalConfig
      }>({ module: 'groupbuy', action: 'getAppData' })
      if (!data.groups?.length) setGroups([demoGroup()])
      else setGroups(data.groups)
      setBankJournal(data.bankJournal || [])
      setExchangeRate(data.exchangeRate ?? 0.22)
      if (data.portalConfig) setPortalConfig((p) => ({ ...p, ...data.portalConfig }))
    } catch (e) {
      console.error(e)
      setStatusMsg('讀取失敗')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (localStorage.getItem('heina_mode') === 'admin') setAppMode('admin')
  }, [])

  const uploadToCloud = async () => {
    setStatusMsg('同步中…')
    try {
      const realGroups = groups.filter((g) => g.id !== 'demo-123')
      const payload: GroupBuySavePayload = {
        groups: realGroups,
        bankJournal,
        exchangeRate,
        portalConfig,
      }
      await api.call({ module: 'groupbuy', action: 'saveAppData', payload })
      setStatusMsg('已同步')
    } catch (e) {
      console.error(e)
      setStatusMsg('同步失敗')
    }
    setTimeout(() => setStatusMsg(''), 2500)
  }

  const handleJpyChange = (val: string) => {
    const jpy = Number(val || 0)
    const qty = Number(tempItem.qty || 1)
    const twd = Math.round(jpy * qty * Number(exchangeRate || 0.22))
    setTempItem((prev) => ({ ...prev, jpy: val, twd }))
  }

  useEffect(() => {
    if (!isOrderModalOpen) return
    const total =
      calcOrderTwd(orderForm.items) + (Number(tempItem.twd) || 0) * (Number(tempItem.qty) || 1)
    const calcDep = total > 20 ? total - 20 : total
    const bal =
      total -
      calcDep +
      (Number(orderForm.domesticShip) || 0) +
      (Number(orderForm.intlShip) || 0)
    setOrderForm((prev) => ({ ...prev, deposit: calcDep, balance: bal }))
  }, [
    orderForm.items,
    orderForm.domesticShip,
    orderForm.intlShip,
    tempItem.twd,
    tempItem.qty,
    isOrderModalOpen,
  ])

  const addItemToOrder = () => {
    if (!tempItem.name) return
    setOrderForm((o) => ({
      ...o,
      items: [...o.items, { ...tempItem, qty: Number(tempItem.qty), jpy: Number(tempItem.jpy), twd: Number(tempItem.twd) }],
    }))
    setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
  }

  const saveGroup = (e: React.FormEvent) => {
    e.preventDefault()
    const newG: GroupBuyGroup = {
      ...groupForm,
      id: groupForm.id || Date.now().toString(),
      orders: groupForm.id ? groups.find((x) => x.id === groupForm.id)?.orders || [] : [],
    }
    setGroups((gs) =>
      groupForm.id ? gs.map((x) => (x.id === groupForm.id ? newG : x)) : [newG, ...gs],
    )
    setIsGroupModalOpen(false)
  }

  const saveOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewGroupId) return
    const finalItems = [
      ...orderForm.items,
      ...(tempItem.name
        ? [
            {
              name: tempItem.name,
              qty: Number(tempItem.qty),
              jpy: Number(tempItem.jpy),
              twd: Number(tempItem.twd),
            },
          ]
        : []),
    ]
    if (!finalItems.length) {
      alert('請加入商品')
      return
    }
    const total = calcOrderTwd(finalItems)
    const finalDeposit = Number(orderForm.deposit)
    const finalBal =
      total -
      finalDeposit +
      (Number(orderForm.domesticShip) || 0) +
      (Number(orderForm.intlShip) || 0)
    const newO: GroupBuyOrder = {
      ...orderForm,
      items: finalItems,
      totalTwd: total,
      deposit: finalDeposit,
      balance: finalBal,
      id: orderForm.id || Date.now().toString(),
    }
    setGroups((gs) =>
      gs.map((g) =>
        g.id === viewGroupId
          ? {
              ...g,
              orders: orderForm.id
                ? g.orders.map((o) => (o.id === orderForm.id ? newO : o))
                : [newO, ...g.orders],
            }
          : g,
      ),
    )
    setIsOrderModalOpen(false)
  }

  if (loading) {
    return (
      <div className="gb-loading">
        <span className="gb-bear">🐻</span>
        <p>系統資料讀取中…</p>
      </div>
    )
  }

  if (appMode === 'gateway') {
    return (
      <div className="gb-gateway">
        <h1 className="gb-gateway-title">Heina Shop</h1>
        <div className="gb-gateway-btns">
          <button
            type="button"
            className="heina-btn"
            onClick={() => {
              const u = prompt('帳號')
              const p = prompt('密碼')
              if (u === 'admin' && p === '4502') {
                setAppMode('admin')
                localStorage.setItem('heina_mode', 'admin')
              } else alert('帳號或密碼錯誤')
            }}
          >
            管理員登入
          </button>
          <Link to="/lookup" className="heina-btn-outline gb-gateway-portal-link">
            顧客自助查詢
          </Link>
        </div>
      </div>
    )
  }

  /* ---------- Admin ---------- */
  return (
    <div className="gb-admin">
      {statusMsg && <div className="gb-toast">{statusMsg}</div>}
      <header className="gb-admin-head">
        <h1>團購訂單（管理）</h1>
        <div className="gb-admin-actions">
          <button type="button" className="heina-btn" onClick={() => void uploadToCloud()}>
            同步雲端
          </button>
          <button type="button" className="heina-btn-outline" onClick={() => setIsSettingsOpen(true)}>
            系統設定
          </button>
          <button
            type="button"
            className="heina-btn-outline"
            onClick={() => {
              setAppMode('gateway')
              localStorage.removeItem('heina_mode')
            }}
          >
            登出
          </button>
        </div>
      </header>

      <div className="gb-admin-tabs">
        <button
          type="button"
          className={activeTab === 'groups' ? 'gb-tab gb-tab-active' : 'gb-tab'}
          onClick={() => {
            setActiveTab('groups')
            setViewGroupId(null)
          }}
        >
          團務管理
        </button>
        <button
          type="button"
          className={activeTab === 'accounting' ? 'gb-tab gb-tab-active' : 'gb-tab'}
          onClick={() => setActiveTab('accounting')}
        >
          帳務對帳
        </button>
        <button
          type="button"
          className={activeTab === 'info' ? 'gb-tab gb-tab-active' : 'gb-tab'}
          onClick={() => setActiveTab('info')}
        >
          操作說明
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="heina-card">
          <p>訂金預設為總額 − 20；對帳後會寫回訂單與顧客可查的付款備註。</p>
          <p>
            顧客請使用側欄「顧客查詢」或首頁的 <strong>訂單自助查詢</strong> 連結（無密碼）。
          </p>
        </div>
      )}

      {activeTab === 'accounting' && (
        <div className="gb-grid">
          {groups
            .flatMap((g) =>
              (g.orders || [])
                .filter((o) => o.paymentStatus === '未付款')
                .map((o) => ({ customerName: o.customerName })),
            )
            .filter((v, i, a) => a.findIndex((t) => t.customerName === v.customerName) === i)
            .map((c, i) => {
              const custOrders = groups.flatMap((g) =>
                (g.orders || [])
                  .filter((o) => o.customerName === c.customerName && o.paymentStatus === '未付款')
                  .map((o) => ({ ...o, groupName: g.name })),
              )
              const totalDep = custOrders.reduce((s, o) => s + Number(o.deposit), 0)
              return (
                <button
                  type="button"
                  key={i}
                  className="heina-card gb-acct-card"
                  onClick={() => {
                    const init: Record<string, number | string> = {}
                    custOrders.forEach((o) => {
                      init[o.id] = o.deposit
                    })
                    setSelectedCustomer({ name: c.customerName, orders: custOrders })
                    setSelectedPayGroups(custOrders.map((o) => o.groupName))
                    setEditingAmounts(init)
                    setPayConfirmNote('')
                    setIsBillModalOpen(true)
                  }}
                >
                  <strong>{c.customerName}</strong>
                  <span>待收訂金 ${totalDep}</span>
                </button>
              )
            })}
        </div>
      )}

      {activeTab === 'groups' && !viewGroupId && (
        <>
          <input
            className="heina-input gb-search"
            placeholder="搜尋團名…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="gb-grid">
            {groups
              .filter((g) => String(g.name || '').includes(searchTerm))
              .map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className="heina-card gb-group-card"
                  onClick={() => setViewGroupId(g.id)}
                >
                  <div className="gb-group-card-head">
                    <span>{g.status}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        setGroupForm({
                          id: g.id,
                          name: g.name,
                          closingDate: g.closingDate,
                          saleEndDate: g.saleEndDate,
                          officialShipDate: g.officialShipDate,
                          status: g.status,
                          jpyAmount: String(g.jpyAmount),
                          orderId: g.orderId,
                          logisticsId: g.logisticsId,
                          purchaseLink: g.purchaseLink,
                        })
                        setIsGroupModalOpen(true)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLElement).click()
                      }}
                    >
                      編輯
                    </span>
                  </div>
                  <h3>{g.name}</h3>
                </button>
              ))}
          </div>
          <button
            type="button"
            className="heina-btn gb-fab"
            onClick={() => {
              setGroupForm(emptyGroupForm())
              setIsGroupModalOpen(true)
            }}
          >
            ＋ 開團
          </button>
        </>
      )}

      {activeTab === 'groups' && viewGroupId && (
        <div>
          <button type="button" className="heina-btn-outline" onClick={() => setViewGroupId(null)}>
            ← 返回
          </button>
          <h2>{groups.find((g) => g.id === viewGroupId)?.name}</h2>
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
                balance: 0,
                paymentStatus: '未付款',
                paymentInfo: '',
              })
              setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
              setIsOrderModalOpen(true)
            }}
          >
            新增客訂
          </button>
          <div className="gb-grid">
            {(groups.find((g) => g.id === viewGroupId)?.orders || []).map((o) => (
              <div key={o.id} className="heina-card">
                <strong>{o.customerName}</strong> {o.paymentStatus}
                <button
                  type="button"
                  className="heina-btn-outline"
                  onClick={() => {
                    setOrderForm(o)
                    setTempItem({ name: '', qty: 1, jpy: '', twd: '' })
                    setIsOrderModalOpen(true)
                  }}
                >
                  編輯
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div className="gb-modal-back" onClick={() => setIsGroupModalOpen(false)}>
          <div className="heina-card gb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>開團設定</h3>
            <form onSubmit={saveGroup} className="gb-form">
              <input
                required
                className="heina-input"
                placeholder="團名"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
              <input
                type="date"
                className="heina-input"
                value={groupForm.closingDate}
                onChange={(e) => setGroupForm({ ...groupForm, closingDate: e.target.value })}
              />
              <select
                className="heina-input"
                value={groupForm.status}
                onChange={(e) => setGroupForm({ ...groupForm, status: e.target.value })}
              >
                {['已登記', '已下單', '官方已發貨', '已集運', '已抵台', '已結束'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <div className="gb-form-actions">
                <button type="button" className="heina-btn-outline" onClick={() => setIsGroupModalOpen(false)}>
                  取消
                </button>
                <button type="submit" className="heina-btn">
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOrderModalOpen && viewGroupId && (
        <div className="gb-modal-back" onClick={() => setIsOrderModalOpen(false)}>
          <div className="heina-card gb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>客訂</h3>
            <form onSubmit={saveOrder} className="gb-form">
              <input
                required
                className="heina-input"
                placeholder="客人姓名"
                value={orderForm.customerName}
                onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
              />
              {orderForm.items.map((it, idx) => (
                <div key={idx}>
                  {it.name} x{it.qty} ${it.twd}
                </div>
              ))}
              <input
                className="heina-input"
                placeholder="品名"
                value={tempItem.name}
                onChange={(e) => setTempItem({ ...tempItem, name: e.target.value })}
              />
              <input
                type="number"
                className="heina-input"
                placeholder="日幣"
                value={tempItem.jpy}
                onChange={(e) => handleJpyChange(e.target.value)}
              />
              <button type="button" className="heina-btn-outline" onClick={addItemToOrder}>
                加入商品
              </button>
              <label>
                訂金
                <input
                  type="number"
                  className="heina-input"
                  value={orderForm.deposit}
                  onChange={(e) => setOrderForm({ ...orderForm, deposit: Number(e.target.value) })}
                />
              </label>
              <button type="submit" className="heina-btn">
                儲存
              </button>
            </form>
          </div>
        </div>
      )}

      {isBillModalOpen && selectedCustomer && (
        <div className="gb-modal-back" onClick={() => setIsBillModalOpen(false)}>
          <div className="heina-card gb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedCustomer.name}</h3>
            {selectedCustomer.orders.map((o) => (
              <div key={o.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedPayGroups.includes(o.groupName)}
                    onChange={() =>
                      setSelectedPayGroups((p) =>
                        p.includes(o.groupName) ? p.filter((x) => x !== o.groupName) : [...p, o.groupName],
                      )
                    }
                  />
                  {o.groupName} 訂金
                  <input
                    type="number"
                    className="heina-input"
                    value={editingAmounts[o.id] ?? o.deposit}
                    onChange={(e) =>
                      setEditingAmounts({ ...editingAmounts, [o.id]: e.target.value })
                    }
                  />
                </label>
              </div>
            ))}
            <input
              className="heina-input"
              placeholder="匯款備註"
              value={payConfirmNote}
              onChange={(e) => setPayConfirmNote(e.target.value)}
            />
            <button
              type="button"
              className="heina-btn"
              onClick={() => {
                const note = payConfirmNote.trim()
                const targetIds = selectedCustomer.orders
                  .filter((o) => selectedPayGroups.includes(o.groupName))
                  .map((o) => o.id)
                const dateStr = new Date().toLocaleDateString()
                setGroups((gs) =>
                  gs.map((g) => ({
                    ...g,
                    orders: g.orders.map((o) => {
                      if (!targetIds.includes(o.id)) return o
                      const newDep = Number(
                        editingAmounts[o.id] !== undefined ? editingAmounts[o.id] : o.deposit,
                      )
                      const newBal =
                        Number(o.totalTwd) -
                        newDep +
                        (Number(o.domesticShip) || 0) +
                        (Number(o.intlShip) || 0)
                      return {
                        ...o,
                        paymentStatus: '已付訂金',
                        deposit: newDep,
                        balance: newBal,
                        paymentInfo: note ? `${dateStr} (${note})` : `${dateStr} 沖帳`,
                      }
                    }),
                  })),
                )
                setIsBillModalOpen(false)
              }}
            >
              確認沖帳
            </button>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="gb-modal-back" onClick={() => setIsSettingsOpen(false)}>
          <div className="heina-card gb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>系統設定</h3>
            <label>
              匯率
              <input
                type="number"
                step="0.001"
                className="heina-input"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
              />
            </label>
            <label>
              Portal 標題
              <input
                className="heina-input"
                value={portalConfig.title}
                onChange={(e) => setPortalConfig({ ...portalConfig, title: e.target.value })}
              />
            </label>
            <textarea
              className="heina-input"
              rows={3}
              value={portalConfig.intro}
              onChange={(e) => setPortalConfig({ ...portalConfig, intro: e.target.value })}
            />
            <div className="gb-form-actions">
              <button type="button" className="heina-btn-outline" onClick={() => setIsSettingsOpen(false)}>
                關閉
              </button>
              <button
                type="button"
                className="heina-btn"
                onClick={() => {
                  setIsSettingsOpen(false)
                  void uploadToCloud()
                }}
              >
                儲存並同步
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
