import type { UnifiedRequest } from './types'

export type UnifiedClient = {
  call<T = unknown>(req: UnifiedRequest): Promise<T>
}
