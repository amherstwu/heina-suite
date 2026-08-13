import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { usePublicCatalog } from '../../storefront/usePublicCatalog'
import { useStorefrontCart } from '../../storefront/cartStore'
import { useCartTotals } from '../../storefront/useCartTotals'
import { StorefrontCouponBox } from './StorefrontCouponBox'

export function PublicCartPage() {
  const { products } = usePublicCatalog()
  const { items, subtotal, shipping, discount, total } = useCartTotals(products)
  const setQty = useStorefrontCart((s) => s.setQty)
  const remove = useStorefrontCart((s) => s.remove)

  if (items.length === 0) {
    return (
      <div className="sf-container py-16 text-center">
        <p className="text-slate-500">購物車是空的</p>
        <Link to="/shop" className="sf-btn-primary mt-4 inline-flex">
          前往商城
        </Link>
      </div>
    )
  }

  return (
    <div className="sf-container py-10">
      <h1 className="text-2xl font-black text-white">購物車</h1>
      <div className="sf-cart-layout mt-8">
        <ul className="space-y-4">
          {items.map(({ product, qty, lineTotal }) => (
            <li key={product.id} className="sf-card flex gap-4 p-4">
              <img src={product.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex flex-1 flex-col">
                <Link to={`/shop/p/${product.id}`} className="font-semibold text-slate-100 no-underline">
                  {product.name}
                </Link>
                <p className="text-sm text-slate-500">
                  NT${product.twdPrice} × {qty}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" className="rounded border border-white/10 p-1" onClick={() => setQty(product.id, qty - 1)}>
                      <Minus size={14} />
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      className="rounded border border-white/10 p-1"
                      onClick={() => setQty(product.id, Math.min(product.stockQty, qty + 1))}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">NT${lineTotal}</span>
                    <button type="button" onClick={() => remove(product.id)} className="text-slate-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="space-y-4">
          <StorefrontCouponBox />
          <div className="sf-card p-5">
            <p className="font-bold text-white">訂單摘要</p>
            <dl className="mt-3 space-y-2 text-sm text-slate-400">
              <div className="flex justify-between">
                <dt>小計</dt>
                <dd>NT${subtotal}</dd>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-400">
                  <dt>折抵</dt>
                  <dd>-NT${discount}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>賣貨便運費</dt>
                <dd>NT${shipping}</dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white">
                <dt>總計</dt>
                <dd>NT${total}</dd>
              </div>
            </dl>
            <Link to="/checkout" className="sf-btn-primary mt-4 block w-full text-center">
              前往結帳
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
