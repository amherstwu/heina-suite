/**
 * 「開團明細」類 Google Sheets／Excel 版型設定（單一來源）。
 * 後續若試算表結構固定，請只調整此檔；`kaitoWorkbookPreorderImport` 與整檔匯入會讀同一套規則。
 */
export type HeinaWorkbookSheetProfile = {
  /** 設定檔識別（可寫入匯入紀錄） */
  id: string
  /** 顯示名稱 */
  label: string
  /** 主檔工作表名稱（僅供說明／未來主檔同步） */
  masterSheetNames: readonly string[]
  /**
   * 分頁名稱額外排除（RegExp 字串）。
   * 內建已排除樞紐、流水帳、開團明細主表等；此處補上各店家常見噪音分頁。
   */
  extraExcludeSheetNameRegex: string
  /** 整檔匯入預設：最多掃描幾個登記分頁（避免一次解析過百表卡頓） */
  defaultMaxRegistrationSheets: number
  /** 整檔匯入預設：最多建立幾筆訂單 */
  defaultMaxOrderBlocks: number
  /** 主表每分頁最多幾列（含標題下資料列） */
  defaultMaxMasterRows: number
}

export const HEINA_DEFAULT_WORKBOOK_PROFILE: HeinaWorkbookSheetProfile = {
  id: 'heina-kaito-preorder-v1',
  label: 'Heina 開團明細（多分頁預購）',
  masterSheetNames: ['開團明細', '開團表單'],
  extraExcludeSheetNameRegex:
    '(樞紐|^工作表\\d+$|^鬼滅-色紙|流水帳|Linebank|信用卡|設定$|代碼表$|總攬$|紀錄$|^開團明細$|^開團表單$|^團清單$|^商品清單$|^預購登記$|^客戶名單$|^分需彙總$|^二補匯率$|中信流水帳|國泰流水帳|郵局流水帳)',
  defaultMaxRegistrationSheets: 100,
  defaultMaxOrderBlocks: 2500,
  defaultMaxMasterRows: 500,
}

export function sheetNameExcludedByProfile(sheetName: string, profile: HeinaWorkbookSheetProfile): boolean {
  try {
    return new RegExp(profile.extraExcludeSheetNameRegex, 'i').test(sheetName)
  } catch {
    return false
  }
}
