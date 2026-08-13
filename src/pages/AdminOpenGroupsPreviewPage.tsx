import { Link } from 'react-router-dom'
import { OpenGroupsPage } from './open-groups/OpenGroupsPage'

export function AdminOpenGroupsPreviewPage() {
  return (
    <div className="space-y-4 admin-og-page">
      <OpenGroupsPage embedded variant="admin" />
      <p className="text-sm text-ds-text-secondary admin-og-page-hint">
        客人從{' '}
        <Link to="/lookup" className="font-semibold text-ds-primary hover:underline">
          訂單查詢
        </Link>{' '}
        首頁可預覽最多 3 團（可在此頁小卡「釘選至顧客首頁」指定）；其餘請點「查看其他開團」進入{' '}
        <Link to="/open-groups" className="font-semibold text-ds-primary hover:underline">
          /open-groups
        </Link>
        （無編輯、無團務管理）。後台請在此頁管理。
      </p>
    </div>
  )
}
