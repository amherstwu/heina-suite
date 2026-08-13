import { createContext } from 'react'
import type { UnifiedClient } from '../api/client'

export const ApiContext = createContext<UnifiedClient | null>(null)
