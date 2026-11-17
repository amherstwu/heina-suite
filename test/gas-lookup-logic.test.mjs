import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const logicUrl = new URL('../gas/LookupLogic.gs', import.meta.url)
const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(readFileSync(logicUrl, 'utf8'), sandbox)

const {
  gb_normalizeLookupKey_,
  gb_authorizeLookup_,
  gb_orderVisibleToLookup_,
  gb_evaluateChangeLookupPin_,
  gb_mergePortalLookupCustomers_,
  gb_lookupRateDecision_,
  gb_nextLookupFailCount_,
  gb_numRowsForValues_,
  gb_singleRowPatchShape_,
  GB_LOOKUP_MAX_FAILS,
} = sandbox

const pinA = '2468'
const pinB = '1357'
const notAPin = '0000'

function customer(name, line, pin) {
  return { name, lineDisplayName: line || name, lookupPin: pin || '' }
}

function groupsOf(rows) {
  return [
    {
      id: 'g1',
      orders: rows.map((row) => ({
        id: row.id,
        customerName: row.name,
      })),
    },
  ]
}

test('name key folds case, spaces, and fullwidth characters', () => {
  assert.equal(gb_normalizeLookupKey_(' Ａｍｙ '), gb_normalizeLookupKey_('amy'))
  assert.equal(gb_normalizeLookupKey_('小 明'), gb_normalizeLookupKey_('小明'))
  assert.notEqual(gb_normalizeLookupKey_('小明'), gb_normalizeLookupKey_('張小明'))
  assert.notEqual(gb_normalizeLookupKey_('如'), gb_normalizeLookupKey_('小聖'))
})

test('lookup requires a normalized exact name or a full order id, plus that customer pin', () => {
  const portal = [
    customer('小明', '小明', pinA),
    customer('小聖', '小聖', pinB),
    customer('張小明', '阿明', pinB),
  ]
  const groups = groupsOf([
    { id: 'ord-ming', name: '小明' },
    { id: 'ord-sheng', name: '小聖' },
    { id: 'ord-zhang', name: '張小明' },
  ])

  const exact = gb_authorizeLookup_('小 明', pinA, groups, portal)
  assert.equal(exact.ok, true)
  assert.equal(gb_orderVisibleToLookup_('小明', exact.authorizedKeys), true)
  assert.equal(gb_orderVisibleToLookup_('小聖', exact.authorizedKeys), false)
  assert.equal(gb_orderVisibleToLookup_('張小明', exact.authorizedKeys), false)

  const substring = gb_authorizeLookup_('明', pinA, groups, portal)
  assert.equal(substring.ok, false)

  const contained = gb_authorizeLookup_('如', pinB, groups, portal)
  assert.equal(contained.ok, false)

  const byOrder = gb_authorizeLookup_('ORD-SHENG', pinB, groups, portal)
  assert.equal(byOrder.ok, true)
  assert.equal(gb_orderVisibleToLookup_('小聖', byOrder.authorizedKeys), true)
  assert.equal(gb_orderVisibleToLookup_('小明', byOrder.authorizedKeys), false)

  const partialOrder = gb_authorizeLookup_('ord', pinB, groups, portal)
  assert.equal(partialOrder.ok, false)
})

test('a line display name opens only that customer, including orders under the formal name', () => {
  const portal = [customer('王小明', '小明', pinA)]
  const groups = groupsOf([{ id: 'ord-1', name: '王小明' }])
  const auth = gb_authorizeLookup_('小明', pinA, groups, portal)
  assert.equal(auth.ok, true)
  assert.equal(gb_orderVisibleToLookup_('王小明', auth.authorizedKeys), true)
  const wrong = gb_authorizeLookup_('小明', pinB, groups, portal)
  assert.equal(wrong.ok, false)
  assert.match(wrong.message, /密碼錯誤/)
})

