import { useEffect } from 'react'
import { useDaigouStore } from '../daigou/store'
import {
  CHROME_DARK,
  CHROME_LIGHT,
  DARK_SHELL,
  LIGHT_SHELL,
  resolveAccentColors,
} from '../daigou/themePresets'

function setVar(el: HTMLElement, key: string, value: string) {
  el.style.setProperty(key, value)
}

/** 將設定中的主題／配色套用到 :root（供 Tailwind @theme 變數使用） */
export function useApplyVisualTheme() {
  const settings = useDaigouStore((s) => s.settings)

  useEffect(() => {
    const root = document.documentElement
    const theme = settings.theme ?? 'light'
    const { colorPreset, accentPrimary, accentSecondary, accentHighlight } = settings
    const shell = theme === 'light' ? LIGHT_SHELL : DARK_SHELL
    const chrome = theme === 'light' ? CHROME_LIGHT : CHROME_DARK
    const acc = resolveAccentColors({
      colorPreset: colorPreset ?? 'default',
      accentPrimary,
      accentSecondary,
      accentHighlight,
    })

    setVar(root, '--color-ds-primary', acc.primary)
    setVar(root, '--color-ds-secondary', acc.secondary)
    setVar(root, '--color-ds-highlight', acc.highlight)

    setVar(root, '--color-ds-bg', shell.bg)
    setVar(root, '--color-ds-surface', shell.surface)
    setVar(root, '--color-ds-surface-raised', shell.surfaceRaised)
    setVar(root, '--color-ds-card', shell.card)
    setVar(root, '--color-ds-text', shell.text)
    setVar(root, '--color-ds-text-secondary', shell.textSecondary)
    setVar(root, '--color-ds-text-muted', shell.textMuted)
    setVar(root, '--color-ds-success', shell.success)
    setVar(root, '--color-ds-warning', shell.warning)
    setVar(root, '--color-ds-danger', shell.danger)

    setVar(root, '--ds-chrome-border', chrome.border)
    setVar(root, '--ds-chrome-border-faint', chrome.borderFaint)
    setVar(root, '--ds-chrome-hover-bg', chrome.hoverBg)
    setVar(root, '--ds-chrome-active-bg', chrome.activeBg)
    setVar(root, '--ds-chrome-inset-line', chrome.insetLine)
    setVar(root, '--ds-chrome-card-top', chrome.cardTopLine)

    root.dataset.theme = theme
    root.classList.toggle('theme-light', theme === 'light')
    root.classList.toggle('theme-dark', theme !== 'light')

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', shell.bg)
  }, [settings])
}
