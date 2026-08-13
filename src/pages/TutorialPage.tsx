import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, Circle, Search, Sparkles } from 'lucide-react'
import { Btn, Card, PageHeader, Chip } from '../components/ui'
import { useDaigouStore } from '../daigou/store'
import type { TutorialArticle } from '../daigou/types'

const faqStatic = [
  { q: '訂單金額不正確怎麼辦？', a: '至訂單詳情按「重算金額」，並檢查折扣、包材費與運費欄位是否與實際約定一致。' },
  { q: '客戶改單怎麼辦？', a: '在訂單備註留下改單紀錄，必要時拆分訂單；系統會寫入稽核紀錄供日後查核。' },
  { q: '客戶未付款怎麼辦？', a: '使用訊息範本中心的訂金／尾款範本，並在記帳登記實際入帳後更新付款狀態。' },
  { q: '客戶未取貨怎麼辦？', a: '在賣貨便紀錄標記逾期未取或退回，客戶風險分會依規則調整，並可搭配取貨提醒範本。' },
  { q: '商品缺貨怎麼辦？', a: '將訂單狀態改為缺貨退款或異常處理，並用缺貨退款範本通知客戶。' },
  { q: '如何匯出資料？', a: '各列表頁的「匯出 CSV」可下載訂單、客戶、帳務、出貨與賣貨便資料。' },
]

export function TutorialPage() {
  const articles = useDaigouStore((s) => s.tutorialArticles)
  const onboardingTasks = useDaigouStore((s) => s.onboardingTasks)
  const completeOnboardingTask = useDaigouStore((s) => s.completeOnboardingTask)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('全部')

  const categories = useMemo(() => {
    const u = new Set(articles.map((a) => a.category))
    return ['全部', ...[...u].sort()]
  }, [articles])

  const filtered: TutorialArticle[] = useMemo(() => {
    return articles.filter((a) => {
      if (cat !== '全部' && a.category !== cat) return false
      if (!q.trim()) return true
      const h = `${a.title} ${a.content} ${a.tags.join(' ')}`.toLowerCase()
      return h.includes(q.toLowerCase())
    })
  }, [articles, cat, q])

  return (
    <div>
      <PageHeader
        title="操作教學"
        subtitle="可搜尋的內建說明中心 · 與實際流程對齊（本機示範）"
        action={
          <Btn to="/orders">
            <Sparkles className="h-4 w-4" />
            開始接單
          </Btn>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[14rem_1fr]">
        <Card className="!p-4">
          <p className="mb-3 text-meta font-semibold uppercase tracking-wide text-ds-text-muted">分類</p>
          <nav className="space-y-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  cat === c ? 'bg-ds-primary/15 text-ds-primary ring-1 ring-ds-primary/25' : 'text-ds-text-secondary hover:bg-white/[0.04]'
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0 opacity-70" />
                {c}
              </button>
            ))}
          </nav>
        </Card>

        <div className="space-y-6">
          <Card className="!p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-muted" />
              <input
                className="w-full rounded-xl border border-white/[0.1] bg-ds-surface py-2.5 pl-10 pr-3 text-body text-ds-text outline-none transition focus:border-ds-primary/45 focus:ring-2 focus:ring-ds-primary/20"
                placeholder="搜尋教學標題、內文、標籤…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </Card>

          <Card className="!p-5">
            <h2 className="text-section font-semibold text-ds-text">新手快速檢核</h2>
            <p className="mt-1 text-meta text-ds-text-muted">勾選即記錄在本機（示範用）</p>
            <ul className="mt-4 space-y-3">
              {onboardingTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-white/[0.06] bg-ds-surface-raised/30 px-4 py-3"
                >
                  <button
                    type="button"
                    title="標記完成"
                    onClick={() => !t.completed && completeOnboardingTask(t.id)}
                    className="mt-0.5 text-ds-primary disabled:opacity-40"
                    disabled={t.completed}
                  >
                    {t.completed ? <CheckCircle2 className="h-5 w-5 text-ds-success" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ds-text">{t.title}</p>
                    <p className="text-meta text-ds-text-secondary">{t.description}</p>
                    <Link to={t.actionLink} className="mt-2 inline-block text-meta font-semibold text-ds-highlight hover:underline">
                      前往 →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-4">
            {filtered.map((a) => (
              <Card key={a.id} className="!p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Chip tone="info">{a.category}</Chip>
                  <Chip tone="neutral">{a.difficulty === 'beginner' ? '入門' : a.difficulty === 'intermediate' ? '進階' : '進階+'}</Chip>
                  <span className="text-meta text-ds-text-muted">約 {a.estimatedMinutes} 分鐘 · 更新 {a.updatedAt}</span>
                </div>
                <h3 className="text-lg font-semibold text-ds-text">{a.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-ds-text-secondary">{a.content}</p>
                <div className="mt-4 rounded-xl border border-dashed border-white/[0.12] bg-black/20 px-4 py-6 text-center text-meta text-ds-text-muted">
                  截圖／影片預留區（上線後可嵌入圖片或 iframe）
                </div>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-body text-ds-text">
                  {a.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.tags.map((tg) => (
                    <span key={tg} className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-meta text-ds-text-muted">
                      #{tg}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="!p-5">
            <h2 className="text-section font-semibold text-ds-text">常見問題 FAQ</h2>
            <div className="mt-4 space-y-2">
              {faqStatic.map((f, i) => (
                <details key={i} className="group rounded-xl border border-white/[0.08] bg-ds-surface-raised/20 px-4 py-2">
                  <summary className="cursor-pointer list-none py-2 font-medium text-ds-text marker:hidden [&::-webkit-details-marker]:hidden">
                    {f.q}
                  </summary>
                  <p className="border-t border-white/[0.06] pb-3 pt-2 text-body text-ds-text-secondary">{f.a}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
