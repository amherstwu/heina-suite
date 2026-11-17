import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Btn, PageHeader } from '../components/ui'
import { useApi } from '../context/useApi'
import type { GroupBuyAppData, GroupBuySavePayload } from '../api/types'
import { V50BillingReconcile } from '../modules/groupbuy/V50BillingReconcile'
import { syncV50OrderToDaigou } from '../modules/groupbuy/v50DaigouSync'
import { createAdminReviewPaymentReport } from '../modules/groupbuy/paymentReportLogic'
import '../modules/groupbuy/groupbuy.css'

export function PaymentReviewPage() {
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<GroupBuyAppData['groups']>([])
  const [bankJournal, setBankJournal] = useState<GroupBuyAppData['bankJournal']>([])
  const [exchangeRate, setExchangeRate] = useState(0.22)
  const [portalConfig, setPortalConfig] = useState<GroupBuyAppData['portalConfig'] | null>(null)
  const [paymentReports, setPaymentReports] = useState<GroupBuyAppData['paymentReports']>([])
  const [statusMsg, setStatusMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.call<GroupBuyAppData>({ module: 'groupbuy', action: 'getAppData' })
      setGroups(data.groups || [])
      setBankJournal(data.bankJournal || [])
      setExchangeRate(data.exchangeRate ?? 0.22)
      setPortalConfig(data.portalConfig)
      setPaymentReports(data.paymentReports || [])
    } catch (e) {
      console.error(e)
      setStatusMsg('讀取失敗')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const persist = useCallback(
    async (
      nextGroups: GroupBuyAppData['groups'],
      nextJournal = bankJournal,
      nextPaymentReports = paymentReports,
    ) => {
      setStatusMsg('儲存中…')
      try {
        const payload: GroupBuySavePayload = {
          groups: nextGroups,
          bankJournal: nextJournal,
          exchangeRate,
          portalConfig: portalConfig || {
            title: '訂單自助查詢',
            intro: '',
            websiteUrl: '',
            groupUrl: '',
            extraNote: '',
          },
          paymentReports: nextPaymentReports,
        }
        await api.call({ module: 'groupbuy', action: 'saveAppData', payload })
        setGroups(nextGroups)
        setBankJournal(nextJournal)
        setPaymentReports(nextPaymentReports)
        setStatusMsg('已儲存')
      } catch (e) {
        console.error(e)
        setStatusMsg(e instanceof Error ? e.message : '儲存失敗')
      }
      setTimeout(() => setStatusMsg(''), 2200)
    },
    [api, bankJournal, exchangeRate, portalConfig, paymentReports],
  )

  if (loading) {
    return <div className="gb-loading">付款審核資料載入中…</div>
  }

  return (
    <div className="space-y-6">
      {statusMsg ? <div className="gb-toast">{statusMsg}</div> : null}

      <PageHeader
        title="付款審核"
        action={
          <>
            <Btn variant="secondary" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              重新載入
            </Btn>
            <Btn variant="secondary" to="/groups">
              前往團務管理
            </Btn>
          </>
        }
      />

      <V50BillingReconcile
        groups={groups}
        emptyText="目前沒有需要審核的未付款客訂。"
        onNotify={setStatusMsg}
        onConfirmBill={async ({ nextGroups, journalRow, targetOrderIds, customerName }) => {
          const nextJournal = [journalRow, ...bankJournal]
          const note = journalRow.note || ''
          const lastFiveMatch = note.match(/後五碼\s*(\d{5})/)
          const payNoteMatch = note.match(/·\s*(.+)$/)
          const lastFive = lastFiveMatch?.[1] || (payNoteMatch?.[1]?.replace(/^#/, '').trim() || '—')
          const adminReport = createAdminReviewPaymentReport(nextGroups, {
            customerName,
            orderIds: targetOrderIds,
            remittanceDate: journalRow.date,
            remittanceBank: journalRow.bank,
            lastFive,
            totalAmount: journalRow.amount,
            journalEntryId: journalRow.id,
          })
          const nextReports = [adminReport, ...(paymentReports || [])]
          for (const g of nextGroups) {
            for (const o of g.orders) {
              if (targetOrderIds.includes(o.id)) syncV50OrderToDaigou(g, o)
            }
          }
          await persist(nextGroups, nextJournal, nextReports)
        }}
      />

      <p className="text-meta text-ds-text-muted">
        訂單明細請至 <Link to="/orders" className="font-semibold text-ds-primary hover:underline">客單管理</Link> 或{' '}
        <Link to="/nickname-search" className="font-semibold text-ds-primary hover:underline">暱稱查單</Link>。
      </p>
    </div>
  )
}
