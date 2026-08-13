export type OpenGroupMasterRow = {
  title: string
  closingDate: string | null
  saleEndDate: string | null
  purchaseDate: string | null
  purchasePlace: string
  shipEta: string
  phase: string
  jpyAmount: string
  cardPay: string
  link?: string
}

export type OpenGroupStructSheet = {
  name: string
  rowCount: number
  /** 若由靜態 JSON 載入可省略，畫面會以 OPEN_GROUP_STRUCT_ROLE 補上 */
  role?: string
}

export type OpenGroupWorkbookInsights = {
  version: 1
  sourceLabel: string
  workbookSheetTotal: number
  registrationSheetCount: number
  registrationTopSheets: string[]
  structSheets: OpenGroupStructSheet[]
  masterRowsSample: OpenGroupMasterRow[]
}
