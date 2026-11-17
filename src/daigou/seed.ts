import {
  DEFAULT_ADMIN_LOGIN_LOCK_MINUTES,
  DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS,
  DEFAULT_ADMIN_SESSION_HOURS,
} from '../auth/adminDefaults'
import type {
  AccountsPayable,
  AuditLogEntry,
  Customer,
  CustomerTag,
  DaigouState,
  GoodsReceipt,
  Group,
  InventoryMovement,
  NotificationTemplate,
  PaymentTerm,
  PurchaseOrder,
  PurchaseReturn,
  OnboardingTask,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  Shipment,
  ShipmentRecord,
  ShipmentRecordStatus,
  SpotProduct,
  MyShipRecord,
  MyShipStatus,
  MyShipPaymentType,
  MyShipPackageSize,
  Transaction,
  TutorialArticle,
  TransactionCategory,
  TransactionType,
  User,
  Supplier,
} from './types'
import { emptyProcurementCollections } from './types'
import { computeMembershipSpendTwd, normalizeCustomerMembership, tierFromSpend } from './membershipTiers'
import { defaultDeposit, itemTotalTwd, computeBalance, totalDue } from './logic/orderCalc'
import { standardTwd } from './logic/pricing'

const rate = 0.22
const now = Date.now()

const users: User[] = [{ id: 'u1', name: '團主小編', email: 'admin@example.com', role: 'admin' }]

const groups: Group[] = [
  {
    id: 'g1',
    name: '2026 冬番週邊團',
    status: 'open',
    groupCode: 'WIN-2026-A',
    coverImageUrl: 'https://picsum.photos/seed/hmbg1/960/360',
    ipSeries: '冬番集合',
    supplierName: 'Animate 官網',
    pricingMultiplier: 1.05,
    customerAnnouncement: '尾款於到貨通知後 7 日內完成，逾時將依規則處理。',
    internalNotes: '含國際分攤，尾款到貨後結算。',
    closingDate: '2026-05-15',
    saleEndDate: '2026-05-10',
    officialShipDate: '2026-07-01',
    exchangeRate: rate,
    jpyAmountTotal: 185000,
    orderNumber: 'JP-2026-041',
    logisticsNumber: 'LOG-7788',
    purchaseLink: 'https://example.com/buy',
    notes: '含國際分攤，尾款到貨後結算。',
    createdAt: now - 86400000 * 14,
    archived: false,
    taxReserveRate: 5,
    packagingFeeRule: '每單 NT$15',
    autoPriceRule: 'JPY×匯率×1.05 無條件進位',
  },
  {
    id: 'g2',
    name: 'Jump 應募代購',
    status: 'international_transit',
    closingDate: '2026-04-01',
    saleEndDate: '2026-03-28',
    officialShipDate: '2026-06-15',
    exchangeRate: 0.21,
    jpyAmountTotal: 92000,
    orderNumber: 'JP-2026-019',
    logisticsNumber: 'LOG-6601',
    purchaseLink: 'https://example.com/jump',
    notes: '',
    createdAt: now - 86400000 * 30,
  },
  {
    id: 'g3',
    name: '快閃盲盒團',
    status: 'shipping',
    closingDate: '2026-03-20',
    saleEndDate: '2026-03-18',
    officialShipDate: '2026-05-01',
    exchangeRate: 0.23,
    jpyAmountTotal: 45000,
    orderNumber: 'JP-2026-008',
    logisticsNumber: 'LOG-4410',
    purchaseLink: '',
    notes: '取貨請帶取貨碼。',
    createdAt: now - 86400000 * 45,
  },
]

const categories = ['週邊', '漫畫', '盲盒', '小物', '海報']
const series = ['咒術', '鬼滅', '排球', '藍鎖', '我推', '原創']

