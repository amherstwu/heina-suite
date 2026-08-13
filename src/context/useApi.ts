import { useContext } from 'react'
import { ApiContext } from './apiContextBase'
import type { UnifiedClient } from '../api/client'

export function useApi(): UnifiedClient {
  const c = useContext(ApiContext)
  if (!c) throw new Error('useApi must be used within ApiProvider')
  return c
}