test('customers without their own PIN are not opened by any shared code', () => {
  const portal = [customer('小明', '小明', ''), customer('小聖', '小聖', '')]
  const groups = groupsOf([
    { id: 'a', name: '小明' },
    { id: 'b', name: '小聖' },
  ])
  const auth = gb_authorizeLookup_('小明', notAPin, groups, portal)
  assert.equal(auth.ok, false)
  assert.match(auth.message, /尚未設定/)
  const missing = gb_authorizeLookup_('沒有這個人', pinA, groups, portal)
  assert.equal(missing.ok, false)
  assert.match(missing.message, /完整暱稱/)
})

test('changeLookupPin requires the current per-customer PIN and does not enroll a new name', () => {
  const portal = [customer('小明', '小葵', pinA), customer('沒密碼', '沒密碼', '')]
  const ok = gb_evaluateChangeLookupPin_('小葵', pinA, pinB, pinB, portal)
  assert.equal(ok.ok, true)
  assert.equal(ok.lookupPin, pinB)

  const sharedAttempt = gb_evaluateChangeLookupPin_('沒密碼', notAPin, pinB, pinB, portal)
  assert.equal(sharedAttempt.ok, false)
  assert.match(sharedAttempt.message, /尚未設定/)

  const stranger = gb_evaluateChangeLookupPin_('路人', pinA, pinB, pinB, portal)
  assert.equal(stranger.ok, false)
  assert.match(stranger.message, /查無此客人/)

  const wrongCurrent = gb_evaluateChangeLookupPin_('小明', pinB, '9753', '9753', portal)
  assert.equal(wrongCurrent.ok, false)
  assert.match(wrongCurrent.message, /目前密碼錯誤/)
})

test('a blank admin PIN does not erase a PIN the customer already stored', () => {
  const kept = '2468'
  const replaced = '1357'
  const merged = gb_mergePortalLookupCustomers_(
    [customer('小明', '小葵', kept), customer('只在表上', '只在表上', kept)],
    [customer('小明', '小葵', ''), customer('新客人', '新客人', replaced)],
  )
  assert.equal(merged.length, 2)
  assert.equal(merged[0].lookupPin, kept)
  assert.equal(merged[1].lookupPin, replaced)
})

test('lookup lockout trips at the configured failure count', () => {
  assert.equal(GB_LOOKUP_MAX_FAILS, 8)
  assert.equal(gb_lookupRateDecision_(0).locked, false)
  assert.equal(gb_lookupRateDecision_(7).locked, false)
  assert.equal(gb_lookupRateDecision_(8).locked, true)
  assert.equal(gb_nextLookupFailCount_(7), 8)
  assert.match(gb_lookupRateDecision_(8).message, /15 分鐘/)
})

test('sheet setValues ranges use a row count, not an end-row index', () => {
  const rows = [['a'], ['b'], ['c'], ['d'], ['e']]
  assert.equal(gb_numRowsForValues_(rows), rows.length)
  assert.notEqual(gb_numRowsForValues_(rows), 1 + rows.length)
  assert.equal(gb_numRowsForValues_([]), 0)

  const startRow = 8
  const appendCount = 2
  const numRows = appendCount
  const endStyle = startRow + appendCount - 1
  assert.equal(numRows, 2)
  assert.notEqual(numRows, endStyle)

  const patch = gb_singleRowPatchShape_()
  assert.equal(patch.numRows, 1)
  assert.equal(patch.numColumns, 3)
  const sheetRow = 12
  assert.notEqual(patch.numRows, sheetRow)
})

test('GroupBuy and SystemHub no longer pass an end index as numRows', () => {
  const groupBuy = readFileSync(new URL('../gas/GroupBuy.gs', import.meta.url), 'utf8')
  const systemHub = readFileSync(new URL('../gas/SystemHub.gs', import.meta.url), 'utf8')
  const preorder = readFileSync(new URL('../gas/Preorder.gs', import.meta.url), 'utf8')
  assert.equal(/\b1 \+ \w[\w.]*\.length\b/.test(groupBuy), false)
  assert.equal(/start \+ appendRows\.length - 1/.test(groupBuy), false)
  assert.equal(/getRange\(row, 3, row, 5\)/.test(systemHub), false)
  assert.match(systemHub, /getRange\(row, 3, 1, 3\)/)
  assert.match(preorder, /getRange\(2, 1, groupRows\.length, groupRows\[0\]\.length\)/)
})
