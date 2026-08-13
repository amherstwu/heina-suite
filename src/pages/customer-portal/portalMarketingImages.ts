/** 行銷 AI 插圖（Vite 打包進 GAS 單檔） */
import heroImg from '../../assets/marketing/heina-marketing-hero.png'
import goodsImg from '../../assets/marketing/heina-marketing-goods.png'
import shippingImg from '../../assets/marketing/heina-marketing-shipping.png'
import galleryImg from '../../assets/marketing/heina-marketing-gallery.png'
import serviceImg from '../../assets/marketing/heina-marketing-service.png'
import streetImg from '../../assets/marketing/heina-marketing-street.png'

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
