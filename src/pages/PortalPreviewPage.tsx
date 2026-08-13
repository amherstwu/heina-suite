import { ExternalLink } from 'lucide-react'

import { Card, Btn, PageHeader } from '../components/ui'

function openPortalInNewTab(hashPath: '/portal' | '/lookup') {
  const base = `${window.location.origin}${window.location.pathname.replace(/\/?$/, '')}`
  const url = `${base}#${hashPath}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function PortalPreviewPage() {
  return (
    <div>
      <PageHeader
        title="客戶查詢預覽（說明）"
        subtitle="後台內嵌預覽請改至「前台預覽」；此區保留對外連結說明。"
        action={
          <>
            <Btn variant="secondary" to="/customer-preview">
              前往前台預覽
            </Btn>
            <Btn type="button" onClick={() => openPortalInNewTab('/portal')}>
              <ExternalLink className="h-4 w-4" />
              新分頁：#/portal
            </Btn>
            <Btn type="button" onClick={() => openPortalInNewTab('/lookup')}>
              <ExternalLink className="h-4 w-4" />
              新分頁：#/lookup
            </Btn>
          </>
        }
      />
      <Card className="text-sm text-zinc-600">
        <p className="mb-4">
          顧客查詢為<strong className="text-zinc-900">獨立版面</strong>，不含後台毛利與成本。對外連結請分享{' '}
          <code className="rounded bg-zinc-100 px-1">/#/portal</code>（簡易查單）或{' '}
          <code className="rounded bg-zinc-100 px-1">/#/lookup</code>（完整顧客專區；Hash 路由，本機與 GAS 相同）。
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" className="w-full sm:w-auto" to="/portal">
            在此視窗開啟 #/portal
          </Btn>
          <Btn variant="secondary" className="w-full sm:w-auto" to="/lookup">
            在此視窗開啟 #/lookup
          </Btn>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          若查無資料，請至「整合」匯入開團明細 Excel；若畫面異常，可至「設定」→「清空本機資料」後再匯入一次。
        </p>
      </Card>
    </div>
  )
}
