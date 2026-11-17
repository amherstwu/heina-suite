/** Unified Apps Script envelope (single `unifiedApi` entry). */

export type ModuleId = 'groupbuy' | 'ledger' | 'preorder' | 'storefront' | 'auth'

/** 官網公開現貨（不含倉位等內部欄位） */
export type PublicSpotProduct = {
  id: string
  name: string
  imageUrl: string
  sku: string
  category: string
  twdPrice: number
  stockQty: number
  status: string
  notes: string
}

export type StorefrontCatalogResult = {
  products: PublicSpotProduct[]
  updatedAt?: string
}

export type UnifiedRequest = {
  module: ModuleId
  action: string
  payload?: unknown
  /** Server session from auth/login. Omitted for public actions. */
  adminToken?: string
}

/** 顧客端公告（可由後台 JSON 字串擴充；缺省時前端使用預設列表） */
export type PortalAnnouncement = {
  id: string
  title: string
  date: string
  category: '重要' | '出貨' | '延遲' | '活動' | '系統' | string
  description?: string
}

export type PortalFaqItem = {
  id?: string
  q: string
  a: string
}

export type PortalProcessStep = {
  n: number
  title: string
  detail: string
}

/** --- Group buy (V50) --- */
export type PortalConfig = {
  title: string
  intro: string
  websiteUrl: string
  groupUrl: string
  extraNote: string
  /** 查詢訂單區塊標題下方說明（可於訂單自助後台編輯） */
  lookupDesc?: string
  /** GAS / 試算表常見擴充欄位（皆選填，不影響舊版） */
  brandName?: string
  subtitle?: string
  about?: string
  officialInfo?: string
  serviceUrl?: string
  linePayUrl?: string
  footer?: string
  lineFriendUrl?: string
  lineShoppingUrl?: string
  instagramUrl?: string
  threadsUrl?: string
  preorderShopUrl?: string
  spotShopUrl?: string
  /** JSON 字串或已解析陣列 */
  announcements?: PortalAnnouncement[] | string
  faqItems?: PortalFaqItem[] | string
  processSteps?: PortalProcessStep[] | string
  /** 顧客專區首頁開團預覽釘選（最多 3 個團 ID） */
  homeOpenGroupIds?: string[]
  /** 代購流程圖（購物／規則／匯率）；缺省用內建圖 */
  guideInfographics?: PortalGuideInfographic[]
}

export type PortalGuideInfographic = {
  id: string
  title: string
  desc: string
  /** 圖片網址或 data URL；空則用內建圖 */
  src?: string
  alt?: string
}

export type GroupBuyItem = {
  name: string
  qty: number
  jpy: number
  twd: number
}

export type GroupBuyOrder = {
  id: string
  customerName: string
  totalTwd: number
  deposit: number
  domesticShip: number
  intlShip: number
  balance: number
  paymentStatus: string
  paymentInfo: string
  items: GroupBuyItem[]
}

export type GroupBuyPurchaseCost = {
  id: string
  jpyCost?: string | number
  jpyShipping?: string | number
  jpyTotal?: string | number
  twdCost?: string | number
  logisticsId?: string
  weight?: string | number
}

/** 開團採購管道：場販／通販（舊資料「市場飯」視為場販） */
export type GroupBuyChannel = '場販' | '通販'

