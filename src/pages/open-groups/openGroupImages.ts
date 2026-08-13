/** 開團專區圖片：合併 imageUrls 與舊版 coverImageUrl */
export function normalizeGroupImageUrls(imageUrls?: string[] | null, coverImageUrl?: string): string[] {
  const fromArray = (imageUrls || []).map((s) => String(s).trim()).filter(Boolean)
  if (fromArray.length) return fromArray
  const cover = String(coverImageUrl || '').trim()
  return cover ? [cover] : []
}

export function primaryGroupImageUrl(imageUrls?: string[] | null, coverImageUrl?: string): string {
  const urls = normalizeGroupImageUrls(imageUrls, coverImageUrl)
  return urls[0] || ''
}

export function openGroupDetailHref(
  groupId: string,
  options?: { fromLookupQuery?: string; fromLookupOrderId?: string },
): string {
  const base = `/open-groups/${encodeURIComponent(groupId)}`
  const q = String(options?.fromLookupQuery || '').trim()
  if (!q) return base
  const params = new URLSearchParams()
  params.set('from', 'lookup')
  params.set('q', q)
  const orderId = String(options?.fromLookupOrderId || '').trim()
  if (orderId) params.set('order', orderId)
  return `${base}?${params.toString()}`
}
