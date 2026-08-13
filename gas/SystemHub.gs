/**
 * 系統資料中樞：以試算表分頁集中儲存任意 JSON（category + key 唯一）。
 * 分頁「Heina系統資料」：category | key | value_json | updated_at | note
 * 分頁「Heina系統日誌」：append-only 稽核（timestamp | category | action | key | snippet | note）
 * 單格上限約 5 萬字元，value_json 請控制體積。
 */

var SHUB_SHEET_DATA = 'Heina系統資料';
var SHUB_SHEET_LOG = 'Heina系統日誌';

function shub_ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** 建立分頁與表頭（已存在則不覆寫內容） */
function shub_ensureSheets_() {
  var ss = shub_ss_();
  var d = ss.getSheetByName(SHUB_SHEET_DATA);
  if (!d) {
    d = ss.insertSheet(SHUB_SHEET_DATA);
    d.appendRow(['category', 'key', 'value_json', 'updated_at', 'note']);
    d.setFrozenRows(1);
    d.getRange('A1:E1').setFontWeight('bold');
  }
  var l = ss.getSheetByName(SHUB_SHEET_LOG);
  if (!l) {
    l = ss.insertSheet(SHUB_SHEET_LOG);
    l.appendRow(['timestamp', 'category', 'action', 'key', 'snippet', 'note']);
    l.setFrozenRows(1);
    l.getRange('A1:F1').setFontWeight('bold');
  }
}

/**
 * @param {string} category
 * @param {string} key
 * @param {*} value 會 JSON.stringify；已是字串則原樣寫入
 * @param {string=} note
 * @return {{ok:boolean, row:number}}
 */
function shub_put_(category, key, value, note) {
  shub_ensureSheets_();
  var cat = String(category || '').trim();
  var k = String(key || '').trim();
  if (!cat || !k) throw new Error('systemhub put: category 與 key 必填');
  var json = typeof value === 'string' ? value : JSON.stringify(value);
  var now = new Date().toISOString();
  var n = note != null ? String(note) : '';

  var sh = shub_ss_().getSheetByName(SHUB_SHEET_DATA);
  var last = sh.getLastRow();
  var row = 0;
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last, 2).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === cat && String(keys[i][1]) === k) {
        row = 2 + i;
        break;
      }
    }
  }
  if (row > 0) {
    sh.getRange(row, 3, row, 5).setValues([[json, now, n]]);
  } else {
    sh.appendRow([cat, k, json, now, n]);
    row = sh.getLastRow();
  }
  shub_appendLog_(cat, 'put', k, shub_snippet_(json), n);
  return { ok: true, row: row };
}

/**
 * @return {{category:string,key:string,value:*,valueRaw:string,updatedAt:string,note:string}|null}
 */
function shub_get_(category, key) {
  shub_ensureSheets_();
  var cat = String(category || '').trim();
  var k = String(key || '').trim();
  if (!cat || !k) return null;
  var sh = shub_ss_().getSheetByName(SHUB_SHEET_DATA);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var rows = sh.getRange(2, 1, last, 5).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === cat && String(rows[i][1]) === k) {
      var raw = String(rows[i][2] != null ? rows[i][2] : '');
      var parsed = shub_tryParseJson_(raw);
      return {
        category: cat,
        key: k,
        value: parsed,
        valueRaw: raw,
        updatedAt: String(rows[i][3] != null ? rows[i][3] : ''),
        note: String(rows[i][4] != null ? rows[i][4] : '')
      };
    }
  }
  return null;
}

/**
 * @return {Array<{category:string,key:string,value:*,valueRaw:string,updatedAt:string,note:string}>}
 */
function shub_list_(category) {
  shub_ensureSheets_();
  var cat = String(category || '').trim();
  var sh = shub_ss_().getSheetByName(SHUB_SHEET_DATA);
  var last = sh.getLastRow();
  var out = [];
  if (last < 2) return out;
  var rows = sh.getRange(2, 1, last, 5).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (cat && String(rows[i][0]) !== cat) continue;
    var raw = String(rows[i][2] != null ? rows[i][2] : '');
    out.push({
      category: String(rows[i][0]),
      key: String(rows[i][1]),
      value: shub_tryParseJson_(raw),
      valueRaw: raw,
      updatedAt: String(rows[i][3] != null ? rows[i][3] : ''),
      note: String(rows[i][4] != null ? rows[i][4] : '')
    });
  }
  return out;
}

/** @return {{ok:boolean, deleted:boolean}} */
function shub_delete_(category, key) {
  shub_ensureSheets_();
  var cat = String(category || '').trim();
  var k = String(key || '').trim();
  if (!cat || !k) throw new Error('systemhub delete: category 與 key 必填');
  var sh = shub_ss_().getSheetByName(SHUB_SHEET_DATA);
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, deleted: false };
  var keys = sh.getRange(2, 1, last, 2).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]) === cat && String(keys[i][1]) === k) {
      sh.deleteRow(2 + i);
      shub_appendLog_(cat, 'delete', k, '', '');
      return { ok: true, deleted: true };
    }
  }
  return { ok: true, deleted: false };
}

/**
 * 僅寫日誌，不動主表。
 * @param {string} category
 * @param {string} action
 * @param {string=} key
 * @param {string=} jsonOrText
 * @param {string=} note
 */
function shub_log_(category, action, key, jsonOrText, note) {
  shub_ensureSheets_();
  var k = key != null ? String(key) : '';
  var j = jsonOrText != null ? String(jsonOrText) : '';
  shub_appendLog_(String(category || ''), String(action || ''), k, shub_snippet_(j), note != null ? String(note) : '');
  return { ok: true };
}

function shub_appendLog_(category, action, key, snippet, note) {
  var sh = shub_ss_().getSheetByName(SHUB_SHEET_LOG);
  if (!sh) return;
  sh.appendRow([new Date().toISOString(), category, action, key, snippet, note]);
}

function shub_snippet_(s) {
  var t = String(s || '');
  return t.length > 500 ? t.substring(0, 500) + '…' : t;
}

function shub_tryParseJson_(raw) {
  var r = String(raw || '').trim();
  if (!r) return null;
  try {
    return JSON.parse(r);
  } catch (e) {
    return raw;
  }
}

/** 手動測試：執行後看 Execution log */
function runSystemHubSmokeTest() {
  shub_ensureSheets_();
  shub_put_('smoke', 'counter', { n: 1 }, 'test');
  var g = shub_get_('smoke', 'counter');
  shub_put_('smoke', 'counter', { n: (g && g.value && g.value.n ? g.value.n : 0) + 1 }, 'bump');
  Logger.log(JSON.stringify({ get: shub_get_('smoke', 'counter'), list: shub_list_('smoke') }, null, 2));
  return shub_get_('smoke', 'counter');
}
