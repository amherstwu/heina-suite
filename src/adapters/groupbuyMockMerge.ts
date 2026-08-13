import type { GroupBuyAppData } from '../api/types'

const defaultPortal = {
  title: '訂單自助查詢',
  intro: '輸入社群暱稱即可查詢訂單狀態與付款資訊。',
  websiteUrl: 'https://example.com',
  groupUrl: 'https://example.com/group',
  extraNote: '付款後請填寫：付款日期、後五碼，等待對帳完成後即可在此查看狀態。',
  preorderShopUrl: 'https://example.com/preorder',
  spotShopUrl: 'https://example.com/shop',
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
  }
}

/** 若 localStorage 曾存空資料，補回示範團與日記帳，避免開團／查詢頁全空 */
export function mergeGroupBuyAppData(raw: GroupBuyAppData): GroupBuyAppData {
  const demo = demoGroupBuyData()
  const merged: GroupBuyAppData = {
    ...demo,
    ...raw,
    portalConfig: { ...defaultPortal, ...(raw.portalConfig ?? {}) },
    groups: raw.groups?.length ? raw.groups : demo.groups,
    bankJournal: raw.bankJournal?.length ? raw.bankJournal : demo.bankJournal,
    paymentReports: raw.paymentReports ?? demo.paymentReports ?? [],
    portalLookupCustomers: raw.portalLookupCustomers ?? demo.portalLookupCustomers ?? [],
    customerBalanceMemos: raw.customerBalanceMemos ?? demo.customerBalanceMemos ?? [],
  }
  return merged
}
