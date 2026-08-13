/**
 * 合併兩份「開團明細」類 .xlsx（多分頁登記＋單檔多表）為一組登記列，
 * 寫入 public/fixtures/merged-register-rows.json，供「試算表串聯」頁一鍵載入測試。
 *
 * 用法：
 *   npm run ingest:user-xlsx
 *   npm run ingest:user-xlsx -- "C:/path/開團明細.xlsx" "C:/path/2026-04-07.xlsx"
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseWorkbookToJsonSheets, pickLegacyOrderRowsFromWorkbook } from '../src/daigou/sheetExcelBridge'
import { parseRegisterSheetOrderBlocks } from '../src/daigou/registerSheetImport'

const DEFAULT_RATE = 0.22

function readSheets(filePath: string) {
  const buf = fs.readFileSync(filePath)
  return parseWorkbookToJsonSheets(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

function main() {
  const argv = process.argv.slice(2)
  const homeDl = path.join(os.homedir(), 'Downloads')
  const def1 = path.join(homeDl, '開團明細 (1).xlsx')
  const def2 = path.join(homeDl, '2026-04-07 (1).xlsx')
  const p1 = argv[0] ?? def1
  const p2 = argv[1] ?? def2

  for (const p of [p1, p2]) {
    if (!fs.existsSync(p)) {
      console.error('找不到檔案:', p)
      process.exit(1)
    }
  }

  const sheets1 = readSheets(p1)
  const sheets2 = readSheets(p2)
  const { sheetNames: n1, rows: r1 } = pickLegacyOrderRowsFromWorkbook(sheets1)
  const { sheetNames: n2, rows: r2 } = pickLegacyOrderRowsFromWorkbook(sheets2)
  const rows = [...r1, ...r2]

  const { blocks, warnings } = parseRegisterSheetOrderBlocks(rows, { defaultExchangeRate: DEFAULT_RATE })

  const outDir = path.join(process.cwd(), 'public', 'fixtures')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, 'merged-register-rows.json')
  const payload = {
    mergedAt: new Date().toISOString(),
    sources: [
      { path: p1, legacySheets: n1.length, rows: r1.length },
      { path: p2, legacySheets: n2.length, rows: r2.length },
    ],
    totalRows: rows.length,
    parsedOrderBlocks: blocks.length,
    warnings: warnings.slice(0, 30),
    rows,
  }
  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8')

  console.log('已寫入', outFile)
  console.log('  檔1 命中分頁:', n1.length, '列數', r1.length)
  console.log('  檔2 命中分頁:', n2.length, '列數', r2.length)
  console.log('  合併列數:', rows.length, '→ 解析訂單區塊:', blocks.length)
  if (warnings.length) console.log('  前幾則提示:', warnings.slice(0, 6))
}

main()
