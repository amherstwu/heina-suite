/** 路由 lazy chunk 載入中的輕量占位（與 ProShell 內容區相容） */
export function RouteFallback() {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ds-primary border-t-transparent" aria-hidden />
      <p className="text-sm text-ds-text-secondary">載入頁面中…</p>
    </div>
  )
}
