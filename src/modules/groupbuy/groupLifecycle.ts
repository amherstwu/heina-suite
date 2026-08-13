import type { GroupBuyGroup, PublicGroupCatalogItem } from '../../api/types'
import { normalizeGroupChannel } from './groupBuyHubAnalytics'

/** 舊資料缺省＝已成團（出現在團務管理） */
export function isOpsActive(group: Pick<GroupBuyGroup, 'opsActive'> | Pick<PublicGroupCatalogItem, 'opsActive'>): boolean {
  return group.opsActive !== false
}

/**
 * 團務管理僅通販；場販不進。
 * 舊資料未標管道視為通販側（可進團務）。
 */
export function isMailOrderChannel(
  group: Pick<GroupBuyGroup, 'channel'> | Pick<PublicGroupCatalogItem, 'channel'>,
): boolean {
  return normalizeGroupChannel(group.channel) !== '場販'
}

/** 出現在團務管理：已成團且非場販 */
export function isInGroupOps(
  group: Pick<GroupBuyGroup, 'opsActive' | 'channel'> | Pick<PublicGroupCatalogItem, 'opsActive' | 'channel'>,
): boolean {
  return isOpsActive(group) && isMailOrderChannel(group)
}

/** 舊資料缺省＝開團專區公開 */
export function isPortalListed(
  group: Pick<GroupBuyGroup, 'portalListed'> | Pick<PublicGroupCatalogItem, 'portalListed'>,
): boolean {
  return group.portalListed !== false
}
