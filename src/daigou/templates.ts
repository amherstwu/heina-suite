/** 一鍵複製訊息範本（變數以 {name} 表示） */

export type TemplateId =
  | 'deposit_reminder'
  | 'balance_reminder'
  | 'arrival_notice'
  | 'shipping_notice'
  | 'payment_confirm'
  | 'cancel_notice'

export const MESSAGE_TEMPLATES: { id: TemplateId; title: string; body: string }[] = [
  {
    id: 'deposit_reminder',
    title: '訂金提醒',
    body:
      '嗨 {customerName}，您在「{groupName}」的訂單合計約 {orderTotal} 元，訂金 {deposit} 元尚未收到。匯款後請回傳末五碼，帳號：{bankInfo}。謝謝！',
  },
  {
    id: 'balance_reminder',
    title: '尾款提醒',
    body:
      '嗨 {customerName}，「{groupName}」已到貨／即將結算，尾款 {balance} 元請於三日內完成匯款。帳號：{bankInfo}。訂單參考：{orderTotal} 元（含運）。',
  },
  {
    id: 'arrival_notice',
    title: '到貨通知',
    body:
      '嗨 {customerName}，您在「{groupName}」訂購的商品已到貨，請留意尾款 {balance} 元與取貨方式公告。若有問題請私訊小編。',
  },
  {
    id: 'shipping_notice',
    title: '出貨通知',
    body:
      '嗨 {customerName}，您的包裹已寄出，物流單號：{trackingNo}。本次訂單金額 {orderTotal} 元，若已全額付訖請忽略本則尾款提醒。',
  },
  {
    id: 'payment_confirm',
    title: '入帳確認',
    body:
      '嗨 {customerName}，已確認收到款項（訂金／尾款），感謝支持！訂單將依團務進度處理。團別：{groupName}。',
  },
  {
    id: 'cancel_notice',
    title: '取消通知',
    body:
      '嗨 {customerName}，您在「{groupName}」的訂單因故取消／無法成立，若有已付款項將另行通知退款方式。造成不便敬請見諒。',
  },
]

export function fillTemplateVars(body: string, vars: Record<string, string>) {
  return body.replace(/\{(\w+)\}/g, (_, key: string) => (vars[key] != null ? vars[key] : `{${key}}`))
}
