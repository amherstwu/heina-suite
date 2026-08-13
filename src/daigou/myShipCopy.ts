import type { MyShipRecord } from './types'

export const MYSHIP_SHIPPED_NOTIFY = `{customerName} 您好，您的訂單「{orderId}」已安排賣貨便寄出。
門市：{storeName}
追蹤編號：{trackingNo}
取貨期限：{pickupDeadline}
請記得期限內取貨，謝謝您。`

export const MYSHIP_PICKUP_REMIND = `{customerName} 您好，您的包裹已到達 7-ELEVEN「{storeName}」。
取貨期限為 {pickupDeadline}。
請盡快完成取貨，避免逾期退回。`

export const MYSHIP_OVERDUE_WARN = `{customerName} 您好，您的包裹即將逾期。
門市：{storeName}
取貨期限：{pickupDeadline}
若逾期未取，可能會產生退貨運費或影響後續下單資格。`

export function fillMyShipText(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? vars[k] : `{${k}}`))
}

export function myShipVarsFromRecord(r: MyShipRecord, orderLookup: string) {
  return {
    customerName: r.receiverName,
    orderId: orderLookup,
    storeName: r.receiverStoreName,
    trackingNo: r.trackingNo ?? '（尚無）',
    pickupDeadline: r.pickupDeadline ?? '（尚未設定）',
  }
}

/** 「複製賣貨便資料」區塊 */
export function buildMyShipFormCopy(r: MyShipRecord, orderLookup: string, remarkExtra = '') {
  const lines = [
    `收件人：${r.receiverName}`,
    `手機：${r.receiverPhone}`,
    `門市名稱：${r.receiverStoreName}`,
    `門市店號：${r.receiverStoreId}`,
    `門市地址：${r.receiverStoreAddress}`,
    `寄件金額：${r.shippingFee}`,
    `代收金額：${r.collectionAmount ?? 0}`,
    `備註：${[r.notes, remarkExtra].filter(Boolean).join(' ')}`,
    `訂單編號：${orderLookup}`,
  ]
  return lines.join('\n')
}
