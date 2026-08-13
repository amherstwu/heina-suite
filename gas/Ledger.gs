/**
 * Ledger — 行程 / 記帳明細 / 預設品項 / 設定（裝置維度）
 * 使用容器試算表 SpreadsheetApp.getActiveSpreadsheet()
 */

var LD_SHEET_TRIPS = '行程';
var LD_SHEET_TX = '記帳明細';
var LD_SHEET_ITEMS = '預設品項';
var LD_SHEET_SETTINGS = '記帳設定';
var LD_PROP_CURRENT_TRIPS = 'HEINA_LEDGER_CURRENT_TRIPS_JSON';
/** 獨立 Apps Script 專案（未綁定試算表）時，於指令碼屬性設定試算表 ID */
var LD_PROP_SPREADSHEET_ID = 'HEINA_SPREADSHEET_ID';

var ld_ssCache_ = null;

/**
 * 取得記帳用的容器試算表。
 * 1) 已綁定：getActiveSpreadsheet()
 * 2) 編輯器執行但無 active：ScriptProperties HEINA_SPREADSHEET_ID → openById
 */
function ld_ss_() {
  if (ld_ssCache_) return ld_ssCache_;
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = null;
  }
  if (!ss) {
    var id = PropertiesService.getScriptProperties().getProperty(LD_PROP_SPREADSHEET_ID);
    if (id) {
      try {
        ss = SpreadsheetApp.openById(String(id).trim());
      } catch (e2) {
        throw new Error(
          '無法開啟試算表（ID=' +
            id +
            '）：' +
            (e2 && e2.message ? e2.message : e2) +
            '。請確認 ID 正確且腳本有試算表存取權。'
        );
      }
    }
  }
  if (!ss) {
    throw new Error(
      '找不到試算表：請將 Apps Script「綁定」到目標 Google 試算表（擴充功能 → Apps Script），' +
        '或在指令碼屬性設定 ' +
        LD_PROP_SPREADSHEET_ID +
        ' 後執行 ld_setSpreadsheetIdForTests_(試算表ID)。'
    );
  }
  ld_cacheSpreadsheetId_(ss);
  ld_ssCache_ = ss;
  return ss;
}

/** 記住試算表 ID，方便僅在編輯器執行 smoke test 時仍能 openById */
function ld_cacheSpreadsheetId_(ss) {
  try {
    var id = ss && ss.getId ? ss.getId() : '';
    if (id) {
      PropertiesService.getScriptProperties().setProperty(LD_PROP_SPREADSHEET_ID, String(id));
    }
  } catch (e) {
    /* ignore */
  }
}

/**
 * 手動綁定試算表 ID（供獨立 GAS 專案或編輯器 smoke test 使用）。
 * @param {string} spreadsheetId
 */
function ld_setSpreadsheetIdForTests_(spreadsheetId) {
  var id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('請提供試算表 ID');
  SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(LD_PROP_SPREADSHEET_ID, id);
  ld_ssCache_ = null;
  return { ok: true, spreadsheetId: id };
}

function ld_flush_() {
  try {
    SpreadsheetApp.flush();
  } catch (e) {
    /* ignore */
  }
}

function ld_uuid_() {
  return Utilities.getUuid();
}

function ld_getCurrentTripMap_() {
  var raw = PropertiesService.getScriptProperties().getProperty(LD_PROP_CURRENT_TRIPS);
  if (!raw) return {};
  try {
    var o = JSON.parse(raw);
    return typeof o === 'object' && o ? o : {};
  } catch (e) {
    return {};
  }
}

function ld_saveCurrentTripMap_(map) {
  PropertiesService.getScriptProperties().setProperty(LD_PROP_CURRENT_TRIPS, JSON.stringify(map || {}));
}

function ld_setCurrentTrip_(clientId, tripId) {
  var m = ld_getCurrentTripMap_();
  m[String(clientId)] = String(tripId);
  ld_saveCurrentTripMap_(m);
  return { ok: true };
}

