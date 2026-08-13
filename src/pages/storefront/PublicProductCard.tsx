import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import type { PublicSpotProduct } from '../../api/types'
import { useStorefrontCart } from '../../storefront/cartStore'

export function PublicProductCard({ product }: { product: PublicSpotProduct }) {
  const add = useStorefrontCart((s) => s.add)

  return (
    <article className="sf-card flex flex-col">
      <Link to={`/shop/p/${product.id}`} className="block aspect-square overflow-hidden no-underline">
        <img
          src={product.imageUrl || 'https://picsum.photos/seed/spot/400/400'}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <span className="text-[10px] uppercase tracking-wide text-indigo-300/80">{product.category}</span>
        <Link
          to={`/shop/p/${product.id}`}
          className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100 no-underline"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-lg font-bold text-white">NT${product.twdPrice}</p>
        <p className="text-xs text-slate-500">庫存 {product.stockQty}</p>
        <button type="button" className="sf-btn-primary mt-auto w-full !text-xs" onClick={() => add(product)}>
          <ShoppingCart size={14} />
          加入購物車
        </button>
      </div>
    </article>
  )
}
