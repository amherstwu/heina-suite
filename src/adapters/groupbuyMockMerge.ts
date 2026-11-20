import type { GroupBuyAppData, GroupBuyGroup } from '../api/types'

const defaultPortal = {
  title: '訂單自助查詢',
  intro: '輸入社群暱稱即可查詢訂單狀態與付款資訊。',
  websiteUrl: 'https://example.com',
  groupUrl: 'https://example.com/group',
  extraNote: '付款後請填寫：付款日期、後五碼，等待對帳完成後即可在此查看狀態。',
  preorderShopUrl: 'https://example.com/preorder',
  spotShopUrl: 'https://example.com/shop',
}

function inboundDemoGroups(): GroupBuyGroup[] {
  return [
    {
      id: 'gb_inbound_nov_1',
      name: '進倉預覽｜11月一番賞',
      status: '已下單',
      channel: '通販',
      opsActive: true,
      closingDate: '2026-09-20',
      saleEndDate: '2026-09-15',
      officialShipDate: '2026-11-18',
      description: '官方出貨月為 11 月，尚未進日本倉。',
      coverImageUrl: '',
      imageUrls: [],
      remarks: '',
      jpyAmount: 5600,
      purchaseLink: '',
      orderId: 'DEMO-INB-001',
      logisticsId: '',
      orders: [],
    },
    {
      id: 'gb_inbound_nov_2',
      name: '進倉預覽｜11月下旬週邊',
      status: '官方已發貨',
      channel: '通販',
      opsActive: true,
      closingDate: '2026-09-28',
      saleEndDate: '2026-09-22',
      officialShipDate: '11月下旬',
      description: '出貨日只寫月份時，也會算進該月進倉。',
      coverImageUrl: '',
      imageUrls: [],
      remarks: '',
      jpyAmount: 3100,
      purchaseLink: '',
      orderId: 'DEMO-INB-002',
      logisticsId: 'JP111222333JP',
      orders: [],
    },
    {
      id: 'gb_inbound_nov_3',
      name: '進倉預覽｜已到日本倉',
      status: '已集運',
      channel: '通販',
      opsActive: true,
      closingDate: '2026-08-30',
      saleEndDate: '2026-08-20',
      officialShipDate: '2026-11-02',
      description: '官方 11 月出貨，狀態已集運＝貨已在倉。',
      coverImageUrl: '',
      imageUrls: [],
      remarks: '',
      jpyAmount: 7800,
      purchaseLink: '',
      orderId: 'DEMO-INB-003',
      logisticsId: 'JP444555666JP',
      purchaseCosts: [{ id: 'pc_inb3', logisticsId: 'JP444555666JP', weight: '1.2' }],
      orders: [],
    },
    {
      id: 'gb_inbound_oct_late',
      name: '進倉預覽｜10月延遲',
      status: '已下單',
      channel: '通販',
      opsActive: true,
      closingDate: '2026-08-10',
      saleEndDate: '2026-08-01',
      officialShipDate: '2026-10-20',
      description: '官方出貨月已過、仍未進倉，會出現在本月的逾期列。',
      coverImageUrl: '',
      imageUrls: [],
      remarks: '',
      jpyAmount: 2400,
      purchaseLink: '',
      orderId: 'DEMO-INB-010',
      logisticsId: '',
      orders: [],
    },
  ]
}

function consolidationDemoGroups(): GroupBuyGroup[] {
  return [
    {
      id: 'gb_consol_demo_1',
      name: '集運預覽｜排少 Lawson',
      status: '官方已發貨',
      channel: '通販',
      opsActive: true,
      closingDate: '2026-08-01',
      saleEndDate: '2026-07-28',
      officialShipDate: '2026-08-20',
      description: '集運功能預覽用團：已官方發貨並有入庫物流編號。',
      coverImageUrl: '',
      imageUrls: [],
      remarks: '入庫重量含外箱，合箱實重另填。',
      jpyAmount: 4200,
      purchaseLink: '',
      orderId: 'DEMO-PO-C1',
      logisticsId: 'JP123456789JP',
      purchaseCosts: [{ id: 'pc_cd1', logisticsId: 'JP123456789JP', weight: '2.3' }],
      orders: [],
    },
    {
      id: 'gb_consol_demo_2',
      name: '集運預覽｜Jump 第二包',
      status: '官方已發貨',
      channel: '通販',
      opsActive: true,
      closingDate: '2026-08-05',
      saleEndDate: '2026-08-01',
      officialShipDate: '2026-08-22',
      description: '同一團可有多個物流編號，可勾進同一張集運單。',
      coverImageUrl: '',
      imageUrls: [],
      remarks: '',
      jpyAmount: 9600,
      purchaseLink: '',
      orderId: 'DEMO-PO-C2',
      logisticsId: 'JP987654321JP',
      purchaseCosts: [
        { id: 'pc_cd2a', logisticsId: 'JP987654321JP', weight: '1.8' },
        { id: 'pc_cd2b', logisticsId: 'JP555666777JP', weight: '0.9' },
      ],
      orders: [],
    },
  ]
}