function makeProducts(): Product[] {
  const list: Product[] = []
  for (let i = 1; i <= 20; i++) {
    const jpy = 500 + i * 137
    const gid = i <= 8 ? 'g1' : i <= 14 ? 'g2' : 'g3'
    const blind = i % 4 === 0
    const img = `https://picsum.photos/seed/hmb${i}/200/200`
    list.push({
      id: `p${i}`,
      productCode: `SKU-${String(i).padStart(4, '0')}`,
      groupId: gid,
      name: `${series[i % series.length]} 商品 #${i}`,
      imageUrl: img,
      imageGallery: [img, `https://picsum.photos/seed/hmb${i}b/200/200`],
      category: categories[i % categories.length],
      ipSeries: series[i % series.length],
      characterName: `角色 ${(i % 6) + 1}`,
      supplier: i % 2 === 0 ? 'Animate' : 'Amazon JP',
      purchaseUrl: `https://example.com/p/${i}`,
      jpyPrice: jpy,
      twdPrice: standardTwd(jpy, rate),
      exchangeMultiplier: rate,
      pricingRule: '標準代購價',
      isBlindBox: blind,
      canOpenBlindBox: blind,
      openingFee: blind ? 30 : 0,
      stockQty: Math.max(0, 40 - i),
      preorderQty: 5 + (i % 8),
      preorderLimit: 200,
      remainingQuota: Math.max(0, 200 - (5 + (i % 8)) * 3),
      limitPerCustomer: i % 5 === 0 ? 1 : 5,
      costEstimate: Math.round(standardTwd(jpy, rate) * 0.72),
      profitEstimate: Math.round(standardTwd(jpy, rate) * 0.28),
      weightEstimate: 0.2 + (i % 5) * 0.08,
      volumeEstimate: 800 + i * 40,
      customerNote: blind ? '盲盒隨機出貨' : '',
      internalNote: i % 6 === 0 ? '熱門品項' : '',
      status: i % 11 === 0 ? 'sold_out' : i % 9 === 0 ? 'low_stock' : i % 14 === 0 ? 'almost_sold_out' : 'available',
    })
  }
  return list
}

const products = makeProducts()

const spotCategories = ['徽章', '立牌', '資料夾', '吊飾', '明信片', '小卡']

function makeSpotProducts(): SpotProduct[] {
  const list: SpotProduct[] = []
  for (let i = 1; i <= 10; i++) {
    list.push({
      id: `sp${i}`,
      name: `現貨｜${series[i % series.length]} ${spotCategories[i % spotCategories.length]} #${i}`,
      imageUrl: `https://picsum.photos/seed/spot${i}/240/240`,
      sku: `SPOT-2026-${String(i).padStart(3, '0')}`,
      category: spotCategories[i % spotCategories.length],
      twdPrice: 180 + i * 45,
      stockQty: Math.max(0, 15 - i),
      status: i % 7 === 0 ? 'sold_out' : i % 5 === 0 ? 'paused' : 'on_sale',
      shelfCode: `A-${String(i).padStart(2, '0')}`,
      notes: i % 3 === 0 ? '限店內取或賣貨便' : '',
      createdAt: now - 86400000 * (i % 9),
    })
  }
  return list
}

const spotProducts = makeSpotProducts()

const baseTags: CustomerTag[][] = [
  ['vip'],
  ['frequent_buyer'],
  ['new_customer'],
  [],
  ['risk'],
  ['low_pickup'],
  ['manual_review'],
  ['vip', 'frequent_buyer'],
]

function makeCustomers(): Customer[] {
  const names = [
    '阿哲',
    '小葵',
    '柚子',
    'Ken',
    'Mika',
    '阿豪',
    '品品',
    '老陳',
    'Nana',
    '阿光',
    '小安',
    '大衛',
    '伊伊',
    '小薇',
    'Tony',
  ]
  return names.map((name, i) => ({
    id: `c${i + 1}`,
    name,
    realName: i % 3 === 0 ? `${name}（本名）` : undefined,
    lineDisplayName: `LINE_${name}`,
    phoneLast3: String(100 + ((i * 7) % 900)).padStart(3, '0'),
    email: i % 4 === 0 ? `${name.toLowerCase()}@example.com` : undefined,
    socialAccount: `@${name}_buyer`,
    tags: baseTags[i % baseTags.length],
    riskScore: 15 + ((i * 13) % 40),
    pickupReliability: 60 + ((i * 17) % 40),
    totalOrders: 1 + (i % 6),
    totalUnpaidBalance: i % 4 === 0 ? 1200 + i * 100 : 0,
    totalSpent: 8000 + i * 920,
    totalCancelledOrders: i % 8 === 0 ? 1 : 0,
    totalUnpickedPackages: i % 10 === 0 ? 1 : 0,
    lastOrderAt: new Date(now - 86400000 * (i % 12)).toISOString().slice(0, 10),
    notes: i % 5 === 0 ? '常問物流進度' : '',
  }))
}

