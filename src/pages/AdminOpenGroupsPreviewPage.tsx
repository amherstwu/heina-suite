import { OpenGroupsPage } from './open-groups/OpenGroupsPage'

export function AdminOpenGroupsPreviewPage() {
  return (
    <div className="space-y-4 admin-og-page">
      <OpenGroupsPage embedded variant="admin" />
    </div>
  )
}
