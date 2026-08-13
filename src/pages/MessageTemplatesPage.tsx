import { useMemo, useState } from 'react'
import { Copy, Eye, RotateCcw } from 'lucide-react'
import { Btn, Card, PageHeader, Chip, Modal } from '../components/ui'
import { useDaigouStore } from '../daigou/store'
import { TEMPLATE_VARIABLE_HINTS } from '../daigou/constants'
import type { NotificationTemplate } from '../daigou/types'

function fillTemplate(content: string, vars: Record<string, string>) {
  let out = content
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v)
  }
  return out
}

export function MessageTemplatesPage() {
  const templates = useDaigouStore((s) => s.notificationTemplates)
  const orders = useDaigouStore((s) => s.orders)
  const customers = useDaigouStore((s) => s.customers)
  const groups = useDaigouStore((s) => s.groups)
  const settings = useDaigouStore((s) => s.settings)
  const updateNotificationTemplate = useDaigouStore((s) => s.updateNotificationTemplate)
  const resetNotificationTemplates = useDaigouStore((s) => s.resetNotificationTemplates)
  const addToast = useDaigouStore((s) => s.addToast)

  const previewOrder = orders[0]
  const previewCustomer = previewOrder ? customers.find((c) => c.id === previewOrder.customerId) : undefined
  const previewGroup = previewOrder ? groups.find((g) => g.id === previewOrder.groupId) : undefined

  const previewVars = useMemo(() => {
    const o = previewOrder
    const c = previewCustomer
    const g = previewGroup
    return {
      customerName: c?.name ?? '（客戶）',
      groupName: g?.name ?? '（團名）',
      orderId: o?.lookupCode ?? 'HMB-00000',
      orderTotal: String(o?.totalAmount ?? 0),
      deposit: String(o?.deposit ?? 0),
      balance: String(o?.balance ?? 0),
      shippingFee: String((o?.domesticShipping ?? 0) + (o?.internationalShipping ?? 0)),
      bankInfo: settings.bankInfo,
      trackingNo: 'TW0000000',
      storeName: '7-ELEVEN 示範門市',
      pickupDeadline: '2026-05-10',
    }
  }, [previewOrder, previewCustomer, previewGroup, settings.bankInfo])

  const [edit, setEdit] = useState<NotificationTemplate | null>(null)
  const [draft, setDraft] = useState('')

  function openEdit(t: NotificationTemplate) {
    setEdit(t)
    setDraft(t.content)
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
    addToast('已複製到剪貼簿', 'ok')
  }

  function saveDraft() {
    if (!edit) return
    updateNotificationTemplate(edit.id, { content: draft })
    setEdit(null)
  }

  return (
    <div>
      <PageHeader
        title="訊息範本中心"
        subtitle="催款、出貨、取貨等 LINE／私訊範本 · 支援變數預覽"
        action={
          <Btn variant="secondary" onClick={() => resetNotificationTemplates()}>
            <RotateCcw className="h-4 w-4" />
            全部還原預設
          </Btn>
        }
      />

      <Card className="mb-6 !p-4 text-meta text-ds-text-secondary">
        可用變數：
        {TEMPLATE_VARIABLE_HINTS.map((h) => (
          <code key={h} className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-ds-text-muted">
            {h}
          </code>
        ))}
      </Card>

      <div className="space-y-3">
        {templates.map((t) => {
          const preview = fillTemplate(t.content, previewVars)
          return (
            <Card key={t.id} className="!p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ds-text">{t.name}</h3>
                  <p className="text-meta text-ds-text-muted">更新 {t.updatedAt}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.variables.map((v) => (
                      <Chip key={v} tone="neutral">
                        {v}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="secondary" className="!py-2" onClick={() => void copyText(t.content)}>
                    <Copy className="h-4 w-4" />
                    複製範本
                  </Btn>
                  <Btn variant="secondary" className="!py-2" onClick={() => void copyText(preview)}>
                    <Eye className="h-4 w-4" />
                    複製預覽
                  </Btn>
                  <Btn className="!py-2" onClick={() => openEdit(t)}>
                    編輯
                  </Btn>
                </div>
              </div>
              <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-4 text-body text-ds-text-secondary ring-1 ring-white/[0.06]">
                {preview}
              </pre>
            </Card>
          )
        })}
      </div>

      <Modal open={!!edit} title={edit ? `編輯：${edit.name}` : ''} onClose={() => setEdit(null)}>
        {edit ? (
          <div className="space-y-4 text-body">
            <textarea className="min-h-[200px] w-full font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <p className="text-meta text-ds-text-muted">
              預覽（{previewOrder ? `使用訂單 ${previewOrder.lookupCode}` : '尚無訂單，變數以佔位顯示'}）
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-ds-surface p-3 text-sm">
              {fillTemplate(draft, previewVars)}
            </pre>
            <div className="flex gap-2">
              <Btn className="flex-1" onClick={saveDraft}>
                儲存
              </Btn>
              <Btn variant="secondary" className="flex-1" onClick={() => setDraft(edit.content)}>
                還原此範本未儲存內容
              </Btn>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
