/** HelpMeBuy Pro / Daigou OS — 資料模型（未來可對接 Firebase / Supabase / Sheets） */

import type { CustomerBalanceMemo } from './customerBalanceMemo'

export type { CustomerBalanceMemo } from './customerBalanceMemo'

export type User = {
  id: string
  name: string
  email?: string
  role: 'admin' | 'staff'
}

export type GroupStatus =
  | 'draft'
  | 'open'
  | 'closing_soon'
  | 'closed'
  | 'ordered'
  | 'waiting_official_ship'
  | 'international_transit'
  | 'waiting_arrival'
  | 'arrived'
  | 'sorting'
  | 'balance_collection'
  | 'shipping'
  | 'completed'
  | 'cancelled'

export type Group = {
  id: string
  name: string
  status: GroupStatus
  closingDate: string
  saleEndDate: string
  officialShipDate: string
  exchangeRate: number
  jpyAmountTotal: number
  orderNumber: string
  logisticsNumber: string
  purchaseLink: string
  notes: string
  createdAt: number
  /** 商業欄位（選填，舊資料相容） */
  groupCode?: string
  coverImageUrl?: string
  ipSeries?: string
  supplierName?: string
  pricingMultiplier?: number
  actualOrderDate?: string
  estimatedArrivalDate?: string
  actualArrivalDate?: string
  customerAnnouncement?: string
  internalNotes?: string
  archived?: boolean
  taxReserveRate?: number
  packagingFeeRule?: string
  autoPriceRule?: string
}

/** 現貨商城上架狀態（與團購品項分開管理） */
export type SpotListingStatus = 'on_sale' | 'paused' | 'sold_out'

export type SpotProduct = {
  id: string
  name: string
  imageUrl: string
  sku: string
  category: string
  twdPrice: number
  stockQty: number
  status: SpotListingStatus
  /** 倉位／取貨編碼，方便一線找貨 */
  shelfCode: string
  notes: string
  createdAt: number
}

export type ProductStatus =
  | 'draft'
  | 'open_preorder'
  | 'almost_sold_out'
  | 'available'
  | 'low_stock'
  | 'sold_out'
  | 'closed'
  | 'closed_preorder'
  | 'ordered_po'
  | 'arrived_stock'
  | 'shortage'
  | 'cancelled_product'

export type Product = {
  id: string
  groupId?: string
  productCode?: string
  name: string
  imageUrl: string
  /** 多圖（第一張可同 imageUrl） */
  imageGallery?: string[]
  category: string
  ipSeries: string
  characterName?: string
  supplier?: string
  purchaseUrl?: string
  jpyPrice: number
  twdPrice: number
  exchangeMultiplier: number
  pricingRule?: string
  isBlindBox: boolean
  canOpenBlindBox: boolean
  openingFee: number
  stockQty: number
  preorderQty: number
  preorderLimit?: number
  remainingQuota?: number
  limitPerCustomer: number
  costEstimate?: number
  profitEstimate?: number
  weightEstimate?: number
  volumeEstimate?: number
  customerNote?: string
  internalNote?: string
  status: ProductStatus
}

export type OrderStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'waiting_deposit'
  | 'deposit_paid'
  | 'ordered'
  | 'waiting_arrival'
  | 'arrived'
  | 'sorting'
  | 'waiting_balance'
  | 'fully_paid'
  | 'ready_to_ship'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'risk_flagged'
  | 'stockout_refund'
  | 'exception'

export type PaymentStatus =
  | 'unpaid'
  | 'deposit_paid'
  | 'balance_due'
  | 'fully_paid'
  | 'refunded'
  | 'overpaid'
  | 'partial_refund'
  | 'bad_debt'

export type OrderItem = {
  productId: string
  name: string
  qty: number
  jpyUnit: number
  twdUnit: number
}

export type Order = {
  id: string
  lookupCode: string
  customerId: string
  groupId: string
  items: OrderItem[]
  deposit: number
  balance: number
  domesticShipping: number
  internationalShipping: number
  /** 整單折扣（正數＝折抵金額） */
  discount?: number
  packagingFee?: number
  otherFee?: number
  totalAmount: number
  /** 已入帳收款合計（示範可由分錄加總或手動） */
  totalReceived?: number
  /** 應收未收（可由 totalAmount − totalReceived 推算，亦可儲存） */
  outstandingAmount?: number
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  riskFlag?: boolean
  /** 客戶備註 */
  customerNote?: string
  /** 內部備註（舊版 notes 仍保留） */
  internalNote?: string
  notes: string
  createdAt: number
  updatedAt?: number
}

