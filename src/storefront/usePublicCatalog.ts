import { useCallback, useEffect, useState } from 'react'
import type { PublicSpotProduct, StorefrontCatalogResult } from '../api/types'
import { useApi } from '../context/useApi'

export function usePublicCatalog() {
  const api = useApi()
  const [products, setProducts] = useState<PublicSpotProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.call<StorefrontCatalogResult>({
        module: 'storefront',
        action: 'getCatalog',
      })
      setProducts(res.products || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '無法載入商品')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return { products, loading, error, reload }
}
