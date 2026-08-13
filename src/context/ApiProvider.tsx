import { useMemo, type ReactNode } from 'react'
import { ApiContext } from './apiContextBase'
import type { UnifiedClient } from '../api/client'
import { createMockClient } from '../adapters/mock'
import { createGasClient, isGasHost } from '../adapters/gas'

export function ApiProvider({ children }: { children: ReactNode }) {
  const client = useMemo<UnifiedClient>(() => {
    if (isGasHost()) return createGasClient()
    return createMockClient()
  }, [])

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>
}
