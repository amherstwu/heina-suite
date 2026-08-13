import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { HEINA_OFFICIAL_LINE_URL } from '../../daigou/heinaPublicCopy'
import { usePublicCatalog } from '../../storefront/usePublicCatalog'
import { useStorefrontCart } from '../../storefront/cartStore'
import { useCartTotals } from '../../storefront/useCartTotals'

export function PublicCheckoutPage() {
  const navigate = useNavigate()
  const { products } = usePublicCatalog()
  const { items, subtotal, shipping, discount, total, coupon } = useCartTotals(products)
  const clear = useStorefrontCart((s) => s.clear)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ nickname: '', phone: '', lineId: '', ship: '711' as '711' | 'meet', note: '' })

  if (items.length === 0 && !done) {
    return (
      <div className="sf-container py-16 text-center">
        <Link to="/shop" className="sf-btn-primary inline-flex">
          回商城
        </Link>
      </div>
    )
  }

  const lineMessage = encodeURIComponent(
    [
      '【Heina Shop 官網現貨訂單】',
      `暱稱：${form.nickname}`,
      `手機：${form.phone}`,
      form.lineId ? `LINE ID：${form.lineId}` : '',
      `取貨：${form.ship === '711' ? '7-11 賣貨便' : '面交'}`,
      '',
      ...items.map((i) => `${i.product.name} x${i.qty} = NT$${i.lineTotal}`),
      '',
      `小計 NT$${subtotal}`,
      discount ? `折抵 -NT$${discount}` : '',
      `運費 NT$${shipping}`,
      `總計 NT$${total}`,
      form.note ? `備註：${form.note}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setDone(true)
    clear()
  }

  if (done) {
    return (
      <div className="sf-container max-w-lg py-16 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
        <h1 className="mt-4 text-xl font-bold text-white">訂單已建立</h1>
        <p className="mt-2 text-sm text-slate-500">請傳送至官方 LINE 由代購主確認付款與出貨。</p>
        <a
          href={`${HEINA_OFFICIAL_LINE_URL}&text=${lineMessage}`}
          target="_blank"
          rel="noreferrer"
          className="sf-btn-primary mt-6 inline-flex"
        >
          <MessageCircle size={18} />
          傳送訂單至 LINE
        </a>
        <button type="button" className="sf-btn-ghost mt-4 block w-full" onClick={() => navigate('/shop')}>
          繼續購物
        </button>
      </div>
    )
  }

  return (
    <div className="sf-container py-10">
      <h1 className="text-2xl font-black text-white">結帳</h1>
      <form onSubmit={submit} className="sf-checkout-layout mt-8">
        <div className="sf-card space-y-4 p-6">
          <label className="block text-sm text-slate-400">
            暱稱 *
            <input
              required
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-slate-400">
            手機 *
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <fieldset>
            <legend className="text-sm text-slate-400">取貨</legend>
            <label className="mr-4 text-sm">
              <input type="radio" checked={form.ship === '711'} onChange={() => setForm((f) => ({ ...f, ship: '711' }))} />{' '}
              賣貨便
            </label>
            <label className="text-sm">
              <input type="radio" checked={form.ship === 'meet'} onChange={() => setForm((f) => ({ ...f, ship: 'meet' }))} /> 面交
            </label>
          </fieldset>
          <textarea
            rows={2}
            placeholder="備註"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
          />
        </div>
        <div className="sf-card p-6">
          <p className="font-bold">總計 NT${total}</p>
          {coupon ? <p className="text-xs text-indigo-300">優惠：{coupon.code}</p> : null}
          <button type="submit" className="sf-btn-primary mt-6 w-full">
            確認送出
          </button>
          <Link to="/cart" className="mt-3 block text-center text-sm text-slate-500 no-underline">
            回購物車
          </Link>
        </div>
      </form>
    </div>
  )
}
