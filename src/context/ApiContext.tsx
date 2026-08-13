import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { UnifiedClient } from '../api/client'
import { createMockClient } from '../adapters/mock'
import { createGasClient, isGasHost } from '../adapters/gas'

const ApiCtx = createContext<UnifiedClient | null>(null)

export function ApiProvider({ children }: { children: ReactNode }) {
  const client = useMemo<UnifiedClient>(() => {
    if (isGasHost()) return createGasClient()
    return createMockClient()
  }, [])

  return <ApiCtx.Provider value={client}>{children}</ApiCtx.Provider>
}

export function useApi(): UnifiedClient {
  const c = useContext(ApiCtx)
  if (!c) throw new Error('useApi outside ApiProvider')
  return c
}