export type CustomerTag =
  | 'vip'
  | 'frequent_buyer'
  | 'new_customer'
  | 'risk'
  | 'blacklist'
  | 'low_pickup'
  | 'manual_review'
  | 'high_spend'
  | 'overdue_pickup'
  | 'good_payment'
  | 'frequent_changes'

/** 會員等級（門檻與福利文案見 `membershipTiers.ts`） */
export type MembershipTierId = 'regular' | 'bronze' | 'silver' | 'gold' | 'platinum'

export type Customer = {
  id: string
  name: string
  realName?: string
  lineDisplayName: string
  phoneLast3: string
  email?: string
  socialAccount: string
  tags: CustomerTag[]
  riskScore: number
  pickupReliability: number
  totalOrders: number
  totalUnpaidBalance: number
  totalSpent?: number
  totalCancelledOrders?: number
  totalUnpickedPackages?: number
  lastOrderAt?: string
  notes: string
  /** 面運抵扣、折扣、待補欠款等；出貨時可抵銷 */
  balanceMemos?: CustomerBalanceMemo[]
  /** 目前會員等級（買家端僅顯示等級名與福利，不顯示金額） */
  membershipTierId?: MembershipTierId
  /**
   * 後台用：依訂單「已實收」加總之累計認列消費（TWD），用於升等計算；可手動同步。
   * 不在客戶查詢頁對買家顯示。
   */
  membershipSpendTwd?: number
  /** 為 true 時依訂單重算不會改等級（闆娘手動指定禮遇／爭議處理） */
  membershipTierLocked?: boolean
  /** 自助查單 4 位數密碼（由後台客人列表設定） */
  lookupPin?: string
  /** 客人常用匯款帳號後五碼（可多筆，對帳／搜尋用） */
  bankLastFiveCodes?: string[]
  /** 加入／建立時間（ms）；舊資料可能缺） */
  createdAt?: number
}

export type TransactionType = 'income' | 'expense' | 'refund' | 'adjustment' | 'transfer' | 'tax_reserve'

export type TransactionCategory =
  | 'deposit'
  | 'balance'
  | 'domestic_shipping'
  | 'international_shipping'
  | 'shipping_income'
  | 'exchange_gain'
  | 'product_cost'
  | 'jp_domestic_shipping'
  | 'packaging'
  | 'transportation'
  | 'accommodation'
  | 'tax_reserve'
  | 'platform_fee'
  | 'refund'
  | 'other'

export type ReconciliationStatus = 'pending' | 'cleared'

export type Transaction = {
  id: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  currency: 'TWD' | 'JPY' | 'USD'
  exchangeRate?: number
  groupId?: string
  orderId?: string
  customerId?: string
  date: string
  note: string
  paymentMethod?: string
  bankAccount?: string
  receiptImageUrl?: string
  createdBy?: string
  reconciliationStatus?: ReconciliationStatus
  createdAt: number
}

export type ShipmentStatus = 'not_packed' | 'packed' | 'shipped' | 'delivered' | 'returned'

export type Shipment = {
  id: string
  orderId: string
  customerId: string
  carrier: string
  trackingNo: string
  status: ShipmentStatus
  shipDate: string
  notes: string
}

/** 出貨紀錄狀態（完整物流生命週期） */
export type ShipmentRecordStatus =
  | '未包裝'
  | '已包裝'
  | '待寄出'
  | '已寄出'
  | '運送中'
  | '已到店'
  | '已取貨'
  | '逾期未取'
  | '退回'
  | '遺失 / 異常'
  | '已完成'

