/** Debug session NDJSON sink (session 92d6d5). No secrets / PII. */

const INGEST = 'http://127.0.0.1:7784/ingest/a025bc28-b72b-4378-a301-608560e60fbc'
const SESSION = '92d6d5'
const MAX = 200

export type AgentLogPayload = {
  runId?: string
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
}

const buffer: Record<string, unknown>[] = []

function pushBuffer(entry: Record<string, unknown>) {
  buffer.push(entry)
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX)
  try {
    ;(globalThis as unknown as { __HEINA_AGENT_LOGS__?: Record<string, unknown>[] }).__HEINA_AGENT_LOGS__ = buffer
  } catch {
    /* ignore */
  }
  try {
    const key = 'heina_agent_log_92d6d5'
    const tail = buffer.slice(-80)
    sessionStorage.setItem(key, JSON.stringify(tail))
  } catch {
    /* ignore */
  }
}

export function agentLog(p: AgentLogPayload) {
  const entry = {
    sessionId: SESSION,
    timestamp: Date.now(),
    ...p,
  }
  pushBuffer(entry)
  fetch(INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION },
    body: JSON.stringify(entry),
  }).catch(() => {})
}

export function readAgentLogBuffer(): Record<string, unknown>[] {
  return [...buffer]
}