function ld_ensureSheets_() {
  var ss = ld_ss_();
  ld_renameIfNeeded_(ss, 'Trips', LD_SHEET_TRIPS);
  ld_renameIfNeeded_(ss, 'Transactions', LD_SHEET_TX);
  ld_renameIfNeeded_(ss, 'Items', LD_SHEET_ITEMS);
  ld_renameIfNeeded_(ss, 'Settings', LD_SHEET_SETTINGS);
  ld_renameIfNeeded_(ss, '設定', LD_SHEET_SETTINGS);

  var trips = ss.getSheetByName(LD_SHEET_TRIPS);
  if (!trips) trips = ss.insertSheet(LD_SHEET_TRIPS);
  ld_ensureHeader_(trips, ['行程ID', '行程名稱', '建立時間', '裝置ID']);

  var tx = ss.getSheetByName(LD_SHEET_TX);
  if (!tx) tx = ss.insertSheet(LD_SHEET_TX);
  ld_ensureHeader_(tx, ['記錄ID', '行程ID', '金額', '品項備註', '類型', '分類', '日期', '建立時間', '裝置ID', '付款方式', '幣別']);

  var items = ss.getSheetByName(LD_SHEET_ITEMS);
  if (!items) items = ss.insertSheet(LD_SHEET_ITEMS);
  ld_ensureHeader_(items, ['品項ID', '品項名稱', '建立時間', '裝置ID']);

  var setSh = ss.getSheetByName(LD_SHEET_SETTINGS);
  if (!setSh) setSh = ss.insertSheet(LD_SHEET_SETTINGS);
  ld_ensureHeader_(setSh, ['裝置ID', '設定鍵', '設定值', '更新時間']);
}

function ld_renameIfNeeded_(ss, oldName, newName) {
  var oldSh = ss.getSheetByName(oldName);
  var newSh = ss.getSheetByName(newName);
  if (oldSh && !newSh) oldSh.setName(newName);
}

function ld_ensureHeader_(sheet, headerZh) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headerZh);
    return;
  }
  var lastCol = Math.max(sheet.getLastColumn(), headerZh.length);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v || '').trim(); });
  for (var i = 0; i < headerZh.length; i++) {
    var col = headerZh[i];
    if (header.indexOf(col) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col);
    }
  }
}

function ld_headerToIndex_(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var key = String(headerRow[i] || '').trim();
    if (key) map[key] = i;
  }
  return map;
}

function ld_pickIndex_(map, keys, fallback) {
  for (var i = 0; i < keys.length; i++) {
    if (map[keys[i]] !== undefined) return map[keys[i]];
  }
  return fallback;
}

function ld_indexMapTrips_(headerRow) {
  var map = ld_headerToIndex_(headerRow);
  return {
    id: ld_pickIndex_(map, ['行程ID', 'id'], 0),
    name: ld_pickIndex_(map, ['行程名稱', 'name'], 1),
    createdAt: ld_pickIndex_(map, ['建立時間', 'createdAt'], 2),
    clientId: ld_pickIndex_(map, ['裝置ID', 'clientId'], 3)
  };
}

function ld_indexMapTx_(headerRow) {
  var map = ld_headerToIndex_(headerRow);
  return {
    id: ld_pickIndex_(map, ['記錄ID', 'id'], 0),
    tripId: ld_pickIndex_(map, ['行程ID', 'tripId'], 1),
    amount: ld_pickIndex_(map, ['金額', 'amount'], 2),
    note: ld_pickIndex_(map, ['品項備註', 'note'], 3),
    type: ld_pickIndex_(map, ['類型', 'type'], 4),
    category: ld_pickIndex_(map, ['分類', 'category'], 5),
    date: ld_pickIndex_(map, ['日期', 'date'], 6),
    timestamp: ld_pickIndex_(map, ['建立時間', 'timestamp'], 7),
    clientId: ld_pickIndex_(map, ['裝置ID', 'clientId'], 8),
    payMethod: ld_pickIndex_(map, ['付款方式', 'payMethod'], 9),
    currency: ld_pickIndex_(map, ['幣別', 'currency'], 10)
  };
}

function ld_indexMapItems_(headerRow) {
  var map = ld_headerToIndex_(headerRow);
  return {
    id: ld_pickIndex_(map, ['品項ID', 'id'], 0),
    name: ld_pickIndex_(map, ['品項名稱', 'name'], 1),
    createdAt: ld_pickIndex_(map, ['建立時間', 'createdAt'], 2),
    clientId: ld_pickIndex_(map, ['裝置ID', 'clientId'], 3)
  };
}

function ld_indexMapSettings_(headerRow) {
  var map = ld_headerToIndex_(headerRow);
  return {
    clientId: ld_pickIndex_(map, ['裝置ID', 'clientId'], 0),
    key: ld_pickIndex_(map, ['設定鍵', 'key'], 1),
    value: ld_pickIndex_(map, ['設定值', 'value'], 2),
    updatedAt: ld_pickIndex_(map, ['更新時間', 'updatedAt'], 3)
  };
}