/** 出貨紀錄（與舊版 Shipment 並存；此為主歷程） */
export type ShipmentRecord = {
  id: string
  orderId: string
  customerId: string
  groupId?: string
  shippingMethod: string
  carrier: string
  trackingNo?: string
  packageCount: number
  packageWeight?: number
  shippingFee: number
  packagingFee?: number
  status: ShipmentRecordStatus
  shippedAt?: string
  deliveredAt?: string
  receiverName: string
  receiverPhone: string
  receiverAddress?: string
  receiverStoreName?: string
  receiverStoreId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type MyShipStatus =
  | '尚未建立'
  | '已建立寄件單'
  | '待列印'
  | '已列印'
  | '待寄件'
  | '已寄件'
  | '運送中'
  | '已到店'
  | '待取貨'
  | '已取貨'
  | '逾期未取'
  | '退回中'
  | '已退回'
  | '異常'

export type MyShipPaymentType = '純寄件' | '貨到付款' | '已收款寄件' | '運費自付' | '運費由買家負擔'

export type MyShipPackageSize = '小包' | '中包' | '大包' | '自訂'

/** 7-ELEVEN 賣貨便／MyShip 紀錄 */
export type MyShipRecord = {
  id: string
  orderId: string
  /** 對應 ShipmentRecord.id */
  shipmentId?: string
  customerId: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  receiverStoreName: string
  receiverStoreId: string
  receiverStoreAddress: string
  myShipOrderNo?: string
  myShipShippingCode?: string
  trackingNo?: string
  shippingFee: number
  collectionAmount?: number
  paymentType: MyShipPaymentType
  packageSize: MyShipPackageSize
  packageWeight?: number
  status: MyShipStatus
  createdDate: string
  shippedDate?: string
  storeArrivalDate?: string
  pickupDeadline?: string
  pickedUpDate?: string
  returnedDate?: string
  notes?: string
}

export type Settings = {
  defaultExchangeRate: number
  bankInfo: string
  defaultDepositRule: string
  defaultShippingRule: string
  taxReservePercent: number
  adminAnnouncement: string
  portalAnnouncement: string
  theme: 'light' | 'dark'
  /** 介面配色預設（custom 時使用下方三色） */
  colorPreset:
    | 'default'
    | 'ocean'
    | 'rose'
    | 'forest'
    | 'sunset'
    | 'lavender'
    | 'ember'
    | 'mono'
    | 'mint'
    | 'berry'
    | 'custom'
  accentPrimary?: string
  accentSecondary?: string
  accentHighlight?: string
  /** Google 試算表 ID（網址 /d/xxxxxxxx/ 中間段） */
  googleSpreadsheetId?: string
  /** 工作表 gid（網址 gid= 後數字），預設 0 */
  googleSpreadsheetGid?: string
  /** 已發布 CSV 的完整網址（檔案 → 共用 → 發布到網路），供嘗試線上拉取 */
  googlePublishedCsvUrl?: string
  /** 後台管理密碼 SHA-256（含 pepper，見 auth/adminSession.ts） */
  adminPasswordHash?: string
  /** 是否啟用後台密碼閘道（false 時等同不設密碼，僅建議本機開發） */
  adminAuthEnabled?: boolean
  /** 登入有效時數（sessionStorage，關閉分頁即失效） */
  adminSessionHours?: number
  /** 連續登入失敗幾次後鎖定 */
  adminLoginMaxAttempts?: number
  /** 鎖定分鐘數 */
  adminLoginLockMinutes?: number
}

export type ToastMessage = { id: string; message: string; tone?: 'ok' | 'err' | 'info' }

export type TutorialArticle = {
  id: string
  title: string
  category: string
  content: string
  steps: string[]
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutes: number
  updatedAt: string
}

export type OnboardingTask = {
  id: string
  title: string
  description: string
  completed: boolean
  actionLink: string
}

export type AuditLogEntry = {
  id: string
  action: string
  entityType: 'order' | 'group' | 'customer' | 'shipment' | 'myship' | 'transaction' | 'product' | 'settings'
  entityId: string
  before?: string
  after?: string
  createdAt: number
  createdBy?: string
}

export type NotificationTemplate = {
  id: string
  name: string
  category: 'payment' | 'shipping' | 'pickup' | 'order' | 'other'
  content: string
  variables: string[]
  updatedAt: string
}

export type ProcurementApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'closed'
export type PurchaseOrderStatus = 'draft' | 'approved' | 'ordered' | 'partial_received' | 'received' | 'cancelled'
export type PaymentScheduleStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'
export type PurchaseReturnStatus = 'draft' | 'approved' | 'returned' | 'refunded' | 'closed'

export type Supplier = {
  id: string
  name: string
  code: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  currency: 'JPY' | 'TWD' | 'USD'
  paymentTermsDays: number
  leadTimeDays?: number
  active: boolean
  rating?: number
  notes?: string
  createdAt: number
  updatedAt: number
}

export type PurchaseOrderItem = {
  id: string
  productId?: string
  sku?: string
  name: string
  qtyOrdered: number
  qtyReceived: number
  qtyReturned: number
  unitCost: number
  currency: 'JPY' | 'TWD' | 'USD'
  fxRate?: number
  taxRate?: number
  shippingAllocation?: number
  extraCostAllocation?: number
  expectedArrivalDate?: string
  receivedAt?: string
  notes?: string
}

export type ApprovalFlow = {
  status: ProcurementApprovalStatus
  requestedBy: string
  requestedAt: number
  approvedBy?: string
  approvedAt?: number
  rejectedBy?: string
  rejectedAt?: number
  reason?: string
}

export type PurchaseOrder = {
  id: string
  poNo: string
  supplierId: string
  groupId?: string
  status: PurchaseOrderStatus
  approval: ApprovalFlow
  orderDate: string
  expectedArrivalDate?: string
  items: PurchaseOrderItem[]
  shippingCost: number
  taxAmount: number
  discountAmount: number
  otherCost: number
  subtotalAmount: number
  totalAmount: number
  payableAmount: number
  currency: 'JPY' | 'TWD' | 'USD'
  exchangeRate?: number
  notes?: string
  createdAt: number
  updatedAt: number
}

export type ReceiptLine = {
  poItemId: string
  qtyReceived: number
  qtyRejected?: number
  unitCost?: number
  note?: string
}

export type GoodsReceipt = {
  id: string
  poId: string
  receiptNo: string
  receiptDate: string
  warehouse?: string
  lines: ReceiptLine[]
  freightCost?: number
  dutyCost?: number
  inspector?: string
  status: 'draft' | 'confirmed'
  note?: string
  createdAt: number
  updatedAt: number
}

export type InventoryMovement = {
  id: string
  productId: string
  sourceType: 'purchase_receipt' | 'purchase_return' | 'manual_adjustment'
  sourceId: string
  movementType: 'in' | 'out'
  qty: number
  unitCost?: number
  occurredAt: string
  note?: string
}

export type AccountsPayable = {
  id: string
  poId: string
  supplierId: string
  dueDate: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: PaymentScheduleStatus
  currency: 'JPY' | 'TWD' | 'USD'
  note?: string
  createdAt: number
  updatedAt: number
}

export type PaymentTerm = {
  id: string
  payableId: string
  plannedDate: string
  plannedAmount: number
  actualDate?: string
  actualAmount?: number
  method?: string
  status: PaymentScheduleStatus
  transactionId?: string
  note?: string
}

export type PurchaseReturn = {
  id: string
  poId: string
  supplierId: string
  status: PurchaseReturnStatus
  returnDate: string
  reason: string
  lines: { poItemId: string; productId?: string; qty: number; unitCost?: number; note?: string }[]
  totalAmount: number
  refundedAmount: number
  note?: string
  createdAt: number
  updatedAt: number
}

export const emptyProcurementCollections = {
  suppliers: [] as Supplier[],
  purchaseOrders: [] as PurchaseOrder[],
  goodsReceipts: [] as GoodsReceipt[],
  inventoryMovements: [] as InventoryMovement[],
  accountsPayables: [] as AccountsPayable[],
  paymentTerms: [] as PaymentTerm[],
  purchaseReturns: [] as PurchaseReturn[],
}

export type DaigouState = {
  users: User[]
  groups: Group[]
  products: Product[]
  /** 現貨商城 SKU（非團購／預購） */
  spotProducts: SpotProduct[]
  customers: Customer[]
  orders: Order[]
  transactions: Transaction[]
  shipments: Shipment[]
  /** 完整出貨紀錄 */
  shipmentRecords: ShipmentRecord[]
  /** 賣貨便／MyShip */
  myShipRecords: MyShipRecord[]
  settings: Settings
  toasts: ToastMessage[]
  tutorialArticles: TutorialArticle[]
  onboardingTasks: OnboardingTask[]
  auditLogs: AuditLogEntry[]
  notificationTemplates: NotificationTemplate[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  goodsReceipts: GoodsReceipt[]
  inventoryMovements: InventoryMovement[]
  accountsPayables: AccountsPayable[]
  paymentTerms: PaymentTerm[]
  purchaseReturns: PurchaseReturn[]
}
