import type { PreorderGroup, PreorderItem, PreorderOrder } from '../../api/types'

function item(id: string, name: string, qty: number, jpy: number, twd: number): PreorderItem {
  return { id, name, qty, jpy, twd }
}

function order(
  id: string,
  customerName: string,
  items: PreorderItem[],
  opts: Partial<Pick<PreorderOrder, 'deposit' | 'domesticShip' | 'intlShip' | 'paymentStatus' | 'paymentInfo'>> & {
    totalTwd: number
    balance: number
  },
): PreorderOrder {
  return {
    id,
    customerName,
    items,
    deposit: opts.deposit ?? 0,
    domesticShip: opts.domesticShip ?? 0,
    intlShip: opts.intlShip ?? 0,
    totalTwd: opts.totalTwd,
    balance: opts.balance,
    paymentStatus: opts.paymentStatus ?? '未付款',
    paymentInfo: opts.paymentInfo ?? '',
  }
}

/** 本機／Mock 離線時可載入的預購示範資料，方便測試列表、對帳與同步 */
export function demoPreorderGroups(): PreorderGroup[] {
  return [
    {
      id: 'pre_seed_1',
      name: '【示範】2026 春番預購團',
      status: '進行中',
      closingDate: '2026-05-20',
      saleEndDate: '2026-05-18',
      purchaseDate: '2026-05-25',
      purchasePlace: 'Animate 通路',
      officialShipDate: '2026-08-01',
      jpyAmount: 125000,
      creditCard: '',
      orderId: 'PRE-2026-501',
      logisticsId: 'LOG-PRE-01',
      purchaseLink: 'https://example.com/preorder/spring',
      orders: [
        order('po_o1', '示範客人甲', [item('pi1', '角色立牌 A', 1, 1800, 400), item('pi2', '徽章組', 2, 550, 240)], {
          totalTwd: 880,
          balance: 480,
          deposit: 400,
          domesticShip: 60,
          intlShip: 0,
          paymentStatus: '部分付款',
          paymentInfo: '已匯訂金',
        }),
        order('po_o2', '示範客人乙', [item('pi3', '壓克力吊飾', 1, 1200, 264)], {
          totalTwd: 264,
          balance: 264,
          deposit: 0,
          paymentStatus: '未付款',
        }),
      ],
    },
    {
      id: 'pre_seed_2',
      name: '【示範】限定版盒玩預購',
      status: '已登記',
      closingDate: '2026-06-01',
      saleEndDate: '2026-05-28',
      purchaseDate: '2026-06-10',
      purchasePlace: '官網抽選',
      officialShipDate: '2026-09-15',
      jpyAmount: 48000,
      creditCard: '',
      orderId: 'PRE-2026-502',
      logisticsId: '',
      purchaseLink: '',
      orders: [
        order('po_o3', '示範客人丙', [item('pi4', '盲盒單抽', 3, 800, 176)], {
          totalTwd: 528,
          balance: 328,
          deposit: 200,
          domesticShip: 0,
          intlShip: 80,
          paymentStatus: '未付款',
        }),
      ],
    },
  ]
}