const customers = makeCustomers()

const orderStatuses: OrderStatus[] = [
  'deposit_paid',
  'waiting_balance',
  'fully_paid',
  'shipped',
  'waiting_deposit',
  'confirmed',
  'risk_flagged',
]
const paymentStatuses: PaymentStatus[] = [
  'deposit_paid',
  'balance_due',
  'fully_paid',
  'unpaid',
  'overpaid',
  'partial_refund',
  'bad_debt',
]

function makeOrders(): Order[] {
  const list: Order[] = []
  for (let i = 1; i <= 30; i++) {
    const cust = customers[(i - 1) % customers.length]
    const grp = groups[(i - 1) % groups.length]
    const p1 = products[(i - 1) % products.length]
    const p2 = products[(i + 3) % products.length]
    const items: OrderItem[] = [
      { productId: p1.id, name: p1.name, qty: 1 + (i % 2), jpyUnit: p1.jpyPrice, twdUnit: p1.twdPrice },
      ...(i % 3 === 0
        ? [{ productId: p2.id, name: p2.name, qty: 1, jpyUnit: p2.jpyPrice, twdUnit: p2.twdPrice }]
        : []),
    ]
    const it = itemTotalTwd(items)
    const dep = defaultDeposit(it)
    const dom = i % 4 === 0 ? 65 : 0
    const intl = i % 5 === 0 ? 120 : 80
    const pkg = i % 6 === 0 ? 15 : 0
    const disc = i % 11 === 0 ? 50 : 0
    const netIt = Math.max(0, it - disc)
    const bal = computeBalance(netIt, dep, dom, intl, pkg, 0)
    const tot = totalDue(netIt, dom, intl, pkg, 0)
    const pay = paymentStatuses[i % paymentStatuses.length]
    const recv =
      pay === 'fully_paid'
        ? tot
        : pay === 'deposit_paid' || pay === 'balance_due' || pay === 'partial_refund'
          ? dep + (i % 3) * 100
          : pay === 'overpaid'
            ? tot + 50
            : 0
    list.push({
      id: `o${i}`,
      lookupCode: `HMB-${10000 + i}`,
      customerId: cust.id,
      groupId: grp.id,
      items,
      deposit: dep,
      balance: bal,
      domesticShipping: dom,
      internationalShipping: intl,
      discount: disc,
      packagingFee: pkg,
      otherFee: 0,
      totalAmount: tot,
      totalReceived: recv,
      outstandingAmount: Math.max(0, tot - recv),
      paymentStatus: pay,
      orderStatus: orderStatuses[i % orderStatuses.length],
      riskFlag: i % 17 === 0,
      customerNote: i % 9 === 0 ? '希望週六出貨' : '',
      internalNote: i % 13 === 0 ? '已電聯確認取貨店' : '',
      notes: i % 7 === 0 ? '客戶指定超取' : '',
      createdAt: now - 86400000 * (i % 20),
      updatedAt: now - 86400000 * (i % 8),
    })
  }
  return list
}

const orders = makeOrders()

/** 依訂單已實收加總寫入會員累計消費與等級（示範：第 3 位客戶為手動鎖定黃金） */
const customersWithMembership = customers.map((c, idx) => {
  const spend = computeMembershipSpendTwd(c.id, orders)
  if (idx === 2) {
    return normalizeCustomerMembership({
      ...c,
      membershipSpendTwd: spend,
      membershipTierId: 'gold',
      membershipTierLocked: true,
    })
  }
  return normalizeCustomerMembership({
    ...c,
    membershipSpendTwd: spend,
    membershipTierId: tierFromSpend(spend),
    membershipTierLocked: false,
  })
})

const txTypes: TransactionType[] = ['income', 'expense', 'income', 'expense', 'adjustment', 'transfer', 'tax_reserve']
const txCats: TransactionCategory[] = [
  'deposit',
  'balance',
  'product_cost',
  'domestic_shipping',
  'international_shipping',
  'shipping_income',
  'exchange_gain',
  'packaging',
  'tax_reserve',
  'other',
]

