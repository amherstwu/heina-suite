import { useMemo } from 'react'
import type { PublicSpotProduct } from '../api/types'
import { calcDiscount, resolveCoupon, useStorefrontCart } from './cartStore'

const SHIPPING = 38

export function useCartTotals(catalog: PublicSpotProduct[]) {
  const lines = useStorefrontCart((s) => s.lines)
  const couponCode = useStorefrontCart((s) => s.couponCode)

  return useMemo(() => {
    const items = lines
      .map((line) => {
        const product = catalog.find((p) => p.id === line.productId)
        if (!product) return null
        return { ...line, product, lineTotal: product.twdPrice * line.qty }
      })
      .filter(Boolean) as {
      productId: string
      qty: number
      product: PublicSpotProduct
      lineTotal: number
    }[]

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
    const coupon = resolveCoupon(couponCode)
    const discount = calcDiscount(subtotal, coupon)
    const shipping = subtotal > 0 ? SHIPPING : 0
    const total = Math.max(0, subtotal - discount + shipping)

    return { items, subtotal, shipping, discount, coupon, total }
  }, [lines, couponCode, catalog])
}
