import type { UnifiedRequest } from '../api/types'
import { getAdminToken } from './adminSession'

/** Attach the server session token. Login itself must not send a stale token. */
export function attachAdminToken(req: UnifiedRequest): UnifiedRequest {
  if (req.module === 'auth' && req.action === 'login') return req
  const adminToken = getAdminToken()
  if (!adminToken) return req
  return { ...req, adminToken }
}
