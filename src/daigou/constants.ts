import type {
  CustomerTag,
  MembershipTierId,
  GroupStatus,
  MyShipPackageSize,
  MyShipPaymentType,
  MyShipStatus,
  OrderStatus,
  PaymentStatus,
  ProcurementApprovalStatus,
  ProductStatus,
  PurchaseOrderStatus,
  ShipmentRecordStatus,
  ShipmentStatus,
  SpotListingStatus,
  TransactionCategory,
  TransactionType,
} from './types'

/** 產品線（頂欄、文件標題、匯出檔說明） */
export const APP_BRAND_CORE = 'HelpMeBuy Pro'
/** 賣場／店家品牌，與 Pro 並列於同一列 */
export const APP_BRAND_SHOP = 'Heina shop'
/** 完整主標（單行展示用） */
export const APP_NAME = `${APP_BRAND_CORE} ${APP_BRAND_SHOP}`
/** 副標：營運定位 */
export const APP_SUB = 'Daigou OS · 日貨代購團務'

export const SPOT_STATUS_LABEL: Record<SpotListingStatus, string> = {
  on_sale: '上架中',
  paused: '暫停下架',
  sold_out: '售完',
}

export const ALL_SHIPMENT_RECORD_STATUSES: ShipmentRecordStatus[] = [
  '未包裝',
  '已包裝',
  '待寄出',
  '已寄出',
  '運送中',
  '已到店',
  '已取貨',
  '逾期未取',
  '退回',
  '遺失 / 異常',
  '已完成',
]

export const ALL_MYSHIP_STATUSES: MyShipStatus[] = [
  '尚未建立',
  '已建立寄件單',
  '待列印',
  '已列印',
  '待寄件',
  '已寄件',
  '運送中',
  '已到店',
  '待取貨',
  '已取貨',
  '逾期未取',
  '退回中',
  '已退回',
  '異常',
]

export const ALL_MYSHIP_PAYMENT: MyShipPaymentType[] = [
  '純寄件',
  '貨到付款',
  '已收款寄件',
  '運費自付',
  '運費由買家負擔',
]

export const ALL_MYSHIP_PACKAGE: MyShipPackageSize[] = ['小包', '中包', '大包', '自訂']

export const ALL_GROUP_STATUSES: GroupStatus[] = [
  'draft',
  'open',
  'closing_soon',
  'closed',
  'ordered',
  'waiting_official_ship',
  'international_transit',
  'waiting_arrival',
  'arrived',
  'sorting',
  'balance_collection',
  'shipping',
  'completed',
  'cancelled',
]

export const GROUP_STATUS_LABEL: Record<GroupStatus, string> = {
  draft: '草稿',
  open: '開放喊單',
  closing_soon: '即將結單',
  closed: '已結單',
  ordered: '已下單',
  waiting_official_ship: '等待官方出貨',
  international_transit: '國際運送中',
  waiting_arrival: '等待到貨',
  arrived: '已到貨',
  sorting: '整理中',
  balance_collection: '可補尾款',
  shipping: '出貨中',
  completed: '已完成',
  cancelled: '已取消',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_confirmation: '待確認',
  confirmed: '已確認',
  waiting_deposit: '待付訂金',
  deposit_paid: '已付訂金',
  ordered: '已下單',
  waiting_arrival: '等待到貨',
  arrived: '已到貨',
  sorting: '整理中',
  waiting_balance: '待補尾款',
  fully_paid: '已付清',
  ready_to_ship: '待出貨',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
  risk_flagged: '異常處理',
  stockout_refund: '缺貨退款',
  exception: '異常處理',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: '未付款',
  deposit_paid: '已付訂金',
  balance_due: '待補尾款',
  fully_paid: '已付清',
  refunded: '已退款',
  overpaid: '溢付款',
  partial_refund: '部分退款',
  bad_debt: '呆帳',
}

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: '草稿',
  open_preorder: '開放預購',
  almost_sold_out: '即將售完',
  available: '開放預購',
  low_stock: '庫存偏低',
  sold_out: '已售完',
  closed: '已關閉',
  closed_preorder: '已結單',
  ordered_po: '已下單',
  arrived_stock: '到貨',
  shortage: '缺貨',
  cancelled_product: '取消',
}

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  not_packed: '未包貨',
  packed: '已包貨',
  shipped: '已出貨',
  delivered: '已送達',
  returned: '退貨',
}

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
  refund: '退款',
  adjustment: '調整',
  transfer: '轉帳',
  tax_reserve: '稅務預留',
}

export const TRANSACTION_CATEGORY_LABEL: Record<TransactionCategory, string> = {
  deposit: '訂金',
  balance: '尾款',
  domestic_shipping: '國內運費',
  international_shipping: '國際運費',
  shipping_income: '運費收入',
  exchange_gain: '匯差收入',
  product_cost: '商品成本',
  jp_domestic_shipping: '日本國內運費',
  packaging: '包材',
  transportation: '交通',
  accommodation: '住宿',
  tax_reserve: '稅務預留',
  platform_fee: '平台手續費',
  refund: '退款',
  other: '其他',
}

export const CUSTOMER_TAG_LABEL: Record<CustomerTag, string> = {
  vip: 'VIP',
  frequent_buyer: '常客',
  new_customer: '新客',
  risk: '風險',
  blacklist: '黑名單',
  low_pickup: '取貨率低',
  manual_review: '需人工確認',
  high_spend: '高消費',
  overdue_pickup: '逾期未取',
  good_payment: '付款良好',
  frequent_changes: '容易改單',
}

export const MEMBERSHIP_TIER_LABEL: Record<MembershipTierId, string> = {
  regular: '一般會員',
  bronze: '青銅會員',
  silver: '白銀會員',
  gold: '黃金會員',
  platinum: '白金會員',
}

export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: '草稿',
  approved: '已核准',
  ordered: '已下單',
  partial_received: '部分到貨',
  received: '已到齊',
  cancelled: '已取消',
}

export const PROCUREMENT_APPROVAL_LABEL: Record<ProcurementApprovalStatus, string> = {
  draft: '草稿',
  pending_approval: '待審批',
  approved: '已核准',
  rejected: '已退回',
  ordered: '已下單',
  closed: '已結案',
}

/** 訊息範本可用變數 */
export const TEMPLATE_VARIABLE_HINTS = [
  '{customerName}',
  '{groupName}',
  '{orderId}',
  '{orderTotal}',
  '{deposit}',
  '{balance}',
  '{shippingFee}',
  '{bankInfo}',
  '{trackingNo}',
  '{storeName}',
  '{pickupDeadline}',
] as const
