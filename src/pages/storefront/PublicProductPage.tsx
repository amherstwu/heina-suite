import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { usePublicCatalog } from '../../storefront/usePublicCatalog'
import { useStorefrontCart } from '../../storefront/cartStore'

export function PublicProductPage() {
  const { id } = useParams()
  const { products, loading } = usePublicCatalog()
  const product = products.find((p) => p.id === id)
  const add = useStorefrontCart((s) => s.add)
  const [qty, setQty] = useState(1)

  if (loading) {
    return <p className="sf-container py-16 text-slate-500">載入中…</p>
  }

  if (!product) {
    return (
      <div className="sf-container py-16 text-center">
        <p className="text-slate-500">找不到商品</p>
        <Link to="/shop" className="sf-btn-primary mt-4 inline-flex">
          回商城
        </Link>
      </div>
    )
  }

  return (
    <div className="sf-container py-10">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-slate-500 no-underline">
        <ArrowLeft size={16} /> 回商城
      </Link>
      <div className="sf-product-layout mt-6">
        <div className="sf-card overflow-hidden">
          <img
            src={product.imageUrl || 'https://picsum.photos/seed/spot/600/600'}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </div>
        <div>
          <p className="text-xs text-indigo-300">{product.category}</p>
          <h1 className="mt-2 text-2xl font-black text-white">{product.name}</h1>
          <p className="mt-3 text-3xl font-bold">NT${product.twdPrice}</p>
          <p className="mt-2 text-sm text-slate-500">SKU {product.sku} · 庫存 {product.stockQty}</p>
          {product.notes ? <p className="mt-4 text-sm text-slate-400">{product.notes}</p> : null}
          <div className="mt-6 flex items-center gap-3">
            <label className="text-sm text-slate-400">
              數量
              <input
                type="number"
                min={1}
                max={product.stockQty}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(product.stockQty, Number(e.target.value) || 1)))}
                className="ml-2 w-16 rounded border border-white/10 bg-black/20 px-2 py-1 text-white"
              />
            </label>
            <button type="button" className="sf-btn-primary" onClick={() => add(product, qty)}>
              <ShoppingCart size={18} />
              加入購物車
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
