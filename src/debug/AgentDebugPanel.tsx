import { useCallback, useEffect, useState } from 'react'
import { readAgentLogBuffer } from './agentLog'

function hasAgentDebug(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const q = new URLSearchParams(window.location.search).get('agentDebug')
    if (q === '1' || q === 'true') return true
    return localStorage.getItem('heina.agentDebug') === '1'
  } catch {
    return false
  }
}

export function AgentDebugPanel() {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    setEnabled(hasAgentDebug())
  }, [])

  const refresh = useCallback(() => {
    const lines = readAgentLogBuffer().map((o) => JSON.stringify(o))
    setText(lines.join('\n'))
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const t = window.setInterval(refresh, 2000)
    return () => window.clearInterval(t)
  }, [enabled, refresh])

  if (!enabled) return null

  return (
    <div className="fixed bottom-2 left-2 z-[9999] max-w-[min(100vw-1rem,28rem)] font-mono text-[10px]">
      <button
        type="button"
        className="rounded-lg border border-amber-500/40 bg-zinc-900/95 px-2 py-1 text-amber-200 shadow-lg"
        onClick={() => setOpen((o) => !o)}
      >
        agentDebug
      </button>
      {open ? (
        <div className="mt-1 max-h-[40vh] overflow-auto rounded-lg border border-white/10 bg-black/90 p-2 text-white shadow-xl">
          <div className="mb-1 flex gap-1">
            <button type="button" className="rounded bg-white/10 px-2 py-0.5" onClick={refresh}>
              重新整理
            </button>
            <button
              type="button"
              className="rounded bg-amber-600/80 px-2 py-0.5 text-white"
              onClick={() => void navigator.clipboard.writeText(text)}
            >
              複製
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-all text-[9px] leading-snug opacity-90">{text || '（尚無 log）'}</pre>
        </div>
      ) : null}
    </div>
  )
}
