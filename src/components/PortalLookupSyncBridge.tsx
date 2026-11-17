import { useEffect, useState } from 'react'
import { useApi } from '../context/useApi'
import { hasRemoteGas } from '../config/gasEndpoint'
import { useDaigouStore } from '../daigou/store'
import { mapCustomersToPortalLookup } from '../daigou/portalLookupAuth'
import {
  mapCustomersToSharedBalanceMemos,
  syncPortalLookupCustomersToGroupbuy,
} from '../daigou/portalLookupSync'
import { getAdminToken, isAdminSessionValid } from '../auth/adminSession'

/**
 * 客人列表變更時寫入本機查單名單。
 * 正式站只有已登入的管理員會把名單送到 Apps Script，避免顧客瀏覽器的示範資料覆蓋查單密碼。
 */
export function PortalLookupSyncBridge() {
  const api = useApi()
  const customers = useDaigouStore((s) => s.customers)
  const [hydrated, setHydrated] = useState(() => useDaigouStore.persist.hasHydrated())

  useEffect(() => {
    setHydrated(useDaigouStore.persist.hasHydrated())
    return useDaigouStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    syncPortalLookupCustomersToGroupbuy(customers)
    if (hasRemoteGas() && !(isAdminSessionValid() && getAdminToken())) return
    const portalLookupCustomers = mapCustomersToPortalLookup(customers)
    const customerBalanceMemos = mapCustomersToSharedBalanceMemos(customers)
    void api
      .call({
        module: 'groupbuy',
        action: 'syncPortalLookupCustomers',
        payload: { portalLookupCustomers, customerBalanceMemos },
      })
      .catch(() => {})
  }, [customers, api, hydrated])

  return null
}