function ld_defaultSettings_() {
  return {
    defaultCurrency: 'JPY',
    defaultPayMethod: '現金',
    defaultPersonalCategory: '購物',
    confirmBeforeDelete: '開',
    autoClearAfterSave: '開'
  };
}

function ld_listTrips_(clientId) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_TRIPS);
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  var header = values[0];
  var idx = ld_indexMapTrips_(header);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (String(row[idx.clientId] || '') !== String(clientId)) continue;
    out.push({
      id: String(row[idx.id]),
      name: String(row[idx.name] || ''),
      createdAt: Number(row[idx.createdAt] || 0),
      clientId: String(row[idx.clientId] || '')
    });
  }
  return out.filter(function (x) { return x.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
}

function ld_listTransactions_(clientId) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_TX);
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  var idx = ld_indexMapTx_(values[0]);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (String(row[idx.clientId] || '') !== String(clientId)) continue;
    out.push({
      id: String(row[idx.id]),
      tripId: String(row[idx.tripId] || ''),
      amount: Number(row[idx.amount] || 0),
      note: String(row[idx.note] || ''),
      type: String(row[idx.type] || 'business'),
      category: String(row[idx.category] || ''),
      date: String(row[idx.date] || ''),
      timestamp: Number(row[idx.timestamp] || 0),
      clientId: String(row[idx.clientId] || ''),
      payMethod: String(row[idx.payMethod] || ''),
      currency: String(row[idx.currency] || '')
    });
  }
  return out.filter(function (x) { return x.id; }).sort(function (a, b) { return b.timestamp - a.timestamp; });
}

function ld_listItems_(clientId) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_ITEMS);
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  var idx = ld_indexMapItems_(values[0]);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (String(row[idx.clientId] || '') !== String(clientId)) continue;
    out.push({
      id: String(row[idx.id]),
      name: String(row[idx.name] || ''),
      createdAt: Number(row[idx.createdAt] || 0),
      clientId: String(row[idx.clientId] || '')
    });
  }
  return out.filter(function (x) { return x.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
}

function ld_getSettings_(clientId) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_SETTINGS);
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return ld_defaultSettings_();
  var idx = ld_indexMapSettings_(values[0]);
  var map = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (String(row[idx.clientId] || '') !== String(clientId)) continue;
    var k = String(row[idx.key] || '');
    if (k) map[k] = String(row[idx.value] || '');
  }
  var def = ld_defaultSettings_();
  for (var key in map) {
    if (Object.prototype.hasOwnProperty.call(map, key)) def[key] = map[key];
  }
  return def;
}

function ld_getInitData_(clientId) {
  if (!clientId) throw new Error('缺少裝置ID（clientId）');
  ld_ensureSheets_();
  var trips = ld_listTrips_(clientId);
  var tripMap = ld_getCurrentTripMap_();
  var currentTripId = tripMap[String(clientId)] || null;
  if (currentTripId && !trips.some(function (t) { return t.id === currentTripId; })) currentTripId = null;
  if (!currentTripId && trips.length) currentTripId = trips[0].id;
  if (!currentTripId) {
    ld_createTrip_(clientId, '甜蜜代購行');
    trips = ld_listTrips_(clientId);
    currentTripId = trips[0] ? trips[0].id : null;
  }
  return {
    appName: '記帳系統（Sheets版）',
    trips: trips,
    currentTripId: currentTripId,
    transactions: ld_listTransactions_(clientId),
    items: ld_listItems_(clientId),
    settings: ld_getSettings_(clientId)
  };
}

function ld_createTrip_(clientId, name) {
  ld_ensureSheets_();
  if (!clientId) throw new Error('缺少裝置ID（clientId）');
  if (!name || !String(name).trim()) throw new Error('行程名稱必填');
  var sh = ld_ss_().getSheetByName(LD_SHEET_TRIPS);
  var id = ld_uuid_();
  var createdAt = Date.now();
  sh.appendRow([id, String(name).trim(), createdAt, String(clientId)]);
  ld_flush_();
  var m = ld_getCurrentTripMap_();
  m[String(clientId)] = id;
  ld_saveCurrentTripMap_(m);
  return { id: id, name: String(name).trim(), createdAt: createdAt, clientId: String(clientId) };
}

