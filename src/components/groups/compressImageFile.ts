/** Google 試算表單一儲存格約 5 萬字元；壓縮後 data URL 須低於此值才存得進設定表 */
export const MAX_IMAGE_DATA_URL_CHARS = 48_000

const START_SIDE = 1100
const MIN_SIDE = 200

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`無法讀取「${file.name}」（若為 HEIC／HEIF 請先轉成 JPG／PNG）`))
    }
    img.src = url
  })
}

function drawScaled(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const scale = Math.min(1, maxSide / Math.max(w, h, 1))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法處理圖片')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(img, 0, 0, cw, ch)
  return canvas
}

/**
 * 將上傳檔壓縮為 JPEG data URL，避免試算表／本機儲存爆掉。
 * 會持續縮小尺寸與品質直到符合上限。
 */
export async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (file.type && !file.type.startsWith('image/') && file.type !== 'application/octet-stream') {
    throw new Error(`「${file.name}」不是支援的圖片格式`)
  }
  if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name)) {
    throw new Error(`「${file.name}」為 HEIC，請先轉成 JPG／PNG 再上傳，或改貼圖片網址`)
  }

  const img = await loadImageFromFile(file)
  let maxSide = START_SIDE
  let quality = 0.68
  let dataUrl = ''
  let best = ''

  for (let attempt = 0; attempt < 24; attempt++) {
    const canvas = drawScaled(img, maxSide)
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (!best || dataUrl.length < best.length) best = dataUrl
    if (dataUrl.length <= MAX_IMAGE_DATA_URL_CHARS) return dataUrl

    // 先降品質，再縮邊長；兩邊都壓到最低仍超標就下一輪再縮
    if (quality > 0.32) {
      quality = Math.max(0.28, quality - 0.1)
    } else if (maxSide > MIN_SIDE) {
      maxSide = Math.max(MIN_SIDE, Math.round(maxSide * 0.72))
      quality = 0.55
    } else if (quality > 0.18) {
      quality = Math.max(0.15, quality - 0.05)
    } else {
      break
    }
  }

  if (best && best.length <= MAX_IMAGE_DATA_URL_CHARS) return best

  // 最後手段：固定小圖再壓一次
  const tiny = drawScaled(img, 160)
  dataUrl = tiny.toDataURL('image/jpeg', 0.12)
  if (dataUrl.length <= MAX_IMAGE_DATA_URL_CHARS) return dataUrl

  throw new Error(
    `「${file.name}」無法壓到可儲存大小，請改貼外部圖片連結（https://），或先用繪圖軟體縮成較小 JPG`,
  )
}
