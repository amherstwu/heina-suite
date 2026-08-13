import { useEffect } from 'react'
import { useApi } from '../context/useApi'
import { useDaigouStore } from '../daigou/store'
import { mapCustomersToPortalLookup } from '../daigou/portalLookupAuth'
import {
  mapCustomersToSharedBalanceMemos,
  syncPortalLookupCustomersToGroupbuy,
} from '../daigou/portalLookupSync'

/** 客人列表／帳務備註變更時，同步至 Mock 本機與 GAS 系統設定 */
export function PortalLookupSyncBridge() {
  const api = useApi()
  const customers = useDaigouStore((s) => s.customers)

  useEffect(() => {
    syncPortalLookupCustomersToGroupbuy(customers)
    const portalLookupCustomers = mapCustomersToPortalLookup(customers)
    const customerBalanceMemos = mapCustomersToSharedBalanceMemos(customers)
    void api
      .call({
        module: 'groupbuy',
        action: 'syncPortalLookupCustomers',
        payload: { portalLookupCustomers, customerBalanceMemos },
      })
      .catch(() => {})
  }, [customers, api])

  return null
}
