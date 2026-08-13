import rulesImg from '../../assets/marketing/heina-guide-rules.png'
import shoppingFlowImg from '../../assets/marketing/heina-guide-shopping-flow.png'
import exchangeRateImg from '../../assets/marketing/heina-guide-exchange-rate.png'

export type HeinaGuideInfographic = {
  id: string
  title: string
  desc: string
  src: string
  alt: string
}

/** 老闆自製代購流程圖（訂單查詢／群規共用） */
export const HEINA_GUIDE_INFOGRAPHICS: HeinaGuideInfographic[] = [
  {
    id: 'shopping-flow',
    title: '購物流程 & 結帳方式',
    desc: '首次交易、連線喊單、討論串與包材加購說明',
    src: shoppingFlowImg,
    alt: 'Heina 購物流程與結帳方式說明圖',
  },
  {
    id: 'rules',
    title: '交易規則 & 免責聲明',
    desc: '付款方式、預購流程、取貨運送與現場連線注意事項',
    src: rulesImg,
    alt: 'Heina 代購群組交易規則與免責聲明圖',
  },
  {
    id: 'exchange-rate',
    title: '匯率 & 價格計算',
    desc: '一般匯率、盲抽定價、二手店區間與喊單規則',
    src: exchangeRateImg,
    alt: 'Heina 匯率與價格計算規則圖',
  },
]
