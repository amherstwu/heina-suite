import { useCallback, useEffect, useState } from 'react'
import {
  ExternalLink,
  FileText,
  HelpCircle,
  Image,
  ListOrdered,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { useApi } from '../context/useApi'
import type {
  GroupBuyAppData,
  GroupBuySavePayload,
  PortalAnnouncement,
  PortalConfig,
  PortalFaqItem,
  PortalGuideInfographic,
  PortalProcessStep,
  PortalSocialIconKind,
  PortalSocialIconSlot,
  PortalTeachCard,
  PortalTeachImage,
} from '../api/types'
import { normalizePortal, editableGuideInfographics } from './customer-portal/mergePortal'
import { teachCardsFor } from './customer-portal/portalTeachCards'
import {
  SOCIAL_ICON_SLOT_MAX,
  SOCIAL_ICON_SLOT_MIN,
  socialIconSlotsFor,
} from './customer-portal/portalSocialIcons'
import {
  announcementsFor,
  faqFor,
  processStepsFor,
} from './customer-portal/staticContent'
import './portalContentAdminPage.css'

type AdminTab = 'basic' | 'news' | 'guide' | 'teach' | 'faq'

const TABS: { id: AdminTab; label: string; icon: typeof FileText }[] = [
  { id: 'basic', label: '基本文案', icon: FileText },
  { id: 'news', label: '最新公告', icon: Megaphone },
  { id: 'guide', label: '購物流程', icon: ListOrdered },
  { id: 'teach', label: '教學圖卡', icon: Image },
  { id: 'faq', label: '常見問題', icon: HelpCircle },
]

const NEWS_CATEGORIES = ['重要', '系統', '延遲', '活動', '出貨'] as const

function uid() {
  return 'pc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function openLookupPreview() {
  const base = `${window.location.origin}${window.location.pathname.replace(/\/?$/, '')}`
  window.open(`${base}#/lookup`, '_blank', 'noopener,noreferrer')
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('讀取圖片失敗'))
    reader.readAsDataURL(file)
  })
}

