import type { CustomerLookupMatch, PortalLookupMembership, PreorderLookupMatch } from '../../api/types'
import { labelGroupStatus } from '../customerLookupArrival'
import { CUSTOMER_TIMELINE_LABELS, customerOrderTimelineStep } from './orderTimeline'
import { usePortalBrowse } from './usePortalBrowse'
import { dash, formatTwd } from './portalUtils'
import { IconArrowRight, IconSearch } from './PortalIcons'

function pillTone(status: string) {
  const s = String(status || '')
  if (/已付|完成|對帳|付清/.test(s)) return 'ok'
  if (/未付|待|尾款/.test(s)) return 'warn'
  if (/退|取消/.test(s)) return 'muted'
  return 'neu'
}

function PaymentShipBadges({ payment, groupStatus }: { payment: string; groupStatus: string }) {
  const shipLabel = labelGroupStatus(groupStatus)
  return (
    <div className="kp-badge-row">
      <span className={'kp-badge kp-badge-pay kp-tone-' + pillTone(payment)}>{payment || '尚未更新'}</span>
      <span className="kp-badge kp-badge-ship">{shipLabel}</span>
    </div>
  )
}

function TimelineVisual({ groupStatus, paymentStatus }: { groupStatus: string; paymentStatus: string }) {
  const step = customerOrderTimelineStep(groupStatus, paymentStatus)
  if (step < 0) {
    return <p className="kp-timeline-cancel">此筆訂單狀態為取消或結案，進度條不適用。</p>
  }
  return (
    <div className="kp-timeline" aria-label="訂單進度">
      <p className="kp-timeline-title">訂單進度</p>
      <div className="kp-timeline-rail">
        {CUSTOMER_TIMELINE_LABELS.map((lab, i) => (
          <div key={lab} className="kp-timeline-node">
            <div className={'kp-timeline-dot ' + (i <= step ? ' on' : '')} />
            {i < CUSTOMER_TIMELINE_LABELS.length - 1 ? (
              <div className={'kp-timeline-line ' + (i < step ? ' on' : '')} />
            ) : null}
          </div>
        ))}
      </div>
      <ol className="kp-timeline-labels">
        {CUSTOMER_TIMELINE_LABELS.map((lab, i) => (
          <li key={lab} className={i <= step ? 'on' : ''}>
            {lab}
          </li>
        ))}
      </ol>
    </div>
  )
}

