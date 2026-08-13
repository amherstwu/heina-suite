import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PublicSpotProduct } from '../api/types'

export type CartLine = { productId: string; qty: number }

type CartState = {
  lines: CartLine[]
  couponCode: string | null
  add: (product: PublicSpotProduct, qty?: number) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  setCoupon: (code: string | null) => void
  itemCount: () => number
}

export const COUPONS = [
  { code: 'HEINA100', label: '滿千折百', type: 'fixed' as const, value: 100, minSpend: 1000 },
  { code: 'SPOT95', label: '現貨 95 折', type: 'percent' as const, value: 5, minSpend: 500 },
  { code: 'VIPSHIP', label: '滿 2000 運費補貼', type: 'fixed' as const, value: 38, minSpend: 2000 },
]

export function resolveCoupon(code: string | null) {
  if (!code) return null
  const c = COUPONS.find((x) => x.code.toUpperCase() === code.toUpperCase())
  return c ?? null
}

export function calcDiscount(subtotal: number, coupon: ReturnType<typeof resolveCoupon>) {
  if (!coupon || subtotal < coupon.minSpend) return 0
  if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal)
  return Math.round(subtotal * (coupon.value / 100))
}

export const useStorefrontCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      couponCode: null,
      add: (product, qty = 1) => {
        set((s) => {
          const existing = s.lines.find((l) => l.productId === product.id)
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.productId === product.id
                  ? { ...l, qty: Math.min(l.qty + qty, product.stockQty) }
                  : l,
              ),
            }
          }
          return { lines: [...s.lines, { productId: product.id, qty: Math.min(qty, product.stockQty) }] }
        })
      },
      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().remove(productId)
          return
        }
        set((s) => ({
          lines: s.lines.map((l) => (l.productId === productId ? { ...l, qty } : l)),
        }))
      },
      remove: (productId) => set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
      clear: () => set({ lines: [], couponCode: null }),
      setCoupon: (code) => set({ couponCode: code }),
      itemCount: () => get().lines.reduce((n, l) => n + l.qty, 0),
    }),
    { name: 'heina-storefront-cart' },
  ),
)