function ld_addTransaction_(clientId, payload) {
  ld_ensureSheets_();
  if (!clientId) throw new Error('缺少裝置ID（clientId）');
  if (!payload) throw new Error('缺少 payload');
  ['tripId', 'amount', 'type', 'date'].forEach(function (k) {
    if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
      throw new Error('缺少欄位：' + k);
    }
  });
  var sh = ld_ss_().getSheetByName(LD_SHEET_TX);
  var id = ld_uuid_();
  var timestamp = Date.now();
  var amount = Number(payload.amount);
  if (!isFinite(amount)) throw new Error('金額必須是數字');
  var type = String(payload.type) === 'personal' ? 'personal' : 'business';
  var category = type === 'business' ? '代購成本' : String(payload.category || '其他');
  var note = String(payload.note || (type === 'business' ? '代購商品' : category));
  var date = String(payload.date || '');
  var payMethod = String(payload.payMethod || '');
  var currency = String(payload.currency || '');
  sh.appendRow([
    id, String(payload.tripId), amount, note, type, category, date, timestamp,
    String(clientId), payMethod, currency
  ]);
  ld_flush_();
  return {
    id: id, tripId: String(payload.tripId), amount: amount, note: note, type: type, category: category,
    date: date, timestamp: timestamp, clientId: String(clientId), payMethod: payMethod, currency: currency
  };
}

function ld_deleteTransaction_(clientId, txId) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_TX);
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return { ok: true };
  var idx = ld_indexMapTx_(values[0]);
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (String(r[idx.id] || '') === String(txId) && String(r[idx.clientId] || '') === String(clientId)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return { ok: true };
}

