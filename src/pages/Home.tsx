import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/groupbuy',
    title: '團購訂單',
    desc: '團務、客訂、帳務對帳、顧客自助查詢 Portal、匯率與系統設定。',
  },
  {
    to: '/preorder',
    title: '預購',
    desc: '正規化開團資料、批次新增客訂、雲端同步。',
  },
]

export function Home() {
  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>
        歡迎使用 Heina Suite
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '520px' }}>
        三個模組共用側欄與主題。開發模式資料寫入 localStorage；掛載於 Google
        Apps Script 後由 unifiedApi 讀寫同一本試算表。
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="heina-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: 'var(--heina-blue)' }}>
              {c.title}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
