/**
 * 代購常用報價規則（盲盒、紙片、海報等）
 * 實務可依團別覆寫；此處為 MVP 預設表與公式。
 */

export type BlindPresetKey =
  | 'jpy110'
  | 'jpy154'
  | 'jpy165'
  | 'jpy200_220'
  | 'jpy275'
  | 'wafer_snack'
  | 'a4_clearfile'
  | 'poster_over_a4'
  | 'figure'

/** 回傳 { opened, unopened } 台幣參考售價 */
export const BLIND_PRESET_TWD: Record<
  Exclude<BlindPresetKey, 'a4_clearfile' | 'poster_over_a4' | 'figure'>,
  { opened: number; unopened: number }
> = {
  jpy110: { opened: 50, unopened: 45 },
  jpy154: { opened: 60, unopened: 55 },
  jpy165: { opened: 70, unopened: 65 },
  jpy200_220: { opened: 75, unopened: 70 },
  jpy275: { opened: 85, unopened: 80 },
  wafer_snack: { opened: 65, unopened: 70 },
}

/** 標準：日幣 × 匯率（台幣） */
export function standardTwd(jpy: number, rate: number) {
  return Math.round(jpy * rate)
}

/** A4 資料夾：JPY × 0.29 + 20 */
export function a4ClearfileTwd(jpy: number) {
  return Math.round(jpy * 0.29 + 20)
}

/** 大於 A4 海報：JPY × 0.29 + 50 */
export function posterOverA4Twd(jpy: number) {
  return Math.round(jpy * 0.29 + 50)
}

/** 公仔：JPY × 0.26 + 材積費（簡化為固定參數） */
export function figureTwd(jpy: number, volumetricFee = 80) {
  return Math.round(jpy * 0.26 + volumetricFee)
}