export function PortalContentAdminPage() {
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [activeTab, setActiveTab] = useState<AdminTab>('basic')
  const [groups, setGroups] = useState<GroupBuyAppData['groups']>([])
  const [bankJournal, setBankJournal] = useState<GroupBuyAppData['bankJournal']>([])
  const [exchangeRate, setExchangeRate] = useState(0.22)
  const [paymentReports, setPaymentReports] = useState<GroupBuyAppData['paymentReports']>([])
  const [portal, setPortal] = useState<PortalConfig>(() => normalizePortal({}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.call<GroupBuyAppData>({ module: 'groupbuy', action: 'getAppData' })
      setGroups(data.groups || [])
      setBankJournal(data.bankJournal || [])
      setExchangeRate(data.exchangeRate ?? 0.22)
      setPaymentReports(data.paymentReports || [])
      const merged = normalizePortal(data.portalConfig || {})
      setPortal({
        ...merged,
        announcements: announcementsFor(merged),
        faqItems: faqFor(merged),
        processSteps: processStepsFor(merged),
        guideInfographics: editableGuideInfographics(merged),
        socialIconSlots: socialIconSlotsFor(merged),
        teachCards: teachCardsFor(merged),
      })
      setStatusMsg('')
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

  const save = useCallback(async () => {
    setSaving(true)
    setStatusMsg('儲存中…')
    try {
      const hadDataUrl = (portal.guideInfographics || []).some((g) =>
        String(g.src || '').startsWith('data:'),
      )
      const guideInfographics = (portal.guideInfographics || []).map((g) => ({
        id: g.id,
        title: g.title,
        desc: g.desc,
        alt: g.alt,
        src: String(g.src || '').startsWith('data:') ? undefined : g.src,
      }))
      const socialIconSlots = socialIconSlotsFor(portal)
      const ig = socialIconSlots.find((s) => s.kind === 'ig')
      const th = socialIconSlots.find((s) => s.kind === 'threads')
      const lineSlot = socialIconSlots.find((s) => s.kind === 'line')
      const portalToSave: PortalConfig = {
        ...portal,
        guideInfographics,
        socialIconSlots,
        teachCards: teachCardsFor(portal),
        instagramUrl: ig?.url || portal.instagramUrl,
        threadsUrl: th?.url || portal.threadsUrl,
        groupUrl: lineSlot?.url || portal.groupUrl,
      }
      const payload: GroupBuySavePayload = {
        groups,
        bankJournal,
        exchangeRate,
        paymentReports,
        portalConfig: portalToSave,
      }
      await api.call({ module: 'groupbuy', action: 'saveAppData', payload })
      setPortal({
        ...portalToSave,
        guideInfographics: editableGuideInfographics(portalToSave),
      })
      setStatusMsg(
        hadDataUrl
          ? '已儲存（上傳圖未寫入雲端，請改貼圖片網址後再存）· 前台已同步標題／說明'
          : '已儲存 · 顧客查詢頁將同步更新',
      )
    } catch (e) {
      console.error(e)
      setStatusMsg('儲存失敗')
    } finally {
      setSaving(false)
    }
  }, [api, bankJournal, exchangeRate, groups, paymentReports, portal])

  const announcements = Array.isArray(portal.announcements) ? portal.announcements : []
  const faqItems = Array.isArray(portal.faqItems) ? portal.faqItems : []
  const processSteps = Array.isArray(portal.processSteps) ? portal.processSteps : []
  const guideInfographics = Array.isArray(portal.guideInfographics)
    ? portal.guideInfographics
    : editableGuideInfographics(portal)
  const socialSlots = socialIconSlotsFor(portal)
  const teachCards = teachCardsFor(portal)

  function updateAnnouncement(idx: number, patch: Partial<PortalAnnouncement>) {
    const next = announcements.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    setPortal({ ...portal, announcements: next })
  }

  function addAnnouncement() {
    setPortal({
      ...portal,
      announcements: [
        ...announcements,
        {
          id: uid(),
          title: '',
          date: new Date().toLocaleDateString('zh-TW'),
          category: '系統',
          description: '',
        },
      ],
    })
  }

  function removeAnnouncement(idx: number) {
    setPortal({ ...portal, announcements: announcements.filter((_, i) => i !== idx) })
  }

  function updateFaq(idx: number, patch: Partial<PortalFaqItem>) {
    const next = faqItems.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    setPortal({ ...portal, faqItems: next })
  }

  function addFaq() {
    setPortal({ ...portal, faqItems: [...faqItems, { id: uid(), q: '', a: '' }] })
  }

  function removeFaq(idx: number) {
    setPortal({ ...portal, faqItems: faqItems.filter((_, i) => i !== idx) })
  }

  function updateStep(idx: number, patch: Partial<PortalProcessStep>) {
    const next = processSteps.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    setPortal({ ...portal, processSteps: next })
  }

  function addStep() {
    const n = processSteps.length + 1
    setPortal({
      ...portal,
      processSteps: [...processSteps, { n, title: '', detail: '' }],
    })
  }

  function removeStep(idx: number) {
    const next = processSteps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, n: i + 1 }))
    setPortal({ ...portal, processSteps: next })
  }

  function updateGuide(idx: number, patch: Partial<PortalGuideInfographic>) {
    const next = guideInfographics.map((g, i) => (i === idx ? { ...g, ...patch } : g))
    setPortal({ ...portal, guideInfographics: next })
  }

  function updateSocialSlot(idx: number, patch: Partial<PortalSocialIconSlot>) {
    const next = socialSlots.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    setPortal({ ...portal, socialIconSlots: next })
  }

  function addSocialSlot() {
    if (socialSlots.length >= SOCIAL_ICON_SLOT_MAX) return
    setPortal({
      ...portal,
      socialIconSlots: [
        ...socialSlots,
        { id: uid(), label: `連結 ${socialSlots.length + 1}`, url: '', kind: 'custom' },
      ],
    })
  }

  function removeSocialSlot(idx: number) {
    if (socialSlots.length <= SOCIAL_ICON_SLOT_MIN) return
    setPortal({ ...portal, socialIconSlots: socialSlots.filter((_, i) => i !== idx) })
  }

  function updateTeachImages(cardId: PortalTeachCard['id'], images: PortalTeachImage[]) {
    const next = teachCards.map((c) => (c.id === cardId ? { ...c, images } : c))
    setPortal({ ...portal, teachCards: next })
  }

  async function addTeachImage(cardId: PortalTeachCard['id'], file: File | null) {
    if (!file) return
    try {
      const src = await readImageAsDataUrl(file)
      const card = teachCards.find((c) => c.id === cardId)
      const images = [...(card?.images || []), { id: uid(), src, alt: card?.title }]
      updateTeachImages(cardId, images)
    } catch (e) {
      console.error(e)
      setStatusMsg('圖片讀取失敗')
    }
  }

  function removeTeachImage(cardId: PortalTeachCard['id'], imageId: string) {
    const card = teachCards.find((c) => c.id === cardId)
    updateTeachImages(
      cardId,
      (card?.images || []).filter((img) => img.id !== imageId),
    )
  }

  async function onAvatarFile(file: File | null) {
    if (!file) return
    try {
      const avatarUrl = await readImageAsDataUrl(file)
      setPortal({ ...portal, avatarUrl })
    } catch (e) {
      console.error(e)
      setStatusMsg('大頭貼讀取失敗')
    }
  }

  async function onSocialIconFile(idx: number, file: File | null) {
    if (!file) return
    try {
      const iconUrl = await readImageAsDataUrl(file)
      updateSocialSlot(idx, { iconUrl, kind: 'custom' })
    } catch (e) {
      console.error(e)
      setStatusMsg('圖示讀取失敗')
    }
  }

  async function onGuideImageFile(idx: number, file: File | null) {
    if (!file) return
    try {
      const src = await readImageAsDataUrl(file)
      updateGuide(idx, { src })
    } catch (e) {
      console.error(e)
      setStatusMsg('圖片讀取失敗')
    }
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!
  const ActiveIcon = activeTabMeta.icon

  return (
    <div className="portal-content-admin-page">
      <header className="pca-hero">
        <div>
          <h1 className="pca-hero-title">訂單自助後台</h1>
        </div>
        <div className="pca-hero-actions">
          <button type="button" className="pca-btn pca-btn--ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            重新載入
          </button>
          <button type="button" className="pca-btn pca-btn--secondary" onClick={() => openLookupPreview()}>
            <ExternalLink className="h-4 w-4" />
            預覽查詢頁
          </button>
          <button type="button" className="pca-btn pca-btn--primary" onClick={() => void save()} disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? '儲存中…' : '儲存全部'}
          </button>
        </div>
      </header>

      {statusMsg ? <p className="pca-toast" role="status">{statusMsg}</p> : null}

      {!loading ? (
        <div className="pca-stats">
          <div className="pca-stat pca-stat--lav">
            <p className="pca-stat-label">公告則數</p>
            <p className="pca-stat-value">{announcements.length}</p>
          </div>
          <div className="pca-stat pca-stat--peach">
            <p className="pca-stat-label">購物流程步驟</p>
            <p className="pca-stat-value">{processSteps.length}</p>
          </div>
          <div className="pca-stat pca-stat--mint">
            <p className="pca-stat-label">常見問題</p>
            <p className="pca-stat-value">{faqItems.length}</p>
          </div>
          <div className="pca-stat pca-stat--sky">
            <p className="pca-stat-label">頁面標題</p>
            <p className="pca-stat-value" style={{ fontSize: '0.95rem' }}>{portal.title || '—'}</p>
          </div>
        </div>
      ) : null}

      <nav className="pca-tabs" aria-label="內容分區">
        {TABS.map((tab) => {
          const count =
            tab.id === 'news'
              ? announcements.length
              : tab.id === 'guide'
                ? processSteps.length
                : tab.id === 'faq'
                  ? faqItems.length
                  : null
          return (
            <button
              key={tab.id}
              type="button"
              className={'pca-tab' + (activeTab === tab.id ? ' is-active' : '')}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {count != null ? <span className="pca-tab-count">（{count}）</span> : null}
            </button>
          )
        })}
      </nav>

      {loading ? (
        <div className="pca-loading">載入內容中…</div>
      ) : (
        <section className="pca-panel" aria-labelledby="pca-panel-title">
          <div className="pca-panel-head">
            <div>
              <div className="pca-panel-title-row">
                <span className="pca-panel-icon" aria-hidden>
                  <ActiveIcon className="h-4 w-4" />
                </span>
                <div>
                  <h2 id="pca-panel-title" className="pca-panel-title">{activeTabMeta.label}</h2>
                  <p className="pca-panel-desc">
                    {activeTab === 'basic'
                      ? '顧客查詢頁頂部與查詢區顯示的文案'
                      : activeTab === 'news'
                        ? '同步顯示於查詢頁「最新公告」區（最多顯示 4 則）'
                        : activeTab === 'guide'
                          ? '代購流程圖與文字步驟，點開「代購流程」卡片時一起顯示'
                          : activeTab === 'teach'
                            ? '搜尋商品、討論串、聊天室、喊單這四張卡片的圖片'
                            : '同步顯示於查詢頁「常見問題」卡片'}
                  </p>
                </div>
              </div>
            </div>
            {activeTab === 'news' ? (
              <button type="button" className="pca-btn pca-btn--secondary pca-btn--sm" onClick={addAnnouncement}>
                <Plus className="h-3.5 w-3.5" />
                新增公告
              </button>
            ) : null}
            {activeTab === 'guide' ? (
              <button type="button" className="pca-btn pca-btn--secondary pca-btn--sm" onClick={addStep}>
                <Plus className="h-3.5 w-3.5" />
                新增步驟
              </button>
            ) : null}
            {activeTab === 'faq' ? (
              <button type="button" className="pca-btn pca-btn--secondary pca-btn--sm" onClick={addFaq}>
                <Plus className="h-3.5 w-3.5" />
                新增問題
              </button>
            ) : null}
          </div>

          <div className="pca-panel-body">
            {activeTab === 'basic' ? (
              <div className="pca-panel-body--grid pca-panel-body--grid-2">
                <label className="pca-field">
                  <span className="pca-label">頁面標題</span>
                  <input
                    className="pca-input"
                    value={portal.title}
                    onChange={(e) => setPortal({ ...portal, title: e.target.value })}
                    placeholder="Heina訂單自助查詢"
                  />
                </label>
                <div className="pca-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="pca-label">查詢頁大頭貼</span>
                  <div className="pca-avatar-row">
                    <span className="pca-avatar-preview" aria-hidden>
                      {portal.avatarUrl?.trim() ? <img src={portal.avatarUrl.trim()} alt="" /> : 'H'}
                    </span>
                    <div className="pca-avatar-actions">
                      <label className="pca-btn pca-btn--secondary pca-btn--sm">
                        上傳圖片
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            e.target.value = ''
                            void onAvatarFile(file)
                          }}
                        />
                      </label>
                      {portal.avatarUrl?.trim() ? (
                        <button
                          type="button"
                          className="pca-btn pca-btn--danger pca-btn--sm"
                          onClick={() => setPortal({ ...portal, avatarUrl: '' })}
                        >
                          恢復預設 H
                        </button>
                      ) : null}
                      <input
                        className="pca-input"
                        value={portal.avatarUrl?.startsWith('data:') ? '' : portal.avatarUrl || ''}
                        onChange={(e) => setPortal({ ...portal, avatarUrl: e.target.value })}
                        placeholder="或貼圖片網址 https://..."
                      />
                    </div>
                  </div>
                </div>
                <label className="pca-field">
                  <span className="pca-label">官方 LINE 連結</span>
                  <input
                    className="pca-input"
                    value={portal.lineFriendUrl || ''}
                    onChange={(e) => setPortal({ ...portal, lineFriendUrl: e.target.value })}
                    placeholder="https://line.me/..."
                  />
                </label>
                <div className="pca-social-editor" style={{ gridColumn: '1 / -1' }}>
                  <div className="pca-social-editor-head">
                    <span className="pca-label">社群圖示（官方 LINE 客服下方，至少 3 格）</span>
                    <button
                      type="button"
                      className="pca-btn pca-btn--secondary pca-btn--sm"
                      disabled={socialSlots.length >= SOCIAL_ICON_SLOT_MAX}
                      onClick={addSocialSlot}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      新增一格
                    </button>
                  </div>
                  {socialSlots.map((slot, idx) => (
                    <article key={slot.id} className="pca-social-card">
                      <div className="pca-social-card-preview">
                        {slot.iconUrl ? (
                          <img src={slot.iconUrl} alt="" />
                        ) : (
                          <span className="pca-social-kind">{slot.kind === 'ig' ? 'IG' : slot.kind === 'threads' ? 'Th' : slot.kind === 'line' ? 'LINE' : '+'}</span>
                        )}
                      </div>
                      <div className="pca-social-card-fields">
                        <label className="pca-field">
                          <span className="pca-label">名稱</span>
                          <input
                            className="pca-input"
                            value={slot.label}
                            onChange={(e) => updateSocialSlot(idx, { label: e.target.value })}
                          />
                        </label>
                        <label className="pca-field">
                          <span className="pca-label">圖示類型</span>
                          <select
                            className="pca-select"
                            value={slot.kind || 'custom'}
                            onChange={(e) =>
                              updateSocialSlot(idx, { kind: e.target.value as PortalSocialIconKind })
                            }
                          >
                            <option value="ig">IG</option>
                            <option value="threads">Threads</option>
                            <option value="line">LINE／社群</option>
                            <option value="custom">自訂圖</option>
                          </select>
                        </label>
                        <label className="pca-field" style={{ gridColumn: '1 / -1' }}>
                          <span className="pca-label">網址</span>
                          <input
                            className="pca-input"
                            value={slot.url}
                            onChange={(e) => updateSocialSlot(idx, { url: e.target.value })}
                            placeholder="https://"
                          />
                        </label>
                        <label className="pca-field" style={{ gridColumn: '1 / -1' }}>
                          <span className="pca-label">自訂圖示網址（可空白，或上傳）</span>
                          <input
                            className="pca-input"
                            value={slot.iconUrl || ''}
                            onChange={(e) => updateSocialSlot(idx, { iconUrl: e.target.value })}
                            placeholder="https://...png"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="pca-file"
                            onChange={(e) => void onSocialIconFile(idx, e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      {socialSlots.length > SOCIAL_ICON_SLOT_MIN ? (
                        <button
                          type="button"
                          className="pca-btn pca-btn--danger pca-btn--sm"
                          onClick={() => removeSocialSlot(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
                <label className="pca-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="pca-label">簡介說明（主標下方）</span>
                  <textarea
                    className="pca-textarea"
                    rows={2}
                    value={portal.intro}
                    onChange={(e) => setPortal({ ...portal, intro: e.target.value })}
                  />
                </label>
                <label className="pca-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="pca-label">查詢訂單說明（標題下方）</span>
                  <textarea
                    className="pca-textarea"
                    rows={2}
                    value={portal.lookupDesc || ''}
                    onChange={(e) => setPortal({ ...portal, lookupDesc: e.target.value })}
                    placeholder="請輸入在社群裡的名字。若有改名或無法查詢請私訊官方 LINE。查單密碼為 4 位數字，可自行修改。"
                  />
                </label>
                <label className="pca-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="pca-label">查詢區底部備註</span>
                  <textarea
                    className="pca-textarea"
                    rows={2}
                    value={portal.extraNote}
                    onChange={(e) => setPortal({ ...portal, extraNote: e.target.value })}
                    placeholder="付款後請回傳後五碼…"
                  />
                </label>
                <p className="pca-hint" style={{ gridColumn: '1 / -1' }}>
                  開團專區小卡內容請至「開團專區管理」編輯；此處不影響開團資料。
                </p>
              </div>
            ) : null}

            {activeTab === 'news' ? (
              <div className="pca-list">
                {announcements.length === 0 ? (
                  <p className="pca-empty">尚無公告，點「新增公告」建立第一則。</p>
                ) : (
                  announcements.map((a, idx) => (
                    <article key={a.id || idx} className="pca-item">
                      <div className="pca-item-head">
                        <span className="pca-item-badge">公告 {idx + 1}</span>
                        <button
                          type="button"
                          className="pca-btn pca-btn--danger pca-btn--sm"
                          onClick={() => removeAnnouncement(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          刪除
                        </button>
                      </div>
                      <div className="pca-item-fields pca-item-fields--row">
                        <label className="pca-field">
                          <span className="pca-label">日期</span>
                          <input
                            className="pca-input"
                            value={a.date}
                            onChange={(e) => updateAnnouncement(idx, { date: e.target.value })}
                          />
                        </label>
                        <label className="pca-field">
                          <span className="pca-label">分類</span>
                          <select
                            className="pca-select"
                            value={a.category}
                            onChange={(e) => updateAnnouncement(idx, { category: e.target.value })}
                          >
                            {NEWS_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            {!NEWS_CATEGORIES.includes(a.category as typeof NEWS_CATEGORIES[number]) && a.category ? (
                              <option value={a.category}>{a.category}</option>
                            ) : null}
                          </select>
                        </label>
                        <label className="pca-field">
                          <span className="pca-label">標題</span>
                          <input
                            className="pca-input"
                            value={a.title}
                            onChange={(e) => updateAnnouncement(idx, { title: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="pca-field">
                        <span className="pca-label">內容</span>
                        <textarea
                          className="pca-textarea"
                          rows={2}
                          value={a.description || ''}
                          onChange={(e) => updateAnnouncement(idx, { description: e.target.value })}
                        />
                      </label>
                    </article>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === 'guide' ? (
              <div className="pca-list">
                <div className="pca-guide-infographics">
                  <h3 className="pca-subhead">代購流程說明圖（前台三張卡片）</h3>
                  <p className="pca-hint">
                    可改標題、說明與圖片網址。上傳僅供本機預覽；雲端儲存請使用圖片網址（Sheets 無法存大圖）。儲存後同步至訂單自助查詢。
                  </p>
                  {guideInfographics.map((g, idx) => (
                    <article key={g.id || idx} className="pca-item pca-guide-card">
                      <div className="pca-item-head">
                        <span className="pca-item-badge">流程圖 {idx + 1}</span>
                      </div>
                      <div className="pca-guide-card-layout">
                        <div className="pca-guide-preview">
                          {g.src ? (
                            <img src={g.src} alt={g.alt || g.title || ''} />
                          ) : (
                            <span className="pca-empty">尚無圖片</span>
                          )}
                        </div>
                        <div className="pca-guide-fields">
                          <label className="pca-field">
                            <span className="pca-label">標題</span>
                            <input
                              className="pca-input"
                              value={g.title}
                              onChange={(e) => updateGuide(idx, { title: e.target.value })}
                            />
                          </label>
                          <label className="pca-field">
                            <span className="pca-label">說明</span>
                            <textarea
                              className="pca-textarea"
                              rows={2}
                              value={g.desc}
                              onChange={(e) => updateGuide(idx, { desc: e.target.value })}
                            />
                          </label>
                          <label className="pca-field">
                            <span className="pca-label">圖片網址（可選）</span>
                            <input
                              className="pca-input"
                              value={g.src?.startsWith('data:') ? '' : g.src || ''}
                              onChange={(e) => updateGuide(idx, { src: e.target.value })}
                              placeholder="https://… 或下方上傳"
                            />
                          </label>
                          <label className="pca-field">
                            <span className="pca-label">上傳圖片</span>
                            <input
                              className="pca-file"
                              type="file"
                              accept="image/*"
                              onChange={(e) => void onGuideImageFile(idx, e.target.files?.[0] || null)}
                            />
                          </label>
                          {g.src?.startsWith('data:') ? (
                            <p className="pca-hint">目前使用已上傳圖片（data URL）</p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <h3 className="pca-subhead">文字步驟</h3>
                {processSteps.length === 0 ? (
                  <p className="pca-empty">尚無步驟，點「新增步驟」開始編輯購物流程。</p>
                ) : (
                  processSteps.map((s, idx) => (
                    <article key={idx} className="pca-item">
                      <div className="pca-item-head">
                        <span className="pca-item-badge">步驟 {s.n}</span>
                        <button
                          type="button"
                          className="pca-btn pca-btn--danger pca-btn--sm"
                          onClick={() => removeStep(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          刪除
                        </button>
                      </div>
                      <label className="pca-field">
                        <span className="pca-label">標題</span>
                        <input
                          className="pca-input"
                          value={s.title}
                          onChange={(e) => updateStep(idx, { title: e.target.value })}
                        />
                      </label>
                      <label className="pca-field">
                        <span className="pca-label">說明</span>
                        <textarea
                          className="pca-textarea"
                          rows={2}
                          value={s.detail}
                          onChange={(e) => updateStep(idx, { detail: e.target.value })}
                        />
                      </label>
                    </article>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === 'teach' ? (
              <div className="pca-list">
                {teachCards.map((card) => (
                  <article key={card.id} className="pca-item">
                    <div className="pca-item-head">
                      <span className="pca-item-badge">{card.title}</span>
                      <label className="pca-btn pca-btn--secondary pca-btn--sm">
                        <Plus className="h-3.5 w-3.5" />
                        上傳圖片
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            e.target.value = ''
                            void addTeachImage(card.id, file)
                          }}
                        />
                      </label>
                    </div>
                    {(card.images || []).length === 0 ? (
                      <p className="pca-empty">還沒有圖片。上傳後會出現在查詢頁這張教學卡裡。</p>
                    ) : (
                      <div className="pca-teach-images">
                        {(card.images || []).map((img) => (
                          <figure key={img.id} className="pca-teach-image">
                            <img src={img.src} alt={img.alt || card.title || ''} />
                            <button
                              type="button"
                              className="pca-btn pca-btn--danger pca-btn--sm"
                              onClick={() => removeTeachImage(card.id, img.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              刪除
                            </button>
                          </figure>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : null}

            {activeTab === 'faq' ? (
              <div className="pca-list">
                {faqItems.length === 0 ? (
                  <p className="pca-empty">尚無常見問題，點「新增問題」開始編輯。</p>
                ) : (
                  faqItems.map((f, idx) => (
                    <article key={f.id || idx} className="pca-item">
                      <div className="pca-item-head">
                        <span className="pca-item-badge">Q{idx + 1}</span>
                        <button
                          type="button"
                          className="pca-btn pca-btn--danger pca-btn--sm"
                          onClick={() => removeFaq(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          刪除
                        </button>
                      </div>
                      <label className="pca-field">
                        <span className="pca-label">問題</span>
                        <input
                          className="pca-input"
                          value={f.q}
                          onChange={(e) => updateFaq(idx, { q: e.target.value })}
                        />
                      </label>
                      <label className="pca-field">
                        <span className="pca-label">回答</span>
                        <textarea
                          className="pca-textarea"
                          rows={2}
                          value={f.a}
                          onChange={(e) => updateFaq(idx, { a: e.target.value })}
                        />
                      </label>
                    </article>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  )
}