function ld_createItemsBatch_(clientId, rawText) {
  ld_ensureSheets_();
  if (!clientId) throw new Error('缺少裝置ID（clientId）');
  if (!rawText || !String(rawText).trim()) return [];
  var parts = String(rawText).split(/[,\n\/|，、;；]+/g).map(function (s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
  var existed = ld_listItems_(clientId);
  var existedSet = {};
  for (var e = 0; e < existed.length; e++) {
    existedSet[String(existed[e].name || '').trim().toLowerCase()] = true;
  }
  var sh = ld_ss_().getSheetByName(LD_SHEET_ITEMS);
  var createdAt = Date.now();
  var added = [];
  for (var p = 0; p < parts.length; p++) {
    var name = parts[p];
    var key = name.toLowerCase();
    if (existedSet[key]) continue;
    existedSet[key] = true;
    var id = ld_uuid_();
    sh.appendRow([id, name, createdAt, String(clientId)]);
    added.push({ id: id, name: name, createdAt: createdAt, clientId: String(clientId) });
  }
  return added;
}

function ld_deleteItem_(clientId, itemId) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_ITEMS);
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return { ok: true };
  var idx = ld_indexMapItems_(values[0]);
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (String(r[idx.id] || '') === String(itemId) && String(r[idx.clientId] || '') === String(clientId)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return { ok: true };
}

function ld_deleteTrip_(clientId, tripId) {
  ld_ensureSheets_();
  var txSh = ld_ss_().getSheetByName(LD_SHEET_TX);
  var txValues = txSh.getDataRange().getValues();
  if (txValues.length > 1) {
    var idx = ld_indexMapTx_(txValues[0]);
    for (var i = txValues.length - 1; i >= 1; i--) {
      var r = txValues[i];
      if (String(r[idx.clientId] || '') === String(clientId) && String(r[idx.tripId] || '') === String(tripId)) {
        txSh.deleteRow(i + 1);
      }
    }
  }
  var tripSh = ld_ss_().getSheetByName(LD_SHEET_TRIPS);
  var tripValues = tripSh.getDataRange().getValues();
  if (tripValues.length > 1) {
    var idxT = ld_indexMapTrips_(tripValues[0]);
    for (var j = tripValues.length - 1; j >= 1; j--) {
      var r2 = tripValues[j];
      if (String(r2[idxT.clientId] || '') === String(clientId) && String(r2[idxT.id] || '') === String(tripId)) {
        tripSh.deleteRow(j + 1);
        break;
      }
    }
  }
  return { ok: true };
}

function ld_duplicateTrip_(clientId, sourceTripId, newTripName) {
  ld_ensureSheets_();
  var trips = ld_listTrips_(clientId);
  var src = null;
  for (var t = 0; t < trips.length; t++) {
    if (trips[t].id === String(sourceTripId)) { src = trips[t]; break; }
  }
  var baseName = (newTripName && String(newTripName).trim())
    ? String(newTripName).trim()
    : ((src ? src.name : '行程') + '（複寫）');
  var newTrip = ld_createTrip_(clientId, baseName);
  var txs = ld_listTransactions_(clientId).filter(function (x) { return String(x.tripId) === String(sourceTripId); });
  var txSh = ld_ss_().getSheetByName(LD_SHEET_TX);
  for (var i = 0; i < txs.length; i++) {
    var t2 = txs[i];
    var id = ld_uuid_();
    var ts = Date.now();
    txSh.appendRow([
      id, newTrip.id, Number(t2.amount || 0), String(t2.note || ''),
      String(t2.type || 'business'), String(t2.category || ''), String(t2.date || ''),
      ts, String(clientId), String(t2.payMethod || ''), String(t2.currency || '')
    ]);
  }
  return { ok: true, newTripId: newTrip.id };
}

function ld_overwriteTrip_(clientId, sourceTripId, targetTripId) {
  ld_ensureSheets_();
  var txSh = ld_ss_().getSheetByName(LD_SHEET_TX);
  var txValues = txSh.getDataRange().getValues();
  if (txValues.length > 1) {
    var idx = ld_indexMapTx_(txValues[0]);
    for (var i = txValues.length - 1; i >= 1; i--) {
      var r = txValues[i];
      if (String(r[idx.clientId] || '') === String(clientId) && String(r[idx.tripId] || '') === String(targetTripId)) {
        txSh.deleteRow(i + 1);
      }
    }
  }
  var srcTx = ld_listTransactions_(clientId).filter(function (x) { return String(x.tripId) === String(sourceTripId); });
  for (var j = 0; j < srcTx.length; j++) {
    var t3 = srcTx[j];
    var id2 = ld_uuid_();
    var ts2 = Date.now();
    txSh.appendRow([
      id2, String(targetTripId), Number(t3.amount || 0), String(t3.note || ''),
      String(t3.type || 'business'), String(t3.category || ''), String(t3.date || ''),
      ts2, String(clientId), String(t3.payMethod || ''), String(t3.currency || '')
    ]);
  }
  return { ok: true };
}

function ld_saveSettings_(clientId, settingsObj) {
  ld_ensureSheets_();
  var sh = ld_ss_().getSheetByName(LD_SHEET_SETTINGS);
  var values = sh.getDataRange().getValues();
  var header = values[0];
  var idx = ld_indexMapSettings_(header);
  var now = Date.now();
  var rowIndex = {};
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (String(r[idx.clientId] || '') !== String(clientId)) continue;
    var k = String(r[idx.key] || '');
    if (k) rowIndex[k] = i + 1;
  }
  Object.keys(settingsObj).forEach(function (k) {
    var v = String(settingsObj[k] != null ? settingsObj[k] : '');
    if (!k) return;
    if (rowIndex[k]) {
      sh.getRange(rowIndex[k], idx.value + 1).setValue(v);
      sh.getRange(rowIndex[k], idx.updatedAt + 1).setValue(now);
    } else {
      sh.appendRow([String(clientId), k, v, now]);
    }
  });
  return { ok: true };
}

function ld_resetSheetsForClient_(clientId) {
  ld_ensureSheets_();
  if (!clientId) throw new Error('缺少裝置ID（clientId）');
  var ss = ld_ss_();
  var jobs = [
    { sheet: ss.getSheetByName(LD_SHEET_TRIPS), idxFn: ld_indexMapTrips_ },
    { sheet: ss.getSheetByName(LD_SHEET_TX), idxFn: ld_indexMapTx_ },
    { sheet: ss.getSheetByName(LD_SHEET_ITEMS), idxFn: ld_indexMapItems_ },
    { sheet: ss.getSheetByName(LD_SHEET_SETTINGS), idxFn: ld_indexMapSettings_ }
  ];
  for (var j = 0; j < jobs.length; j++) {
    var sh = jobs[j].sheet;
    if (!sh) continue;
    var vals = sh.getDataRange().getValues();
    if (vals.length <= 1) continue;
    var header = vals[0];
    var idx = jobs[j].idxFn(header);
    var cIdx = idx.clientId;
    for (var i = vals.length - 1; i >= 1; i--) {
      if (String(vals[i][cIdx] || '') === String(clientId)) sh.deleteRow(i + 1);
    }
  }
  var m = ld_getCurrentTripMap_();
  delete m[String(clientId)];
  ld_saveCurrentTripMap_(m);
  ld_createTrip_(clientId, '甜蜜代購行');
  return { ok: true };
}
