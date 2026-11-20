/** 複製到剪貼簿。HTTPS／localhost 用 Clipboard API；手機區網 HTTP 改用選取後備。 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = String(text ?? '')
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && globalThis.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      /* HTTP 區網或權限被拒時改後備 */
    }
  }
  return copyWithExecCommand(value)
}

function copyWithExecCommand(value: string): boolean {
  if (typeof document === 'undefined') return false
  const el = document.createElement('textarea')
  el.value = value
  el.setAttribute('readonly', '')
  el.setAttribute('aria-hidden', 'true')
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '0'
  el.style.width = '2px'
  el.style.height = '2px'
  el.style.padding = '0'
  el.style.border = 'none'
  el.style.outline = 'none'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, value.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(el)
  return ok
}