function demoGroupBuyData(): GroupBuyAppData {
  return {
    groups: [
      {
        id: 'gb_demo_1',
        name: '示範團｜Jump 周邊',
        status: '已登記',
        closingDate: '2026-06-15',
        saleEndDate: '2026-06-10',
        officialShipDate: '2026-07-01',
        description: '日本 Jump 官方周邊預購示範團，歡迎參考開團專區版面。完整說明請點進卡片查看。',
        coverImageUrl: 'https://picsum.photos/seed/heina-gb1/960/540',
        imageUrls: [
          'https://picsum.photos/seed/heina-gb1/960/540',
          'https://picsum.photos/seed/heina-gb2/960/540',
        ],
        remarks: '結單後約 2 週向官方下單，實際出貨日以公告為準。',
        jpyAmount: 8800,
        purchaseLink: '',
        orderId: 'DEMO-PO-001',
        logisticsId: '',
        orders: [
          {
            id: 'gb_o1',
            customerName: '測試客戶',
            totalTwd: 500,
            deposit: 100,
            domesticShip: 0,
            intlShip: 0,
            balance: 400,
            paymentStatus: '未付款',
            paymentInfo: '',
            items: [{ name: '徽章', qty: 1, jpy: 880, twd: 194 }],
          },
        ],
      },
      ...consolidationDemoGroups(),
      ...inboundDemoGroups(),
    ],
    bankJournal: [
      {
        id: 'bj_demo_1',
        date: '2026-05-01',
        bank: '示範銀行',
        type: '收入',
        amount: 1000,
        category: '團款',
        note: '示範',
      },
    ],
    exchangeRate: 0.22,
    portalConfig: { ...defaultPortal },
    paymentReports: [],
    consolidationShipments: [],
  }
}

function hasReadyConsolidationParcel(groups: GroupBuyAppData['groups']) {
  return groups.some((g) => {
    const st = String(g.status || '').trim()
    if (st !== '官方已發貨' && st !== '已集運') return false
    if ((g.purchaseCosts || []).some((c) => String(c.logisticsId || '').trim())) return true
    return Boolean(String(g.logisticsId || '').trim())
  })
}

/** 若 localStorage 曾存空資料，補回示範團與日記帳，避免開團／查詢頁全空 */
export function mergeGroupBuyAppData(raw: GroupBuyAppData): GroupBuyAppData {
  const demo = demoGroupBuyData()
  const baseGroups = raw.groups?.length ? raw.groups : demo.groups
  const consolExtras = hasReadyConsolidationParcel(baseGroups)
    ? []
    : consolidationDemoGroups().filter((d) => !baseGroups.some((g) => g.id === d.id))
  const inboundExtras = inboundDemoGroups().filter((d) => !baseGroups.some((g) => g.id === d.id))
  const extras = [...consolExtras, ...inboundExtras]
  const merged: GroupBuyAppData = {
    ...demo,
    ...raw,
    portalConfig: { ...defaultPortal, ...(raw.portalConfig ?? {}) },
    groups: extras.length ? [...baseGroups, ...extras] : baseGroups,
    bankJournal: raw.bankJournal?.length ? raw.bankJournal : demo.bankJournal,
    paymentReports: raw.paymentReports ?? demo.paymentReports ?? [],
    portalLookupCustomers: raw.portalLookupCustomers ?? demo.portalLookupCustomers ?? [],
    customerBalanceMemos: raw.customerBalanceMemos ?? demo.customerBalanceMemos ?? [],
    consolidationShipments: raw.consolidationShipments ?? demo.consolidationShipments ?? [],
  }
  return merged
}
