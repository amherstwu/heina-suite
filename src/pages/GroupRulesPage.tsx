import { ExternalLink, Megaphone, MessagesSquare } from 'lucide-react'
import { Btn, Card, PageHeader } from '../components/ui'
import {
  HEINA_LINE_OPEN_CHAT_INVITES,
  HEINA_OFFICIAL_LINE_URL,
  HEINA_RULES_BODY_SECTIONS,
} from '../daigou/heinaPublicCopy'
import { HeinaGuideInfographics } from './customer-portal/HeinaGuideInfographics'
import './customer-portal/heinaGuideInfographics.css'

export { HEINA_OFFICIAL_LINE_URL, HEINA_LINE_OPEN_CHAT_INVITES } from '../daigou/heinaPublicCopy'

export function GroupRulesPage() {
  return (
    <div>
      <PageHeader
        title="群規與條款"
        subtitle="Heina 代購 · 連線／預購規則、付款與免責說明（與顧客查詢頁、設定種子文案一致）"
        action={
          <Btn href={HEINA_OFFICIAL_LINE_URL} target="_blank">
            <ExternalLink className="h-4 w-4" />
            Heina 官方 LINE
          </Btn>
        }
      />

      <div className="space-y-4">
        <Card className="!p-5">
          <h2 className="mb-2 text-section font-semibold text-ds-text">官方流程圖</h2>
          <p className="mb-3 text-meta text-ds-text-muted">與訂單查詢系統「代購流程」區塊相同，點圖可放大。</p>
          <HeinaGuideInfographics variant="admin" />
        </Card>

        <Card className="!p-5">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-ds-primary" strokeWidth={1.75} />
            <div className="min-w-0 space-y-3 text-body leading-relaxed text-ds-text-secondary">
              <p className="text-base font-bold text-ds-text">首次交易請私訊官方 LINE</p>
              <p>
                首次連線交易超過 <strong className="text-ds-text">NT$1,000</strong>，需付訂金（實際門檻與成數以當次連線公告為準）。
              </p>
              <p className="font-semibold text-ds-text">Heina 官方 LINE</p>
              <a
                href={HEINA_OFFICIAL_LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex break-all text-sm font-semibold text-ds-highlight underline-offset-2 hover:underline"
              >
                {HEINA_OFFICIAL_LINE_URL}
              </a>
              <p className="text-sm">
                不清楚價格、可否代購、限購規則等，請先私訊官方 LINE，避免誤會。
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-start gap-3">
            <MessagesSquare className="mt-0.5 h-5 w-5 shrink-0 text-ds-secondary" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <h2 className="text-section font-semibold text-ds-text">LINE 社群邀請</h2>
              <p className="mt-1 text-meta text-ds-text-muted">點選連結即可加入對應 OpenChat／社群</p>
              <ul className="mt-4 space-y-3">
                {HEINA_LINE_OPEN_CHAT_INVITES.map((g) => (
                  <li
                    key={g.href}
                    className="rounded-xl border border-white/[0.08] bg-ds-surface-raised/30 px-4 py-3"
                  >
                    <p className="text-sm font-semibold leading-snug text-ds-text">{g.label}</p>
                    <a
                      href={g.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ds-highlight underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      加入社群
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {HEINA_RULES_BODY_SECTIONS.map((sec) => (
          <Card key={sec.title} className="!p-5">
            <h2 className="text-section font-semibold text-ds-text">{sec.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-body leading-relaxed text-ds-text-secondary">
              {sec.bullets.map((line, i) => (
                <li key={`${sec.title}-${i}`}>{line}</li>
              ))}
            </ul>
          </Card>
        ))}

        <Card className="!p-5">
          <h2 className="text-section font-semibold text-ds-text">預購範本（參考）</h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-ds-surface-raised/40 p-4 text-meta leading-relaxed text-ds-text-secondary">
{`#4月代購 咒術 Cover city

💰 價格：匯率 × 0.3

付款：賣貨便｜匯款｜LINE Pay
✔ 訂金 80%；賣貨便取貨率 95% 以上可貨到
✔ 不用二補國際運費
📌 與 5 月連線品一起回台

⚠ 有限購，不一定買得到
⚠ 無缺 A pass B（除非我方允許）
🔺 統一包材 +10

＊未成年購買視同法定代理人同意。
＊喊單後不得刪除、更改或棄單，違者列入黑名單。
＊全新商品可能有輕微瑕疵，非重大問題不退換。
＊運送途中損壞、遺失由物流負責，本店不負賠償責任。
＊贈品缺貨不另行通知；特典內容隨機出貨。
＊盲抽、隨機品不接受指定或退換。
＊海外延誤、包裝壓痕、關稅等不屬瑕疵範圍。
＊不可抗力（天災、官方延遲等）不在本店責任內。
＊喊單即表示同意以上條款。
＊本店保留條款最終解釋與修改權。`}
          </pre>
        </Card>
      </div>
    </div>
  )
}