export type GroupBuyGroup = {
  id: string
  name: string
  status: string
  /** 場販或通販（舊資料可能缺省；請在開團專區設定） */
  channel?: GroupBuyChannel | ''
  /**
   * 是否出現在團務管理（已成團）。
   * 僅通販適用；場販即使為 true 也不會出現在團務管理。
   * 缺省／true＝顯示；false＝僅開團專區預告，尚未建團務小卡。
   */
  opsActive?: boolean
  /**
   * 是否公開於開團專區。
   * 缺省／true＝顯示；false＝僅內部團務、不給客人看。
   */
  portalListed?: boolean
  closingDate: string
  saleEndDate: string
  officialShipDate: string
  /** V50：購買日期 */
  purchaseDate?: string
  /** V50：採購信用卡名稱或尾碼 */
  creditCard?: string
  jpyAmount: string | number
  /** 下單後填寫：可多筆下單成本 */
  purchaseCosts?: GroupBuyPurchaseCost[]
  /** @deprecated 請改用 purchaseCosts */
  jpyCost?: string | number
  /** @deprecated 請改用 purchaseCosts */
  jpyShipping?: string | number
  /** @deprecated 請改用 purchaseCosts */
  jpyTotal?: string | number
  /** @deprecated 請改用 purchaseCosts */
  twdCost?: string | number
  /** @deprecated 請改用 purchaseCosts */
  weight?: string | number
  orderId: string
  logisticsId: string
  purchaseLink: string
  /** 開團專區：團務說明 */
  description?: string
  /** 開團專區：封面圖 URL（相容舊版；首圖） */
  coverImageUrl?: string
  /** 開團專區：多張圖片 URL 或 data URL */
  imageUrls?: string[]
  /** 開團專區／團務小卡備註 */
  remarks?: string
  orders: GroupBuyOrder[]
}

/** 顧客開團專區列表（不含客訂明細） */
export type PublicGroupCatalogItem = {
  id: string
  name: string
  status: string
  closingDate: string
  officialShipDate: string
  description: string
  coverImageUrl: string
  imageUrls: string[]
  remarks: string
  /** 場販／通販（開團專區設定） */
  channel?: GroupBuyChannel | ''
  /** 是否已成團（有對應團務管理） */
  opsActive?: boolean
  portalListed?: boolean
}

export type PublicGroupCatalogResult = {
  groups: PublicGroupCatalogItem[]
}

export type BankJournalRow = {
  id: string
  date: string
  bank: string
  type: string
  amount: number
  category: string
  note: string
}

export type GroupBuyAppData = {
  groups: GroupBuyGroup[]
  bankJournal: BankJournalRow[]
  exchangeRate: number
  portalConfig: PortalConfig
  paymentReports?: CustomerPaymentReport[]
  /** 自助查單密碼（由代購後台客人列表同步） */
  portalLookupCustomers?: PortalLookupCustomer[]
  /** 帳務備註（由客戶列表同步，供付款回報勾選） */
  customerBalanceMemos?: SharedCustomerBalanceMemo[]
  /** 銀行帳號安全查詢（getAppData 不含明文密碼） */
  bankViewer?: BankViewerPublicMeta
}

export type GroupBuySavePayload = {
  groups: GroupBuyGroup[]
  bankJournal: BankJournalRow[]
  exchangeRate: number
  portalConfig: PortalConfig
  paymentReports?: CustomerPaymentReport[]
  portalLookupCustomers?: PortalLookupCustomer[]
  customerBalanceMemos?: SharedCustomerBalanceMemo[]
}

/** 顧客自助查單用：姓名／LINE 與 4 碼密碼 */
export type PortalLookupCustomer = {
  name: string
  lineDisplayName: string
  lookupPin: string
}

/** 跨端同步的帳務備註（掛客人姓名） */
export type SharedCustomerBalanceMemo = {
  id: string
  customerName: string
  amountTwd: number
  status: 'open' | 'settled'
  settledAt?: number
  settledNote?: string
}

/** 銀行帳號查詢：公開 meta（不含密碼） */
export type BankViewerPublicMeta = {
  enabled: boolean
  passwordSet: boolean
  passwordUpdatedAt: number
  monthsSincePasswordUpdate: number
}

export type BankViewerAccessLog = {
  id: string
  at: number
  customerName: string
  ok: boolean
  reason: 'ok' | 'bad_password' | 'empty_name' | 'disabled' | 'empty_password'
}

