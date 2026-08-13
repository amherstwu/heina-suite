import { NavLink, Outlet } from 'react-router-dom'
import './Shell.css'

const links = [
  { to: '/', label: '首頁', end: true },
  { to: '/groupbuy', label: '團購訂單' },
  { to: '/preorder', label: '預購' },
] as const

export function Shell() {
  return (
    <div className="heina-shell">
      <aside className="heina-shell-side">
        <div className="heina-shell-brand">
          <div className="heina-shell-logo">Heina Suite</div>
          <div className="heina-shell-sub">團購 · 預購</div>
        </div>
        <nav className="heina-shell-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : false}
              className={({ isActive }) =>
                'heina-shell-link' + (isActive ? ' heina-shell-link-active' : '')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="heina-shell-foot">
          本地開發使用瀏覽器儲存；部署至 GAS 後自動改用 google.script.run。
        </p>
      </aside>
      <main className="heina-shell-main">
        <Outlet />
      </main>
    </div>
  )
}
