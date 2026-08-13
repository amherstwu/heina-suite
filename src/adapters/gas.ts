import type { UnifiedClient } from '../api/client'
import type { UnifiedRequest } from '../api/types'

declare global {
  interface Window {
    google?: {
      script?: {
        run: {
          withSuccessHandler: (cb: (v: unknown) => void) => {
            withFailureHandler: (cb: (err: Error) => void) => {
              unifiedApi: (json: string) => void
            }
          }
        }
      }
    }
  }
}

export function createGasClient(): UnifiedClient {
  return {
    call<T>(req: UnifiedRequest): Promise<T> {
      return new Promise((resolve, reject) => {
        const g = window.google?.script?.run
        if (!g) {
          reject(new Error('google.script.run 不可用（請以 Web App 開啟）'))
          return
        }
        const json = JSON.stringify(req)
        g.withSuccessHandler((res: unknown) => resolve(res as T))
          .withFailureHandler((err: Error) => reject(err))
          .unifiedApi(json)
      })
    },
  }
}

export function isGasHost(): boolean {
  return typeof window !== 'undefined' && !!window.google?.script?.run
}