/** 後台完整設定（含密碼與紀錄） */
export type BankViewerAdminConfig = {
  enabled: boolean
  /** 查詢密碼（不用 password 欄名，避免部分環境異常） */
  accessPassword: string
  passwordUpdatedAt: number
  bankInfo: string
  logs: BankViewerAccessLog[]
}

export type VerifyBankViewerAccessPayload = {
  /** 查詢密碼 */
  accessPassword: string
  customerName: string
}

export type VerifyBankViewerAccessResult = {
  ok: boolean
  message?: string
  bankInfo?: string
}

export type SaveBankViewerPayload = {
  enabled?: boolean
  bankInfo?: string
  /** 留空不改密碼 */
  newPassword?: string
  clearLogs?: boolean
}

/** 上架 Ready：Sheets／Excel 資料包 */
export type HeinaDataPackPayload = {
  packVersion: number
  exportedAt: string
  source: 'gas' | 'mock' | 'file'
  orderRows: (string | number)[][]
  journalRows: (string | number)[][]
  settingsRows: (string | number)[][]
  groupSummaryRows: (string | number)[][]
}

export type ExportDataPackResult = {
  ok: boolean
  message?: string
  pack?: HeinaDataPackPayload
}

export type ImportDataPackPayload = {
  mode: 'replace' | 'merge'
  pack: HeinaDataPackPayload
  sheets?: Array<'訂單明細' | '銀行日記帳' | '系統設定'>
}

export type ImportDataPackResult = {
  ok: boolean
  message?: string
  counts?: {
    orderRows: number
    journalRows: number
    settingsRows: number
  }
}

export type CustomerPaymentReportStatus = 'pending' | 'confirmed'

export type CustomerPaymentReportLine = {
  orderId: string
  groupId: string
  groupName: string
  lookupCode: string
  deposit: number
  /** 送出回報時的應收訂金 */
  expectedDeposit?: number
  /** 已確認後標記尚須補款 */
  needsSupplement?: boolean
  /** 累計補款金額 */
  supplementTotal?: number
}

export type CustomerPaymentReportSource = 'customer' | 'admin_review'

export type CustomerPaymentReport = {
  id: string
  customerName: string
  remittanceDate: string
  lastFive: string
  totalAmount: number
  /** 客人自助填寫的匯款總金額（確認後仍保留） */
  reportedTotalAmount?: number
  orderIds: string[]
  lines: CustomerPaymentReportLine[]
  status: CustomerPaymentReportStatus
  submittedAt: number
  confirmedAt?: number
  confirmedBank?: string
  /** 確認時寫入的日記帳 ID，供返回待確認或刪除時沖銷 */
  journalEntryId?: string
  /** 客人自助回報 vs 付款審核主動沖銷 */
  source?: CustomerPaymentReportSource
  /**
   * 付款回報時勾選的帳務備註（確認回報後結清→已抵銷；未勾選則留到出貨物流）
   */
  balanceMemos?: { id: string; amountTwd: number }[]
}

export type SubmitCustomerPaymentReportPayload = {
  customerName: string
  remittanceDate: string
  lastFive: string
  totalAmount: number
  orderIds: string[]
  /** 本次一併回報的帳務備註（確認後才結清） */
  balanceMemos?: { id: string; amountTwd: number }[]
}

export type SubmitCustomerPaymentReportResult = {
  ok: boolean
  reportId?: string
  message?: string
}

export type ConfirmPaymentReportPayload = {
  reportId: string
  remittanceBank?: string
  /** 管理員調整後的各訂單實收訂金 */
  lineDeposits?: Record<string, number>
  /** 本次要確認沖銷的訂單（未勾選的團務維持未付款） */
  selectedOrderIds?: string[]
}

export type UpdatePaymentReportLineFlagsPayload = {
  reportId: string
  orderId: string
  needsSupplement: boolean
}

export type SupplementPaymentReportPayload = {
  reportId: string
  orderId: string
  amount: number
  remittanceDate?: string
  remittanceBank?: string
  note?: string
}

export type DeletePaymentReportPayload = {
  reportId: string
}

