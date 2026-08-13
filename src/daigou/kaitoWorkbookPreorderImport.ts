import { isOpenGroupRegistrationSheet } from './openGroupWorkbookHub'
import { parseRegisterSheetOrderBlocks, type RegisterSheetOrderBlock } from './registerSheetImport'
import type { HeinaWorkbookSheetProfile } from './heinaWorkbookSheetProfile'
import { sheetNameExcludedByProfile } from './heinaWorkbookSheetProfile'
import type { OrderStatus, PaymentStatus } from './types'

export type GatherPreorderImportResult = {
  blocks: RegisterSheetOrderBlock[]
  warnings: string[]
  /** 實際納入解析的登記分頁數 */
  sheetsUsed: number
}

/** 自多分頁工作簿收集「登記表」列並解析為訂單區塊（每區塊 remark 會帶預購分頁名） */
export function gatherPreorderBlocksFromSheets(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  profile: HeinaWorkbookSheetProfile,
  defaultExchangeRate: number,
  opts?: { maxSheets?: number; maxBlocks?: number },
): GatherPreorderImportResult {
  const maxSheets = opts?.maxSheets ?? profile.defaultMaxRegistrationSheets
  const maxBlocks = opts?.maxBlocks ?? profile.defaultMaxOrderBlocks
  const warnings: string[] = []
  const blocks: RegisterSheetOrderBlock[] = []
  let sheetsUsed = 0

  const candidates = [...sheets].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))

  for (const sh of candidates) {
    if (blocks.length >= maxBlocks) {
      warnings.push(`已達訂單上限 ${maxBlocks} 筆，後續分頁略過`)
      break
    }
    if (!sh.rows?.length) continue
    const first = sh.rows[0] ?? {}
    if (!isOpenGroupRegistrationSheet(sh.name, first)) continue
    if (sheetNameExcludedByProfile(sh.name, profile)) continue

    if (sheetsUsed >= maxSheets) {
      warnings.push(`已達分頁掃描上限 ${maxSheets}，其餘登記分頁略過`)
      break
    }
    sheetsUsed++

    const { blocks: part, warnings: w } = parseRegisterSheetOrderBlocks(sh.rows, {
      defaultExchangeRate: defaultExchangeRate,
    })
    for (const w0 of w) warnings.push(`${sh.name}：${w0}`)
    for (const b of part) {
      const tag = `預購分頁：${sh.name}`
      b.remark = b.remark ? `${b.remark}｜${tag}` : tag
      blocks.push(b)
    }
  }

  if (!blocks.length) warnings.push('未解析到任何訂單區塊（請確認分頁第一列含「名字」與「商品」標題）')
  return { blocks, warnings, sheetsUsed }
}

/** 由登記表 remark（付款：／出貨：）粗判付款狀態，供客戶查詢顯示 */
export function inferPaymentStatusFromRegisterRemark(remark: string): PaymentStatus {
  if (!remark.includes('付款：')) return 'unpaid'
  const m = remark.match(/付款：([^｜]+)/)
  const p = (m?.[1] ?? '').replace(/\s/g, '')
  if (!p) return 'unpaid'
  if (/全[額款]|付清|已結|對帳完成/.test(p)) return 'fully_paid'
  if (/尾款|二補|補款|待收尾/.test(p)) return 'balance_due'
  if (/#\d{4,}|台新|中信|郵局|銀行|扣款|匯款|已匯|銷帳/.test(p)) return 'deposit_paid'
  if (/未付|待匯|尚未/.test(p)) return 'unpaid'
  return 'deposit_paid'
}

export function inferOrderStatusFromRegisterRemark(remark: string): OrderStatus {
  const m = remark.match(/出貨：([^｜]+)/)
  const s = (m?.[1] ?? '').trim()
  if (!s) return 'waiting_arrival'
  if (/\d{4}-\d{2}-\d{2}/.test(s)) return 'arrived'
  if (/已寄|已取|到貨|抵台|可取貨/.test(remark)) return 'shipped'
  return 'waiting_arrival'
}

export function totalReceivedForInferredPayment(
  pay: PaymentStatus,
  deposit: number,
  totalAmount: number,
): number {
  if (pay === 'fully_paid') return totalAmount
  if (pay === 'deposit_paid' || pay === 'balance_due') return Math.min(deposit, totalAmount)
  return 0
}
