import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function check(text, token, ok, bad) {
  if (!text.includes(token)) throw new Error(bad)
  console.log(`✅ ${ok}`)
}

const root = process.cwd()
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
const types = readFileSync(resolve(root, 'src/daigou/types.ts'), 'utf8')
const store = readFileSync(resolve(root, 'src/daigou/store.ts'), 'utf8')

try {
  check(app, 'path="/procurement"', '進貨主路由存在', '缺少 /procurement 路由')
  check(app, 'path="/procurement/suppliers"', '供應商路由存在', '缺少 /procurement/suppliers 路由')
  check(types, 'export type Supplier = {', 'Supplier 型別存在', '缺少 Supplier 型別')
  check(types, 'export type PurchaseOrder = {', 'PurchaseOrder 型別存在', '缺少 PurchaseOrder 型別')
  check(store, 'addPurchaseOrder', 'store 採購動作存在', '缺少 addPurchaseOrder')
  check(store, 'confirmGoodsReceipt', 'store 到貨動作存在', '缺少 confirmGoodsReceipt')
  check(store, 'markPaymentTermPaid', 'store 付款動作存在', '缺少 markPaymentTermPaid')
  check(store, 'createPurchaseReturn', 'store 退貨動作存在', '缺少 createPurchaseReturn')
  console.log('\n診斷結果：進貨系統整合檢查通過。')
} catch (e) {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 1
}