function makeTransactions(): Transaction[] {
  const list: Transaction[] = []
  for (let i = 1; i <= 50; i++) {
    const o = orders[i % orders.length]
    const ty = txTypes[i % txTypes.length]
    let cat = txCats[i % txCats.length]
    if (ty === 'tax_reserve') cat = 'tax_reserve'
    if (ty === 'transfer') cat = 'other'
    list.push({
      id: `t${i}`,
      type: ty,
      category: cat,
      amount: 200 + i * 73,
      currency: 'TWD',
      groupId: o.groupId,
      orderId: o.id,
      customerId: o.customerId,
      date: new Date(now - 86400000 * (i % 25)).toISOString().slice(0, 10),
      note: `自動產生 #${i}`,
      createdAt: now - 3600000 * i,
    })
  }
  return list
}

const transactions = makeTransactions()

function makeShipments(): Shipment[] {
  const list: Shipment[] = []
  for (let i = 0; i < 10; i++) {
    const o = orders[i + 5]
    list.push({
      id: `s${i + 1}`,
      orderId: o.id,
      customerId: o.customerId,
      carrier: i % 2 === 0 ? '7-11 交貨便' : '黑貓宅急便',
      trackingNo: `TW${1000000 + i * 8831}`,
      status: ['packed', 'shipped', 'shipped', 'delivered', 'not_packed'][i % 5] as Shipment['status'],
      shipDate: '2026-04-' + String(10 + (i % 15)).padStart(2, '0'),
      notes: '',
    })
  }
  return list
}

const shipments = makeShipments()

const shipmentRecordStatuses: ShipmentRecordStatus[] = [
  '未包裝',
  '已包裝',
  '待寄出',
  '已寄出',
  '運送中',
  '已到店',
  '已取貨',
  '已完成',
  '逾期未取',
  '退回',
  '遺失 / 異常',
]

function makeShipmentRecords(): ShipmentRecord[] {
  const list: ShipmentRecord[] = []
  for (let i = 0; i < 14; i++) {
    const o = orders[i % orders.length]
    const c = customers.find((x) => x.id === o.customerId)!
    const st = shipmentRecordStatuses[i % shipmentRecordStatuses.length]
    const t0 = new Date(now - 86400000 * (i % 18)).toISOString()
    const id = `sr${i + 1}`
    const shipped =
      ['已寄出', '運送中', '已到店', '已取貨', '已完成', '逾期未取', '退回', '遺失 / 異常'].includes(st)
    const delivered = ['已取貨', '已完成'].includes(st)
    list.push({
      id,
      orderId: o.id,
      customerId: o.customerId,
      groupId: o.groupId,
      shippingMethod: i % 3 === 0 ? '賣貨便' : i % 3 === 1 ? '店到店' : '宅配',
      carrier: i % 3 === 1 ? '黑貓宅急便' : '7-ELEVEN',
      trackingNo: i % 4 === 0 ? undefined : `TW${880000 + i}`,
      packageCount: 1 + (i % 3),
      packageWeight: Math.round((0.3 + (i % 5) * 0.15) * 10) / 10,
      shippingFee: 60 + (i % 4) * 15,
      packagingFee: i % 2 === 0 ? 10 : 0,
      status: st,
      receiverName: c.name,
      receiverPhone: `0900${c.phoneLast3}000`,
      receiverAddress: i % 3 === 1 ? '新北市板橋區文化路一段示範地址' : undefined,
      receiverStoreName: i % 3 === 0 ? `7-11 示範門市-${(i % 8) + 1}` : undefined,
      receiverStoreId: i % 3 === 0 ? String(160000 + i) : undefined,
      shippedAt: shipped ? new Date(now - 86400000 * (i % 10)).toISOString().slice(0, 10) : undefined,
      deliveredAt: delivered ? new Date(now - 86400000 * (i % 6)).toISOString().slice(0, 10) : undefined,
      notes: i % 5 === 0 ? '易碎' : '',
      createdAt: t0,
      updatedAt: new Date(now - 86400000 * (i % 5)).toISOString(),
    })
  }
  return list
}

const shipmentRecords = makeShipmentRecords()

