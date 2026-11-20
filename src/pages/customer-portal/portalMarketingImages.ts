/** 行銷插圖：使用壓縮 JPG，避免 GAS 單檔 HTML 過大（原 PNG 合計十數 MB） */
import heroImg from '../../assets/marketing/gas/heina-marketing-hero.jpg'
import goodsImg from '../../assets/marketing/gas/heina-marketing-goods.jpg'
import shippingImg from '../../assets/marketing/gas/heina-marketing-shipping.jpg'
import galleryImg from '../../assets/marketing/gas/heina-marketing-gallery.jpg'
import serviceImg from '../../assets/marketing/gas/heina-marketing-service.jpg'
import streetImg from '../../assets/marketing/gas/heina-marketing-street.jpg'

export const PORTAL_MARKETING_IMAGES = {
  hero: heroImg,
  goods: goodsImg,
  shipping: shippingImg,
  gallery: galleryImg,
  service: serviceImg,
  street: streetImg,
} as const

/** 畫廊牆：多張圖拼貼用 */
export const PORTAL_GALLERY_WALL = [
  { src: heroImg, alt: '代購開箱與日本連線' },
  { src: goodsImg, alt: '動漫周邊現貨' },
  { src: shippingImg, alt: '國際物流出貨' },
  { src: galleryImg, alt: '熱門品項集合' },
  { src: serviceImg, alt: '官方客服協助' },
  { src: streetImg, alt: '日本店頭連線' },
] as const
