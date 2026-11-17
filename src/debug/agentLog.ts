/** Debug session NDJSON sink. Production builds do not call the local ingest URL. */

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

function devAgentLog(p: AgentLogPayload) {
  const ingest = 'http://127.0.0.1:7784/ingest/a025bc28-b72b-4378-a301-608560e60fbc'
  const entry = {
    sessionId: SESSION,
    timestamp: Date.now(),
    ...p,
  }
  pushBuffer(entry)
  fetch(ingest, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION },
    body: JSON.stringify(entry),
  }).catch(() => {})
}

export function agentLog(p: AgentLogPayload) {
  if (import.meta.env.DEV) devAgentLog(p)
}

export function readAgentLogBuffer(): Record<string, unknown>[] {
  return [...buffer]
}