function makeMyShipRecords(sr: ShipmentRecord[]): MyShipRecord[] {
  const myStatuses: MyShipStatus[] = [
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
  const list: MyShipRecord[] = []
  for (let i = 0; i < 10; i++) {
    const sr0 = sr[i % sr.length]
    const o = orders.find((x) => x.id === sr0.orderId)!
    const c = customers.find((x) => x.id === o.customerId)!
    const st = myStatuses[(i + 3) % myStatuses.length]
    const deadline = new Date(now + 86400000 * (i % 5 === 0 ? -1 : 4)).toISOString().slice(0, 10)
    const payTypes: MyShipPaymentType[] = ['純寄件', '貨到付款', '已收款寄件', '運費自付', '運費由買家負擔']
    const sizes: MyShipPackageSize[] = ['小包', '中包', '大包', '自訂']
    list.push({
      id: `my${i + 1}`,
      orderId: o.id,
      shipmentId: i === 7 ? undefined : sr0.id,
      customerId: c.id,
      senderName: '某某工作室',
      senderPhone: '0912000111',
      receiverName: c.name,
      receiverPhone: `0900${c.phoneLast3}000`,
      receiverStoreName: `7-ELEVEN ${['信義店', '板橋店', '中壢店', '左營店'][i % 4]}`,
      receiverStoreId: String(199281 + i),
      receiverStoreAddress: `示範縣市路名段 ${i + 1} 號`,
      myShipOrderNo: i % 2 === 0 ? undefined : `MSO${8800 + i}`,
      myShipShippingCode: i % 2 === 0 ? undefined : `SSC${1200 + i}`,
      trackingNo: `TW${990000 + i}`,
      shippingFee: 65,
      collectionAmount: i % 3 === 0 ? Math.round(o.totalAmount * 0.3) : 0,
      paymentType: payTypes[i % 5],
      packageSize: sizes[i % 4],
      packageWeight: 0.5,
      status: st,
      createdDate: new Date(now - 86400000 * (i % 12)).toISOString().slice(0, 10),
      shippedDate: ['已寄件', '運送中', '已到店', '待取貨', '已取貨', '逾期未取', '退回中', '已退回', '異常'].includes(st)
        ? new Date(now - 86400000 * (i % 8)).toISOString().slice(0, 10)
        : undefined,
      storeArrivalDate: ['已到店', '待取貨', '已取貨', '逾期未取'].includes(st)
        ? new Date(now - 86400000 * (i % 6)).toISOString().slice(0, 10)
        : undefined,
      pickupDeadline: deadline,
      pickedUpDate: st === '已取貨' ? new Date(now - 86400000 * 2).toISOString().slice(0, 10) : undefined,
      returnedDate: st === '已退回' ? new Date(now - 86400000).toISOString().slice(0, 10) : undefined,
      notes: '',
    })
  }
  return list
}

const myShipRecords = makeMyShipRecords(shipmentRecords)

/** 新環境／清空後的預設後台設定（無示範訂單） */
export const defaultDaigouSettings: DaigouState['settings'] = {
  adminAuthEnabled: true,
  adminPasswordHash: '',
  adminSessionHours: DEFAULT_ADMIN_SESSION_HOURS,
  adminLoginMaxAttempts: DEFAULT_ADMIN_LOGIN_MAX_ATTEMPTS,
  adminLoginLockMinutes: DEFAULT_ADMIN_LOGIN_LOCK_MINUTES,
  defaultExchangeRate: rate,
  bankInfo: '台新銀行 (812) 分行 1234-56789012 戶名：某某工作室',
  defaultDepositRule: '品項合計 > 20 元：訂金 = 合計 − 20；否則訂金 = 全額。',
  defaultShippingRule: '國內運費依件計；國際依重量分攤。',
  taxReservePercent: 5,
  adminAnnouncement: '本週截團日請注意 LINE 公告。',
  portalAnnouncement: '查詢訂單請輸入與 LINE 相同的顯示名稱，或手機末三碼。',
  theme: 'light',
  colorPreset: 'default',
  accentPrimary: '',
  accentSecondary: '',
  accentHighlight: '',
  googleSpreadsheetId: '',
  googleSpreadsheetGid: '0',
  googlePublishedCsvUrl: '',
}

const tutorialArticles: TutorialArticle[] = [
  {
    id: 'art_quick',
    title: '新手快速開始',
    category: '快速開始',
    content: '從建立團務、上架商品、建立客戶與訂單，到收款與出貨的完整路徑。',
    steps: ['建立團務', '新增商品', '建立客戶', '建立訂單', '登記收款', '建立出貨／賣貨便'],
    tags: ['新手', '流程'],
    difficulty: 'beginner',
    estimatedMinutes: 12,
    updatedAt: '2026-04-20',
  },
  {
    id: 'art_group_flow',
    title: '團購流程教學',
    category: '團務',
    content: '草稿 → 開放喊單 → 結單 → 下單 → 到貨 → 收尾款 → 出貨 → 完成。',
    steps: ['設定團資訊與匯率', '開放喊單', '結單後向通路下單', '追蹤物流', '收尾款', '批次出貨'],
    tags: ['團購', '流程'],
    difficulty: 'beginner',
    estimatedMinutes: 15,
    updatedAt: '2026-04-18',
  },
  {
    id: 'art_payment',
    title: '訂單與付款教學',
    category: '訂單',
    content: '訂金／尾款試算、手動調整運費與折扣、呆帳與退款標記方式。',
    steps: ['理解訂金公式', '檢視應收未收', '使用訊息範本催款', '標記付款狀態'],
    tags: ['付款', '訂單'],
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    updatedAt: '2026-04-15',
  },
  {
    id: 'art_myship',
    title: '賣貨便教學',
    category: '出貨',
    content: '建立紀錄、複製寄件資料、更新到店與取貨期限、逾期未取處理。',
    steps: ['從訂單建立賣貨便紀錄', '複製表單給客戶', '批次更新期限', '異常時更新客戶風險'],
    tags: ['賣貨便', '7-11'],
    difficulty: 'intermediate',
    estimatedMinutes: 14,
    updatedAt: '2026-04-12',
  },
  {
    id: 'art_ledger',
    title: '記帳教學',
    category: '記帳',
    content: '收入／支出分類、團務利潤、月報與稅務預留、現金流檢查。',
    steps: ['建立訂金／尾款分錄', '勾選團別與訂單', '檢視團利潤', '匯出 CSV 對帳'],
    tags: ['帳務', '報表'],
    difficulty: 'intermediate',
    estimatedMinutes: 16,
    updatedAt: '2026-04-10',
  },
  {
    id: 'art_portal',
    title: '客戶查詢教學',
    category: '客戶查詢',
    content: '客戶如何用 LINE 名稱、末三碼或查詢碼查單；哪些欄位對客戶可見。',
    steps: ['給客戶查詢碼', '說明可查欄位', '引導至客戶查詢頁'],
    tags: ['查詢', '門市'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
    updatedAt: '2026-04-08',
  },
  {
    id: 'art_risk',
    title: '風險控管教學',
    category: '風險',
    content: '風險分數規則、黑名單、低取貨率與逾期未取如何反映在營運。',
    steps: ['檢視客戶風險分', '標籤與黑名單', '賣貨便異常回寫'],
    tags: ['CRM', '風險'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
    updatedAt: '2026-04-05',
  },
  {
    id: 'art_faq',
    title: '常見問題 FAQ',
    category: 'FAQ',
    content: '訂單金額異常、改單、未付款、未取貨、缺貨與匯出資料的處理方式。',
    steps: ['訂單詳情按「重算金額」', '改單請用備註＋稽核', '催款用訊息範本', '缺貨改退款狀態'],
    tags: ['FAQ'],
    difficulty: 'beginner',
    estimatedMinutes: 10,
    updatedAt: '2026-04-01',
  },
]

const onboardingTasks: OnboardingTask[] = [
  { id: 'ob1', title: '建立第一個團務', description: '於團務頁建立並設定截團日。', completed: false, actionLink: '/groups' },
  { id: 'ob2', title: '新增第一個商品', description: '指定團別並設定日幣／台幣售價。', completed: false, actionLink: '/products' },
  { id: 'ob3', title: '新增第一位客戶', description: '建立客戶主檔以利下單。', completed: false, actionLink: '/customers' },
  { id: 'ob4', title: '建立第一筆訂單', description: '選擇客戶、團別與品項。', completed: false, actionLink: '/orders' },
  { id: 'ob5', title: '確認付款回報', description: '於付款回報或付款審核完成一筆對帳。', completed: false, actionLink: '/payment-reports' },
  { id: 'ob6', title: '建立第一筆出貨紀錄', description: '從訂單詳情或出貨紀錄頁建立。', completed: false, actionLink: '/shipment-records' },
  { id: 'ob7', title: '完成第一筆訂單', description: '出貨後將訂單標記為已完成。', completed: false, actionLink: '/orders' },
]

const notificationTemplates: NotificationTemplate[] = [
  {
    id: 'tpl_deposit',
    name: '訂金提醒',
    category: 'payment',
    content:
      'Hi {customerName}，您在「{groupName}」的訂單 {orderId} 訂金為 NT${deposit}，請於期限內匯款至：{bankInfo}。應付總額約 NT${orderTotal}（含運費將於尾款結算）。',
    variables: ['customerName', 'groupName', 'orderId', 'deposit', 'bankInfo', 'orderTotal'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_balance',
    name: '尾款提醒',
    category: 'payment',
    content: 'Hi {customerName}，訂單 {orderId} 尾款 NT${balance} 已可繳納，請匯款至：{bankInfo}。',
    variables: ['customerName', 'orderId', 'balance', 'bankInfo'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_ship',
    name: '出貨通知',
    category: 'shipping',
    content: 'Hi {customerName}，您的包裹已寄出，追蹤碼 {trackingNo}，運費 NT${shippingFee}。',
    variables: ['customerName', 'trackingNo', 'shippingFee'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_pickup',
    name: '取貨提醒（賣貨便）',
    category: 'pickup',
    content: 'Hi {customerName}，包裹已到 {storeName}，取貨期限 {pickupDeadline}，請盡快取件。',
    variables: ['customerName', 'storeName', 'pickupDeadline'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_arrival',
    name: '到貨通知',
    category: 'shipping',
    content: 'Hi {customerName}，團「{groupName}」已到貨，訂單 {orderId} 可開始補尾款 NT${balance}。',
    variables: ['customerName', 'groupName', 'orderId', 'balance'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_myship_create',
    name: '賣貨便寄件通知',
    category: 'shipping',
    content: 'Hi {customerName}，已為您建立賣貨便寄件，店號 {storeName}，取貨碼將於到店後提供。',
    variables: ['customerName', 'storeName'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_overdue_pickup',
    name: '逾期未取提醒',
    category: 'pickup',
    content: 'Hi {customerName}，訂單 {orderId} 包裹已逾取貨期限，請盡速聯繫處理。',
    variables: ['customerName', 'orderId'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_payment_ok',
    name: '付款確認',
    category: 'payment',
    content: 'Hi {customerName}，已確認收到訂單 {orderId} 款項 NT${orderTotal}，感謝！',
    variables: ['customerName', 'orderId', 'orderTotal'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_cancel',
    name: '訂單取消',
    category: 'order',
    content: 'Hi {customerName}，訂單 {orderId} 已取消，如有已付款項將於 7 日內退還。',
    variables: ['customerName', 'orderId'],
    updatedAt: '2026-04-01',
  },
  {
    id: 'tpl_stockout',
    name: '缺貨退款',
    category: 'order',
    content: 'Hi {customerName}，訂單 {orderId} 因缺貨將辦理退款，金額 NT${orderTotal}，請提供帳戶。',
    variables: ['customerName', 'orderId', 'orderTotal'],
    updatedAt: '2026-04-01',
  },
]

const auditLogs: AuditLogEntry[] = [
  {
    id: 'al1',
    action: 'order_created',
    entityType: 'order',
    entityId: 'o1',
    after: '建立訂單',
    createdAt: now - 3600000,
    createdBy: 'u1',
  },
  {
    id: 'al2',
    action: 'payment_marked',
    entityType: 'order',
    entityId: 'o2',
    before: 'unpaid',
    after: 'deposit_paid',
    createdAt: now - 7200000,
    createdBy: 'u1',
  },
]

const suppliers: Supplier[] = [
  {
    id: 'sup1',
    name: 'Animate 供應',
    code: 'SUP-ANM',
    contactName: '佐藤',
    contactPhone: '03-1111-2222',
    currency: 'JPY',
    paymentTermsDays: 30,
    leadTimeDays: 14,
    active: true,
    rating: 5,
    notes: '準時到貨率高',
    createdAt: now - 86400000 * 40,
    updatedAt: now - 86400000 * 2,
  },
]

const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po1',
    poNo: 'PO-2026-0001',
    supplierId: 'sup1',
    groupId: 'g1',
    status: 'partial_received',
    approval: { status: 'ordered', requestedBy: 'u1', requestedAt: now - 86400000 * 8, approvedBy: 'u1', approvedAt: now - 86400000 * 7 },
    orderDate: '2026-04-18',
    expectedArrivalDate: '2026-05-05',
    items: [
      {
        id: 'poi1',
        productId: 'p1',
        sku: 'UX-09',
        name: '角色徽章',
        qtyOrdered: 50,
        qtyReceived: 20,
        qtyReturned: 0,
        unitCost: 800,
        currency: 'JPY',
        fxRate: 0.22,
        taxRate: 0,
      },
    ],
    shippingCost: 1200,
    taxAmount: 0,
    discountAmount: 0,
    otherCost: 300,
    subtotalAmount: 40000,
    totalAmount: 41500,
    payableAmount: 30000,
    currency: 'JPY',
    exchangeRate: 0.22,
    notes: '第一批先到貨',
    createdAt: now - 86400000 * 8,
    updatedAt: now - 86400000 * 1,
  },
]

const goodsReceipts: GoodsReceipt[] = [
  {
    id: 'gr1',
    poId: 'po1',
    receiptNo: 'GR-2026-0001',
    receiptDate: '2026-04-24',
    warehouse: '台北倉',
    lines: [{ poItemId: 'poi1', qtyReceived: 20 }],
    freightCost: 300,
    dutyCost: 0,
    inspector: 'u1',
    status: 'confirmed',
    note: '外箱輕微損傷',
    createdAt: now - 86400000 * 4,
    updatedAt: now - 86400000 * 4,
  },
]

const inventoryMovements: InventoryMovement[] = [
  {
    id: 'im1',
    productId: 'p1',
    sourceType: 'purchase_receipt',
    sourceId: 'gr1',
    movementType: 'in',
    qty: 20,
    unitCost: 800,
    occurredAt: '2026-04-24',
    note: 'PO 到貨入庫',
  },
]

const accountsPayables: AccountsPayable[] = [
  {
    id: 'ap1',
    poId: 'po1',
    supplierId: 'sup1',
    dueDate: '2026-05-18',
    originalAmount: 41500,
    paidAmount: 11500,
    remainingAmount: 30000,
    status: 'partial',
    currency: 'JPY',
    note: '已付訂金',
    createdAt: now - 86400000 * 8,
    updatedAt: now - 86400000 * 2,
  },
]

const paymentTerms: PaymentTerm[] = [
  {
    id: 'pt1',
    payableId: 'ap1',
    plannedDate: '2026-04-20',
    plannedAmount: 11500,
    actualDate: '2026-04-20',
    actualAmount: 11500,
    method: '銀行轉帳',
    status: 'paid',
    note: '首付款',
  },
  {
    id: 'pt2',
    payableId: 'ap1',
    plannedDate: '2026-05-18',
    plannedAmount: 30000,
    status: 'unpaid',
  },
]

const purchaseReturns: PurchaseReturn[] = [
  {
    id: 'pr1',
    poId: 'po1',
    supplierId: 'sup1',
    status: 'draft',
    returnDate: '2026-04-26',
    reason: '印刷瑕疵',
    lines: [{ poItemId: 'poi1', productId: 'p1', qty: 2, unitCost: 800 }],
    totalAmount: 1600,
    refundedAmount: 0,
    note: '待供應商確認',
    createdAt: now - 86400000 * 2,
    updatedAt: now - 86400000 * 2,
  },
]

export function createSeedState(): DaigouState {
  return {
    users,
    groups,
    products,
    spotProducts,
    customers: customersWithMembership,
    orders,
    transactions,
    shipments,
    shipmentRecords,
    myShipRecords,
    settings: { ...defaultDaigouSettings },
    toasts: [],
    tutorialArticles,
    onboardingTasks,
    auditLogs,
    notificationTemplates,
    suppliers,
    purchaseOrders,
    goodsReceipts,
    inventoryMovements,
    accountsPayables,
    paymentTerms,
    purchaseReturns,
  }
}

/** 空白後台（無示範訂單／團／客戶） */
export function createEmptyDaigouState(): DaigouState {
  return {
    users: [{ id: 'u1', name: '團主', email: 'admin@example.com', role: 'admin' }],
    groups: [],
    products: [],
    spotProducts: [],
    customers: [],
    orders: [],
    transactions: [],
    shipments: [],
    shipmentRecords: [],
    myShipRecords: [],
    settings: { ...defaultDaigouSettings },
    toasts: [],
    tutorialArticles: [],
    onboardingTasks: [],
    auditLogs: [],
    notificationTemplates: [],
    ...emptyProcurementCollections,
  }
}