function OrderCardGb({
  m,
  open,
  onToggle,
}: {
  m: CustomerLookupMatch
  open: boolean
  onToggle: () => void
}) {
  const tone = pillTone(m.order.paymentStatus)
  const tstep = customerOrderTimelineStep(m.groupStatus, m.order.paymentStatus)
  return (
    <li className={'kp-order-li kp-tone-' + tone + (open ? ' is-open' : '')}>
      <button type="button" className="kp-order-head" aria-expanded={open} onClick={onToggle}>
        <div className="kp-order-head-main">
          <span className="kp-order-channel">團購</span>
          <h3 className="kp-order-title">{m.groupName}</h3>
          <p className="kp-order-sub">訂單編號 {dash(m.order.id)}</p>
          <PaymentShipBadges payment={m.order.paymentStatus} groupStatus={m.groupStatus} />
        </div>
        <span className="kp-order-chev" aria-hidden>
          <IconArrowRight className={'kp-chev-svg' + (open ? ' open' : '')} />
        </span>
      </button>
      {!open && tstep >= 0 ? (
        <div className="kp-order-collapsed-hint">
          <TimelineVisual groupStatus={m.groupStatus} paymentStatus={m.order.paymentStatus} />
        </div>
      ) : null}
      {open ? (
        <div className="kp-order-body">
          <TimelineVisual groupStatus={m.groupStatus} paymentStatus={m.order.paymentStatus} />
          <dl className="kp-dl-grid">
            <div>
              <dt>團名／系列</dt>
              <dd>{dash(m.groupName)}</dd>
            </div>
            <div>
              <dt>結單日</dt>
              <dd>{dash(m.closingDate)}</dd>
            </div>
            <div>
              <dt>結束販賣日</dt>
              <dd>{dash(m.saleEndDate)}</dd>
            </div>
            <div>
              <dt>官方出貨日</dt>
              <dd>{dash(m.officialShipDate)}</dd>
            </div>
            <div>
              <dt>團訂單號</dt>
              <dd>{dash(m.groupOrderId)}</dd>
            </div>
            <div>
              <dt>物流號碼</dt>
              <dd>{dash(m.logisticsId)}</dd>
            </div>
            <div>
              <dt>訂金</dt>
              <dd>{formatTwd(m.order.deposit)}</dd>
            </div>
            <div>
              <dt>尾款</dt>
              <dd>{formatTwd(m.order.balance)}</dd>
            </div>
            <div>
              <dt>台幣總額</dt>
              <dd>{formatTwd(m.order.totalTwd)}</dd>
            </div>
            <div>
              <dt>國內運費</dt>
              <dd>{formatTwd(m.order.domesticShip)}</dd>
            </div>
            <div>
              <dt>國際運費</dt>
              <dd>{formatTwd(m.order.intlShip)}</dd>
            </div>
            <div className="kp-dl-span">
              <dt>購買連結</dt>
              <dd>
                {m.purchaseLink ? (
                  <a href={m.purchaseLink} target="_blank" rel="noreferrer" className="kp-inline-link">
                    開啟連結
                  </a>
                ) : (
                  '尚未更新'
                )}
              </dd>
            </div>
            <div className="kp-dl-span">
              <dt>備註／付款紀錄</dt>
              <dd>{dash(m.order.paymentInfo)}</dd>
            </div>
          </dl>
          <div className="kp-items-block">
            <p className="kp-items-title">商品明細</p>
            <ul className="kp-items">
              {(m.order.items || []).map((it, i) => (
                <li key={i}>
                  <span className="kp-item-name">{dash(it.name)}</span>
                  <span>×{it.qty}</span>
                  <span>{formatTwd(it.twd)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function OrderCardPo({
  m,
  open,
  onToggle,
}: {
  m: PreorderLookupMatch
  open: boolean
  onToggle: () => void
}) {
  const tone = pillTone(m.order.paymentStatus)
  const tstep = customerOrderTimelineStep(m.groupStatus, m.order.paymentStatus)
  return (
    <li className={'kp-order-li kp-tone-' + tone + (open ? ' is-open' : '')}>
      <button type="button" className="kp-order-head" aria-expanded={open} onClick={onToggle}>
        <div className="kp-order-head-main">
          <span className="kp-order-channel kp-order-channel-po">預購</span>
          <h3 className="kp-order-title">{m.groupName}</h3>
          <p className="kp-order-sub">訂單編號 {dash(m.order.id)}</p>
          <PaymentShipBadges payment={m.order.paymentStatus} groupStatus={m.groupStatus} />
        </div>
        <span className="kp-order-chev" aria-hidden>
          <IconArrowRight className={'kp-chev-svg' + (open ? ' open' : '')} />
        </span>
      </button>
      {!open && tstep >= 0 ? (
        <div className="kp-order-collapsed-hint">
          <TimelineVisual groupStatus={m.groupStatus} paymentStatus={m.order.paymentStatus} />
        </div>
      ) : null}
      {open ? (
        <div className="kp-order-body">
          <TimelineVisual groupStatus={m.groupStatus} paymentStatus={m.order.paymentStatus} />
          <dl className="kp-dl-grid">
            <div>
              <dt>團名／系列</dt>
              <dd>{dash(m.groupName)}</dd>
            </div>
            <div>
              <dt>採購／處理日</dt>
              <dd>{dash(m.purchaseDate)}</dd>
            </div>
            <div>
              <dt>結單日</dt>
              <dd>{dash(m.closingDate)}</dd>
            </div>
            <div>
              <dt>結束販賣日</dt>
              <dd>{dash(m.saleEndDate)}</dd>
            </div>
            <div>
              <dt>官方出貨日</dt>
              <dd>{dash(m.officialShipDate)}</dd>
            </div>
            <div>
              <dt>團訂單號</dt>
              <dd>{dash(m.groupOrderId)}</dd>
            </div>
            <div>
              <dt>物流號碼</dt>
              <dd>{dash(m.logisticsId)}</dd>
            </div>
            <div>
              <dt>訂金</dt>
              <dd>{formatTwd(m.order.deposit)}</dd>
            </div>
            <div>
              <dt>尾款</dt>
              <dd>{formatTwd(m.order.balance)}</dd>
            </div>
            <div>
              <dt>台幣總額</dt>
              <dd>{formatTwd(m.order.totalTwd)}</dd>
            </div>
            <div>
              <dt>國內運費</dt>
              <dd>{formatTwd(m.order.domesticShip)}</dd>
            </div>
            <div>
              <dt>國際運費</dt>
              <dd>{formatTwd(m.order.intlShip)}</dd>
            </div>
            <div className="kp-dl-span">
              <dt>購買連結</dt>
              <dd>
                {m.purchaseLink ? (
                  <a href={m.purchaseLink} target="_blank" rel="noreferrer" className="kp-inline-link">
                    開啟連結
                  </a>
                ) : (
                  '尚未更新'
                )}
              </dd>
            </div>
            <div className="kp-dl-span">
              <dt>備註／付款紀錄</dt>
              <dd>{dash(m.order.paymentInfo)}</dd>
            </div>
          </dl>
          <div className="kp-items-block">
            <p className="kp-items-title">商品明細</p>
            <ul className="kp-items">
              {(m.order.items || []).map((it, i) => (
                <li key={it.id || i}>
                  <span className="kp-item-name">{dash(it.name)}</span>
                  <span>×{it.qty}</span>
                  <span>{formatTwd(it.twd)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function PortalOrderExperience({
  query,
  setQuery,
  loading,
  error,
  searched,
  matchesGroupbuy,
  matchesPreorder,
  totalMatches,
  expandedId,
  setExpandedId,
  onSearch,
  membership = null,
}: {
  query: string
  setQuery: (v: string) => void
  loading: boolean
  error: string
  searched: boolean
  matchesGroupbuy: CustomerLookupMatch[]
  matchesPreorder: PreorderLookupMatch[]
  totalMatches: number
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onSearch: () => void
  membership?: PortalLookupMembership | null
}) {
  const { navigatePortalAnchor } = usePortalBrowse()
  const firstName =
    matchesGroupbuy[0]?.order.customerName ||
    matchesPreorder[0]?.order.customerName ||
    '—'
  const pendingSum =
    matchesGroupbuy.reduce((a, m) => a + m.order.balance, 0) + matchesPreorder.reduce((a, m) => a + m.order.balance, 0)

  return (
    <section id="order-search" className="kp-section kp-order-section">
      <div className="kp-section-head">
        <h2 className="kp-h2">查詢我的訂單</h2>
        <p className="kp-lead">
          可一次查詢「團購／開團」與「預購表」兩邊的訂單。請輸入與留單時相同的 LINE 顯示名稱、社群暱稱，或您手邊的訂單編號（格式依代購主公告為準）。
        </p>
        <p className="kp-lead kp-order-lead-second">
          為了保護你的訂單資料，請至少輸入兩項資訊進行查詢。查詢結果會顯示訂金、尾款／補款、運費與出貨與物流進度。關於會員等級：本頁<strong>不顯示</strong>用於升等的累積金額或門檻數字；若有回傳等級摘要，僅顯示禮遇說明。完整制度請見下方「會員禮遇與等級制度」。
        </p>
      </div>

      <div className="kp-order-body">
        <div className="kp-order-col-search">
      <div className="kp-search-shell">
        <label htmlFor="kp-order-input" className="kp-sr-only">
          社群暱稱或訂單編號
        </label>
        <div className="kp-search-row">
          <span className="kp-search-icon" aria-hidden>
            <IconSearch />
          </span>
          <input
            id="kp-order-input"
            className="kp-search-input"
            placeholder="輸入暱稱、LINE 名稱、訂單編號、手機末三碼或商品名稱"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch()
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button type="button" className="kp-search-submit" disabled={loading} onClick={onSearch} aria-busy={loading}>
            {loading ? (
              <span className="kp-spinner" />
            ) : (
              <>
                <span className="kp-sr-only">查詢我的訂單</span>
                <IconArrowRight className="kp-search-arrow" />
              </>
            )}
          </button>
        </div>
        <p className="kp-search-helper">請確認金額後再匯款。完成付款後，記得回傳後五碼或付款截圖，方便我們協助核對。</p>
        <p className="kp-search-micro">
          若曾更改社群暱稱，請務必私訊官方 LINE 協助更新。家人代留單者請用當時留單的暱稱查詢；仍無法排除時請聯絡代購主並提供付款截圖以利人工比對。
        </p>
      </div>
        </div>

        <div className="kp-order-col-results">
      {error ? (
        <div className="kp-alert" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="kp-loading-msg" aria-live="polite">
          查詢中…
        </p>
      ) : null}

      {searched && !loading && !error && totalMatches === 0 ? (
        <div className="kp-empty">
          <div className="kp-empty-illus" aria-hidden />
          <h3 className="kp-empty-title">目前查不到符合條件的訂單</h3>
          <p className="kp-empty-text">
            目前查不到符合條件的訂單。請確認暱稱、手機末三碼或訂單編號是否正確；如果仍有問題，請聯絡代購主協助確認。
          </p>
          <div className="kp-empty-actions">
            <button type="button" className="kp-btn-secondary" onClick={() => setQuery('')}>
              重新查詢
            </button>
            <button type="button" className="kp-btn-primary" onClick={() => navigatePortalAnchor('support')}>
              聯絡客服
            </button>
          </div>
        </div>
      ) : null}

      {searched && !loading && totalMatches > 0 ? (
        <div className="kp-results-wrap">
          {membership ? (
            <div className="kp-mship-snippet-card" role="region" aria-label="會員禮遇摘要">
              <p className="kp-mship-snippet-label">您目前的會員禮遇</p>
              <p className="kp-mship-snippet-tier">{membership.tierLabel}</p>
              {membership.tierLocked ? <p className="kp-mship-snippet-lock">（等級已由闆娘手動鎖定，調整請洽客服）</p> : null}
              <ul className="kp-mship-snippet-ul">
                {membership.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="kp-mship-snippet-note">
                此區僅顯示禮遇說明，不顯示累積消費金額或升等門檻。實際折扣、加價購或活動資格仍以社群／記事本／官方 LINE 最新公告為準。
              </p>
            </div>
          ) : null}

          <div className="kp-summary-card">
            <h3 className="kp-summary-title">查詢摘要</h3>
            <dl className="kp-summary-dl">
              <div>
                <dt>社群暱稱</dt>
                <dd>{firstName}</dd>
              </div>
              <div>
                <dt>訂單筆數</dt>
                <dd>{totalMatches} 筆</dd>
              </div>
              <div>
                <dt>待付尾款合計（參考）</dt>
                <dd>{formatTwd(pendingSum)}</dd>
              </div>
            </dl>
            <p className="kp-summary-note">
              上列「待付尾款合計」為各筆訂單尾款加總之參考值，不含可能尚未入帳之調整、二補運費或闆娘後台手動改價。實際應繳金額以團主對帳、私訊通知與公告為準。若與您認知差異大，請先不要自行匯款，務必截圖本頁並聯絡客服。
            </p>
          </div>

          {matchesGroupbuy.length > 0 ? (
            <>
              <h4 className="kp-result-block-title">團購／開團訂單</h4>
              <ul className="kp-order-list">
                {matchesGroupbuy.map((m) => {
                  const id = `gb-${m.groupId}-${m.order.id}`
                  const open = expandedId === id
                  return (
                    <OrderCardGb key={id} m={m} open={open} onToggle={() => setExpandedId(open ? null : id)} />
                  )
                })}
              </ul>
            </>
          ) : null}

          {matchesPreorder.length > 0 ? (
            <>
              <h4 className="kp-result-block-title">預購表訂單</h4>
              <ul className="kp-order-list">
                {matchesPreorder.map((m) => {
                  const id = `po-${m.groupId}-${m.order.id}`
                  const open = expandedId === id
                  return (
                    <OrderCardPo key={id} m={m} open={open} onToggle={() => setExpandedId(open ? null : id)} />
                  )
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
        </div>
      </div>
    </section>
  )
}