export type DeletePaymentReportResult = {
  ok: boolean
  message?: string
}

export type RevertPaymentReportPayload = {
  reportId: string
}

export type RevertPaymentReportResult = {
  ok: boolean
  message?: string
}

/** 顧客自助查詢（僅回傳必要欄位，不含銀行日記帳） */
export type CustomerLookupOrder = Pick<
  GroupBuyOrder,
  | 'id'
  | 'customerName'
  | 'totalTwd'
  | 'deposit'
  | 'domesticShip'
  | 'intlShip'
  | 'balance'
  | 'paymentStatus'
  | 'paymentInfo'
  | 'items'
>

export type CustomerLookupMatch = {
  groupId: string
  groupName: string
  groupStatus: string
  closingDate: string
  saleEndDate: string
  officialShipDate: string
  purchaseLink: string
  description?: string
  coverImageUrl?: string
  imageUrls?: string[]
  remarks?: string
  /** 團務訂單號／物流號（GAS 顧客查詢可一併回傳） */
  groupOrderId?: string
  logisticsId?: string
  order: CustomerLookupOrder
}

/** 顧客查詢可選附帶：目前等級與禮遇（不含累積消費金額；門檻由後台認列） */
export type PortalLookupMembership = {
  tierId: string
  tierLabel: string
  benefits: string[]
  tierLocked?: boolean
}

export type CustomerLookupResult = {
  portalConfig: PortalConfig
  matches: CustomerLookupMatch[]
  membership?: PortalLookupMembership | null
  lookupError?: string
}

export type CustomerLookupPayload = {
  customerName: string
  lookupPin?: string
}

/** --- Ledger --- */
export type LedgerTrip = {
  id: string
  name: string
  createdAt: number
  clientId: string
}

export type LedgerTx = {
  id: string
  tripId: string
  amount: number
  note: string
  type: string
  category: string
  date: string
  timestamp: number
  clientId: string
  payMethod: string
  currency: string
}

export type LedgerItem = {
  id: string
  name: string
  createdAt: number
  clientId: string
}

export type LedgerSettings = Record<string, string>

export type LedgerInitData = {
  appName: string
  trips: LedgerTrip[]
  currentTripId: string | null
  transactions: LedgerTx[]
  items: LedgerItem[]
  settings: LedgerSettings
}

/** Body for addTransaction (matches GAS addTransaction clientId + payload). */
export type LedgerAddTxBody = {
  tripId: string
  amount: number
  note: string
  type: string
  category: string
  date: string
  payMethod: string
  currency: string
}

/** --- Preorder (normalized sheets model) --- */
export type PreorderItem = {
  id: string
  name: string
  qty: number
  jpy: number
  twd: number
}

export type PreorderOrder = {
  id: string
  customerName: string
  paymentStatus: string
  paymentInfo: string
  deposit: number
  domesticShip: number
  intlShip: number
  totalTwd: number
  balance: number
  items: PreorderItem[]
}

export type PreorderGroup = {
  id: string
  name: string
  status: string
  closingDate: string
  saleEndDate: string
  purchaseDate: string
  purchasePlace: string
  officialShipDate: string
  jpyAmount: string | number
  creditCard: string
  orderId: string
  logisticsId: string
  purchaseLink: string
  orders: PreorderOrder[]
}

/** 預購表（Preorder.gs）顧客暱稱查單，欄位與開團查詢對齊並多帶採購日 */
export type PreorderLookupMatch = {
  groupId: string
  groupName: string
  groupStatus: string
  closingDate: string
  saleEndDate: string
  purchaseDate: string
  officialShipDate: string
  purchaseLink: string
  groupOrderId?: string
  logisticsId?: string
  order: PreorderOrder
}

export type PreorderCustomerLookupResult = {
  portalConfig: PortalConfig
  matches: PreorderLookupMatch[]
  membership?: PortalLookupMembership | null
  lookupError?: string
}
