import type { Settings } from './types'

export type AccentSet = {
  primary: string
  secondary: string
  highlight: string
}

type PresetKey = Exclude<Settings['colorPreset'], 'custom'>

/** 馬卡龍色：低飽和糖果粉彩強調色 */
export const THEME_PRESETS: Record<PresetKey, AccentSet> = {
  default: { primary: '#e8a4b8', secondary: '#f5c6d0', highlight: '#ffe8ef' },
  ocean: { primary: '#8ec5d8', secondary: '#b8dde8', highlight: '#e8f6fa' },
  rose: { primary: '#f0a8a0', secondary: '#f8cfc8', highlight: '#fff0ed' },
  forest: { primary: '#9bc4a8', secondary: '#c2ddcb', highlight: '#ebf6ef' },
  sunset: { primary: '#f0c090', secondary: '#f8dcb8', highlight: '#fff4e6' },
  lavender: { primary: '#b8a8d8', secondary: '#d4c8ea', highlight: '#f3eefc' },
  ember: { primary: '#e8b4a0', secondary: '#f0d0c0', highlight: '#fff0e8' },
  mono: { primary: '#c4b8c8', secondary: '#ddd4e0', highlight: '#f6f2f8' },
  mint: { primary: '#8fd4c0', secondary: '#b8e8da', highlight: '#e8faf4' },
  berry: { primary: '#d4a0c0', secondary: '#e8c4d8', highlight: '#faeef6' },
}

/** 十組預設配色（不含 custom）— 供設定頁與型別對齊 */
export const COLOR_PRESET_OPTIONS: { id: PresetKey; label: string }[] = [
  { id: 'default', label: '馬卡龍草莓' },
  { id: 'ocean', label: '馬卡龍天空' },
  { id: 'rose', label: '馬卡龍蜜桃' },
  { id: 'forest', label: '馬卡龍抹茶' },
  { id: 'sunset', label: '馬卡龍焦糖' },
  { id: 'lavender', label: '馬卡龍紫芋' },
  { id: 'ember', label: '馬卡龍杏桃' },
  { id: 'mono', label: '馬卡龍香芋灰' },
  { id: 'mint', label: '馬卡龍薄荷' },
  { id: 'berry', label: '馬卡龍覆盆子' },
]

/** 深色底（進階／夜間模式） */
export const DARK_SHELL = {
  bg: '#1a1620',
  surface: '#241f2a',
  surfaceRaised: '#2e2836',
  card: '#322c3a',
  text: '#faf6f8',
  textSecondary: '#c8b8c4',
  textMuted: '#9a8a96',
  success: '#7ed4b0',
  warning: '#f0c090',
  danger: '#f0a0b0',
}

/** 淡色底：馬卡龍奶油底 */
export const LIGHT_SHELL = {
  bg: '#fff7f9',
  surface: '#fffbfc',
  surfaceRaised: '#ffffff',
  card: '#fffbfc',
  text: '#4a3f48',
  textSecondary: '#7a6a74',
  textMuted: '#a898a0',
  success: '#5cb896',
  warning: '#d4a060',
  danger: '#e87890',
}

export const CHROME_DARK = {
  border: 'rgba(255, 255, 255, 0.1)',
  borderFaint: 'rgba(255, 255, 255, 0.06)',
  hoverBg: 'rgba(232, 164, 184, 0.12)',
  activeBg: 'rgba(232, 164, 184, 0.2)',
  insetLine: 'rgba(255, 255, 255, 0.05)',
  cardTopLine: 'rgba(255, 232, 239, 0.15)',
}

export const CHROME_LIGHT = {
  border: 'rgba(200, 160, 180, 0.28)',
  borderFaint: 'rgba(200, 160, 180, 0.16)',
  hoverBg: 'rgba(232, 164, 184, 0.12)',
  activeBg: 'rgba(232, 164, 184, 0.2)',
  insetLine: 'rgba(255, 252, 253, 0.9)',
  cardTopLine: 'rgba(255, 232, 239, 0.95)',
}

export function resolveAccentColors(
  s: Pick<Settings, 'colorPreset' | 'accentPrimary' | 'accentSecondary' | 'accentHighlight'>,
): AccentSet {
  if (s.colorPreset === 'custom') {
    const p = (s.accentPrimary || THEME_PRESETS.default.primary).trim()
    const sec = (s.accentSecondary || THEME_PRESETS.default.secondary).trim()
    const hi = (s.accentHighlight || THEME_PRESETS.default.highlight).trim()
    return { primary: p, secondary: sec, highlight: hi }
  }
  const id = (s.colorPreset ?? 'default') as PresetKey
  return THEME_PRESETS[id] ?? THEME_PRESETS.default
}
