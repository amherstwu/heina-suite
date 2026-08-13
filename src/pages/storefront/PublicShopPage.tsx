import { useMemo, useState } from 'react'
import { usePublicCatalog } from '../../storefront/usePublicCatalog'
import { PublicProductCard } from './PublicProductCard'

export function PublicShopPage() {
  const { products, loading, error } = usePublicCatalog()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  const categories = useMemo(() => {
    const u = new Set(products.map((p) => p.category).filter(Boolean))
    return ['all', ...Array.from(u)]
  }, [products])

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase()
    return products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false
      if (lower && !`${p.name}${p.sku}${p.category}`.toLowerCase().includes(lower)) return false
      return true
    })
  }, [products, q, cat])

  return (
    <div className="sf-container py-10">
      <h1 className="text-2xl font-black text-white">現貨商城</h1>
      <p className="mt-2 text-sm text-slate-500">資料來自後台發布；下單後請至官方 LINE 確認</p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-sm ${
                cat === c ? 'bg-indigo-600 text-white' : 'border border-white/10 text-slate-400'
              }`}
            >
              {c === 'all' ? '全部' : c}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="搜尋商品…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 sm:w-56"
        />
      </div>

      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
      {loading ? (
        <p className="mt-8 text-slate-500">載入中…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-slate-500">目前沒有可購買的現貨，請稍後再來或聯絡官方 LINE。</p>
      ) : (
        <div className="sf-grid mt-8">
          {filtered.map((p) => (
            <PublicProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
