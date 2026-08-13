import { useState } from 'react'
import { COUPONS, resolveCoupon, useStorefrontCart } from '../../storefront/cartStore'

export function StorefrontCouponBox() {
  const couponCode = useStorefrontCart((s) => s.couponCode)
  const setCoupon = useStorefrontCart((s) => s.setCoupon)
  const [input, setInput] = useState(couponCode ?? '')
  const [msg, setMsg] = useState('')

  function apply() {
    const c = resolveCoupon(input.trim())
    if (!c) {
      setMsg('優惠碼無效')
      setCoupon(null)
      return
    }
    setCoupon(c.code)
    setMsg(`已套用：${c.label}`)
  }

  return (
    <div className="sf-card p-4">
      <p className="text-sm font-semibold text-white">優惠碼</p>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          placeholder="HEINA100"
        />
        <button type="button" className="sf-btn-primary !px-4" onClick={apply}>
          套用
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-indigo-300">{msg}</p> : null}
      <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
        {COUPONS.map((c) => (
          <li key={c.code}>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-left hover:text-indigo-300"
              onClick={() => {
                setInput(c.code)
                setCoupon(c.code)
                setMsg(c.label)
              }}
            >
              {c.code} — {c.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
