import type { PortalAnnouncement, PortalConfig, PortalFaqItem, PortalProcessStep } from '../../api/types'

export const FOOTER_STATS = {
  todayViews: 392,
  monthViews: 13292,
  designerLine: '本網頁由 Heina Shop 設計與維護',
  /** 若無統編可留空字串，頁尾將隱藏該行 */
  taxId: '',
  copyright: '© 2026 Heina Shop. All Rights Reserved.',
} as const

export const DEFAULT_ANNOUNCEMENTS: PortalAnnouncement[] = [
  {
    id: 'a1',
    title: '官賴回覆延遲公告',
    date: '2026/04/04',
    category: '重要',
    description: '客服回覆可能較平常延遲，請依公告為準。',
  },
  {
    id: 'a2',
    title: '跑馬燈',
    date: '2026/03/04',
    category: '系統',
    description: '最新消息將同步於社群與此區更新。',
  },
  {
    id: 'a3',
    title: '延遲出貨公告',
    date: '2026/03/04',
    category: '延遲',
    description: '部分訂單因日本官方出貨延後，詳見各團狀態。',
  },
  {
    id: 'a4',
    title: '日本連線預購提醒',
    date: '2026/03/01',
    category: '活動',
    description: '預購商品請留意結單日與付款期限。',
  },
  {
    id: 'a5',
    title: '出貨批次更新',
    date: '2026/02/28',
    category: '出貨',
    description: '本週出貨名單已於社群公告，可由此查單確認。',
  },
]

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '查不到訂單怎麼辦？',
    a: '請確認輸入的社群暱稱是否與下單時一致。若您更改過名稱，請私訊官方 LINE 協助修改。',
  },
  {
    q: '第一次交易要注意什麼？',
    a: '請先加官方 LINE 並告知群組暱稱、留資料。首次交易超過 NT$1,000 需先付訂金；喊單後原則不可取消。',
  },
  {
    q: '匯率怎麼算？',
    a: '一般日幣 × 0.3（尾數取 0／5）；當次合計達 NT$5,000 可降至 0.29。盲抽、二手店另有定價，重物另報價。詳見「代購流程」匯率圖。',
  },
  {
    q: '多久會更新一次訂單狀態？',
    a: '一般會依照訂單整理與出貨進度更新，特殊延遲會公告於最新公告區。',
  },
  {
    q: '付款狀態顯示錯誤怎麼辦？',
    a: '請提供付款截圖與社群暱稱，私訊客服協助確認。',
  },
  {
    q: '什麼時候會出貨？',
    a: '回國後會統一通知結帳／出貨，國內以 7-11 賣貨便為主；面交僅台北萬華／桃園八德。',
  },
  {
    q: '可以修改社群暱稱嗎？',
    a: '可以，請私訊官方 LINE，客服會協助更新，避免查詢不到訂單。',
  },
  {
    q: '預購商品可以取消嗎？',
    a: '預購／喊單後原則視為成立，不接受任意取消；詳細規則請見代購流程圖與社群公告。',
  },
  {
    q: '如何聯絡客服？',
    a: '請使用官方 LINE 客服，並提供社群暱稱與問題內容。',
  },
]

export const PROCESS_STEPS: { n: number; title: string; detail: string }[] = [
  {
    n: 1,
    title: '第一次交易先加官方 LINE',
    detail: '加好友後主動告知群組暱稱並留資料；之後改名也請私訊更新，才查得到單。',
  },
  {
    n: 2,
    title: '連線／記事本喊單',
    detail: '在當天記事本截圖＋留言數量。首次交易超過 NT$1,000 需先付訂金；有買到會按貼圖。',
  },
  {
    n: 3,
    title: '討論串問價與許願',
    detail: '各店有獨立討論串，問價／庫存／許願請留言在對應串（如駿河屋、安美）。',
  },
  {
    n: 4,
    title: '預購：留言 → 結單通知付款 → 匯款後採購',
    detail: '預購於記事本留言；結單後通知金額與期限；確認匯款後才開始購買。',
  },
  {
    n: 5,
    title: '回國後統一通知結帳／出貨',
    detail: '以 7-11 賣貨便為主；可加購紙板／紙箱。面交僅台北萬華／桃園八德（需配合時間）。',
  },
  {
    n: 6,
    title: '匯率與價格',
    detail: '一般日幣×0.3（尾數取 0/5）；滿 NT$5,000 可用 0.29。盲抽／二手店另有定價表，重物另報價。',
  },
]

export type SocialRow = {
  id: string
  label: string
  description: string
  href: string
  icon: 'line' | 'bag' | 'insta' | 'threads' | 'box' | 'users'
}

/** 由 Portal 設定組出 6 條 SNS（缺連結時仍顯示列，href 為 # 並於 UI 標示待設定） */
export function buildSocialRows(p: PortalConfig): SocialRow[] {
  const lineFriend = p.lineFriendUrl || p.serviceUrl || ''
  const lineShop = p.lineShoppingUrl || p.groupUrl || ''
  const insta = p.instagramUrl || (p.websiteUrl?.includes('instagram') ? p.websiteUrl : '') || ''
  const threads = p.threadsUrl || ''
  const preorder = p.preorderShopUrl || ''
  const spot = p.spotShopUrl || p.linePayUrl || ''

  return [
    {
      id: 'line-friend',
      label: '加官方賴好友',
      description: '訂單問題、改名、付款與客服協助',
      href: lineFriend || '#',
      icon: 'line',
    },
    {
      id: 'line-shop',
      label: 'LINE購物社群',
      description: '新品公告、喊單與社群更新',
      href: lineShop || '#',
      icon: 'users',
    },
    {
      id: 'ig',
      label: 'Official Instagram',
      description: '商品分享、開箱與最新消息',
      href: insta || '#',
      icon: 'insta',
    },
    {
      id: 'threads',
      label: 'Official Threads',
      description: '日常更新與公告提醒',
      href: threads || '#',
      icon: 'threads',
    },
    {
      id: 'preorder',
      label: '預購下單賣場',
      description: '目前開放預購商品',
      href: preorder || '#',
      icon: 'bag',
    },
    {
      id: 'spot',
      label: '現貨賣場',
      description: '可直接購買的現貨商品',
      href: spot || '#',
      icon: 'box',
    },
  ]
}

export function announcementsFor(p: PortalConfig): PortalAnnouncement[] {
  const a = p.announcements
  if (Array.isArray(a) && a.length > 0) return a
  return DEFAULT_ANNOUNCEMENTS
}

export function faqFor(p: PortalConfig): PortalFaqItem[] {
  const f = p.faqItems
  if (Array.isArray(f) && f.length > 0) return f
  return FAQ_ITEMS
}

export function processStepsFor(p: PortalConfig): PortalProcessStep[] {
  const s = p.processSteps
  if (Array.isArray(s) && s.length > 0) return s
  return PROCESS_STEPS
}
