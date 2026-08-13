/** CSV 匯出（UTF-8 BOM 以利 Excel 正確開啟中文） */

function escapeCell(v: string | number | undefined | null) {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: (string | number)[][]) {
  const lines = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
  return '\ufeff' + lines
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
