/**
 * =============================================================================
 * >>> GAS-APPS-SCRIPT-COPY-START（.gs）
 * 與「同資料夾 index.html」成對；兩檔貼入同一 Apps Script 專案即可。
 * 以下「自本行以下至 GAS-APPS-SCRIPT-COPY-END」全文複製到 Google Apps Script：
 * 新增或覆寫一支「指令碼」檔（檔名自訂，例如 Code）。
 * =============================================================================
 */

/** Group buy (V50) — A~Z 26-column flat sheet + journal + settings */

var GB_SHEET_ORDERS = '訂單明細';
var GB_SHEET_JOURNAL = '銀行日記帳';
var GB_SHEET_SETTINGS = '系統設定';
var GB_COLS = 26;

var GB_HEADER = [
  '名字', '商品', '數量', '日幣單價', '日幣總價', '台幣售價',
  '總額', '訂金', '國內運費', '國際運費', '尾款', '付款狀況',
  '出貨日', '系列', '__GroupID', '__GroupStatus', '__GroupClosing', '__GroupSaleEnd',
  '__GroupPurchase', '__GroupJpy', '__GroupOrderId', '__GroupLogisticsId', '__GroupLink',
  '__OrderID', '__PaymentInfo', '__ExportDate'
];

var GB_COL = {
  CUSTOMER: 0, ITEM: 1, QTY: 2, JPY: 3, JPY_TOTAL: 4, TWD_UNIT: 5,
  TOTAL_TWD: 6, DEPOSIT: 7, DOMESTIC: 8, INTL: 9, BALANCE: 10, PAY_STATUS: 11,
  SHIP_DATE: 12, GROUP_NAME: 13, GROUP_ID: 14, GROUP_STATUS: 15,
  GROUP_CLOSING: 16, GROUP_SALE_END: 17, GROUP_PURCHASE: 18, GROUP_JPY: 19,
  GROUP_ORDER_ID: 20, GROUP_LOGISTICS: 21, GROUP_LINK: 22,
  ORDER_ID: 23, PAYMENT_INFO: 24, EXPORT_DATE: 25
};

function gb_initSheets_() {
  var ss = SpreadsheetApp.getActive();
  var orderSh = ss.getSheetByName(GB_SHEET_ORDERS);
  if (!orderSh) {
    orderSh = ss.insertSheet(GB_SHEET_ORDERS);
    orderSh.appendRow(GB_HEADER);
    orderSh.setFrozenRows(1);
  } else {
    gb_ensureOrderHeader_(orderSh);
  }
  if (!ss.getSheetByName(GB_SHEET_JOURNAL)) {
    var j = ss.insertSheet(GB_SHEET_JOURNAL);
    j.appendRow(['ID', '日期', '銀行', '類型', '金額', '分類', '備註']);
    j.setFrozenRows(1);
  }
  if (!ss.getSheetByName(GB_SHEET_SETTINGS)) {
    var st = ss.insertSheet(GB_SHEET_SETTINGS);
    st.appendRow(['Key', 'Value']);
    st.appendRow(['exchangeRate', '0.22']);
  }
  gb_ensureDefaultSettings_();
}

function gb_ensureOrderHeader_(sheet) {
  if (sheet.getLastColumn() < GB_COLS) {
    sheet.getRange(1, 1, 1, GB_COLS).setValues([GB_HEADER]);
    sheet.setFrozenRows(1);
  }
}

function gb_ensureDefaultSettings_() {
  var ss = SpreadsheetApp.getActive();
  var settingsSheet = ss.getSheetByName(GB_SHEET_SETTINGS);
  var lastRow = settingsSheet.getLastRow();
  var existing = {};
  if (lastRow >= 2) {
    var rows = settingsSheet.getRange(2, 1, lastRow, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0]) existing[String(rows[i][0])] = rows[i][1];
    }
  }
  var defaults = [
    ['exchangeRate', existing.exchangeRate != null ? existing.exchangeRate : '0.22'],
    ['portalTitle', existing.portalTitle != null ? existing.portalTitle : '訂單自助查詢'],
    ['portalIntro', existing.portalIntro != null ? existing.portalIntro : '輸入社群暱稱即可查詢訂單狀態與付款資訊。'],
    ['portalWebsiteUrl', existing.portalWebsiteUrl != null ? existing.portalWebsiteUrl : ''],
    ['portalGroupUrl', existing.portalGroupUrl != null ? existing.portalGroupUrl : ''],
    ['portalExtraNote', existing.portalExtraNote != null ? existing.portalExtraNote : '付款後請填寫：付款日期、後五碼，等待對帳完成後即可在此查看狀態。']
  ];
  var appendRows = [];
  for (var d = 0; d < defaults.length; d++) {
    var k = defaults[d][0];
    if (existing[k] === undefined) appendRows.push(defaults[d]);
  }
  if (appendRows.length) {
    var start = settingsSheet.getLastRow() + 1;
    settingsSheet.getRange(start, 1, start + appendRows.length - 1, 2).setValues(appendRows);
  }
}

function gb_getGroupCreditCard_(groupId) {
  var key = 'gb_card_' + String(groupId || '');
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(GB_SHEET_SETTINGS);
  if (!sh || sh.getLastRow() < 2) return '';
  var rows = sh.getRange(2, 1, sh.getLastRow(), 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === key) return String(rows[i][1] || '');
  }
  return '';
}

function gb_setGroupCreditCard_(groupId, card) {
  var key = 'gb_card_' + String(groupId || '');
  gb_upsertSetting_(SpreadsheetApp.getActive().getSheetByName(GB_SHEET_SETTINGS), key, String(card || ''));
}

function gb_isLegacyRow_(r) {
  return !r[GB_COL.GROUP_ID] && r[21];
}

function gb_legacyUnflattenRow_(r, groupsMap) {
  var gId = r[21];
  var oId = r[22];
  var status = r[23];
  if (!gId) return;
  if (!groupsMap[gId]) {
    groupsMap[gId] = {
      id: gId, name: r[12], status: status || '待處理',
      closingDate: r[13], saleEndDate: r[14], officialShipDate: r[15],
      purchaseDate: '', creditCard: gb_getGroupCreditCard_(gId),
      jpyAmount: r[16], orderId: r[17], logisticsId: r[18], purchaseLink: r[19], orders: []
    };
  }
  if (!oId) return;
  var g = groupsMap[gId];
  var order = null;
  for (var j = 0; j < g.orders.length; j++) {
    if (g.orders[j].id === oId) { order = g.orders[j]; break; }
  }
  if (!order) {
    order = {
      id: oId, customerName: r[0], totalTwd: r[6], deposit: r[7],
      domesticShip: r[8], intlShip: r[9], balance: r[10], paymentStatus: r[11],
      paymentInfo: r[20], items: []
    };
    g.orders.push(order);
  }
  if (r[1]) order.items.push({ name: r[1], qty: r[2], jpy: r[3], twd: r[5] });
}

function gb_v50UnflattenRow_(r, groupsMap) {
  var gId = r[GB_COL.GROUP_ID];
  var oId = r[GB_COL.ORDER_ID];
  if (!gId) return;
  if (!groupsMap[gId]) {
    groupsMap[gId] = {
      id: gId,
      name: r[GB_COL.GROUP_NAME],
      status: r[GB_COL.GROUP_STATUS] || '待處理',
      closingDate: r[GB_COL.GROUP_CLOSING],
      saleEndDate: r[GB_COL.GROUP_SALE_END],
      officialShipDate: r[GB_COL.SHIP_DATE],
      purchaseDate: r[GB_COL.GROUP_PURCHASE],
      creditCard: gb_getGroupCreditCard_(gId),
      jpyAmount: r[GB_COL.GROUP_JPY],
      orderId: r[GB_COL.GROUP_ORDER_ID],
      logisticsId: r[GB_COL.GROUP_LOGISTICS],
      purchaseLink: r[GB_COL.GROUP_LINK],
      orders: []
    };
  }
  if (!oId) return;
  var g = groupsMap[gId];
  var order = null;
  for (var j = 0; j < g.orders.length; j++) {
    if (g.orders[j].id === oId) { order = g.orders[j]; break; }
  }
  if (!order) {
    order = {
      id: oId,
      customerName: r[GB_COL.CUSTOMER],
      totalTwd: r[GB_COL.TOTAL_TWD],
      deposit: r[GB_COL.DEPOSIT],
      domesticShip: r[GB_COL.DOMESTIC],
      intlShip: r[GB_COL.INTL],
      balance: r[GB_COL.BALANCE],
      paymentStatus: r[GB_COL.PAY_STATUS],
      paymentInfo: r[GB_COL.PAYMENT_INFO],
      items: []
    };
    g.orders.push(order);
  }
  if (r[GB_COL.ITEM]) {
    order.items.push({
      name: r[GB_COL.ITEM], qty: r[GB_COL.QTY], jpy: r[GB_COL.JPY], twd: r[GB_COL.TWD_UNIT]
    });
  }
}

function gb_fetchAllData_() {
  gb_initSheets_();
  var ss = SpreadsheetApp.getActive();
  var orderSheet = ss.getSheetByName(GB_SHEET_ORDERS);
  var journalSheet = ss.getSheetByName(GB_SHEET_JOURNAL);
  var settingsSheet = ss.getSheetByName(GB_SHEET_SETTINGS);

  var groupsMap = {};
  var last = orderSheet.getLastRow();
  var rows = last > 1 ? orderSheet.getRange(2, 1, last, GB_COLS).getValues() : [];

  for (var i = 0; i < rows.length; i++) {
    if (gb_isLegacyRow_(rows[i])) gb_legacyUnflattenRow_(rows[i], groupsMap);
    else gb_v50UnflattenRow_(rows[i], groupsMap);
  }

  var journalRows = journalSheet.getLastRow() > 1
    ? journalSheet.getRange(2, 1, journalSheet.getLastRow(), 7).getValues()
    : [];
  var bankJournal = journalRows.map(function (r) {
    return { id: r[0], date: r[1], bank: r[2], type: r[3], amount: r[4], category: r[5], note: r[6] };
  });

  var settings = {};
  var sLast = settingsSheet.getLastRow();
  if (sLast >= 2) {
    var sRows = settingsSheet.getRange(2, 1, sLast, 2).getValues();
    for (var si = 0; si < sRows.length; si++) {
      if (sRows[si][0]) settings[String(sRows[si][0])] = sRows[si][1];
    }
  }
  var exchangeRate = settings.exchangeRate ? Number(settings.exchangeRate) : 0.22;
  var portalConfig = {
    title: String(settings.portalTitle || '訂單自助查詢'),
    intro: String(settings.portalIntro || ''),
    websiteUrl: String(settings.portalWebsiteUrl || ''),
    groupUrl: String(settings.portalGroupUrl || ''),
    extraNote: String(settings.portalExtraNote || ''),
    lookupDesc: String(settings.portalLookupDesc || '')
  };

  return {
    groups: Object.keys(groupsMap).map(function (k) { return groupsMap[k]; }),
    bankJournal: bankJournal,
    exchangeRate: exchangeRate,
    portalConfig: portalConfig
  };
}

function gb_customerLookup_(pl) {
  var name = pl && pl.customerName ? String(pl.customerName).trim() : '';
  var all = gb_fetchAllData_();
  var portalConfig = all.portalConfig;
  var matches = [];
  if (!name) return { portalConfig: portalConfig, matches: matches };
  var groups = all.groups || [];
  for (var gi = 0; gi < groups.length; gi++) {
    var g = groups[gi];
    var orders = g.orders || [];
    for (var oi = 0; oi < orders.length; oi++) {
      var o = orders[oi];
      if (String(o.customerName || '').trim() === name) {
        matches.push({
          groupId: g.id, groupName: g.name, groupStatus: g.status,
          closingDate: g.closingDate, saleEndDate: g.saleEndDate,
          officialShipDate: g.officialShipDate, purchaseLink: g.purchaseLink || '',
          groupOrderId: String(g.orderId || ''), logisticsId: String(g.logisticsId || ''),
          order: {
            id: o.id, customerName: o.customerName, totalTwd: o.totalTwd,
            deposit: o.deposit, domesticShip: o.domesticShip, intlShip: o.intlShip,
            balance: o.balance, paymentStatus: o.paymentStatus, paymentInfo: o.paymentInfo,
            items: o.items || []
          }
        });
      }
    }
  }
  return { portalConfig: portalConfig, matches: matches };
}

function gb_emptyGroupRow_(g, exportDate) {
  return [
    '', '', '', '', '', '', '', '', '', '', '', '',
    g.officialShipDate, g.name, g.id, g.status || '待處理',
    g.closingDate, g.saleEndDate, g.purchaseDate || '', g.jpyAmount,
    g.orderId, g.logisticsId, g.purchaseLink || '', '', '', exportDate
  ];
}

function gb_orderStubRow_(g, o, exportDate) {
  return [
    o.customerName, '', '', '', '', '', o.totalTwd, o.deposit, o.domesticShip, o.intlShip,
    o.balance, o.paymentStatus, g.officialShipDate, g.name, g.id, g.status || '待處理',
    g.closingDate, g.saleEndDate, g.purchaseDate || '', g.jpyAmount,
    g.orderId, g.logisticsId, g.purchaseLink || '', o.id, o.paymentInfo || '', exportDate
  ];
}

function gb_buildFlatRows_(groups) {
  var rows = [];
  var exportDate = new Date().toISOString().slice(0, 10);
  for (var gi = 0; gi < groups.length; gi++) {
    var g = groups[gi];
    gb_setGroupCreditCard_(g.id, g.creditCard || '');
    var orders = g.orders || [];
    if (!orders.length) {
      rows.push(gb_emptyGroupRow_(g, exportDate));
      continue;
    }
    for (var oi = 0; oi < orders.length; oi++) {
      var o = orders[oi];
      var items = o.items || [];
      if (!items.length) {
        rows.push(gb_orderStubRow_(g, o, exportDate));
        continue;
      }
      for (var ii = 0; ii < items.length; ii++) {
        var it = items[ii];
        var qty = Number(it.qty) || 0;
        var jpy = Number(it.jpy) || 0;
        rows.push([
          o.customerName, it.name, qty, jpy, qty * jpy, Number(it.twd) || 0,
          o.totalTwd, o.deposit, o.domesticShip, o.intlShip, o.balance, o.paymentStatus,
          g.officialShipDate, g.name, g.id, g.status || '待處理',
          g.closingDate, g.saleEndDate, g.purchaseDate || '', g.jpyAmount,
          g.orderId, g.logisticsId, g.purchaseLink || '', o.id, o.paymentInfo || '', exportDate
        ]);
      }
    }
  }
  return rows;
}

function gb_performSave_(payload) {
  gb_initSheets_();
  var ss = SpreadsheetApp.getActive();
  var orderSheet = ss.getSheetByName(GB_SHEET_ORDERS);
  var journalSheet = ss.getSheetByName(GB_SHEET_JOURNAL);
  var settingsSheet = ss.getSheetByName(GB_SHEET_SETTINGS);

  var last = orderSheet.getLastRow();
  if (last > 1) orderSheet.getRange(2, 1, last, GB_COLS).clearContent();

  var rows = gb_buildFlatRows_(payload.groups || []);
  if (rows.length > 0) {
    orderSheet.getRange(2, 1, 1 + rows.length, GB_COLS).setValues(rows);
  }

  var jLast = journalSheet.getLastRow();
  if (jLast > 1) journalSheet.getRange(2, 1, jLast, 7).clearContent();
  var bankJournal = payload.bankJournal || [];
  var jRows = bankJournal.map(function (j) {
    return [j.id, j.date, j.bank, j.type, j.amount, j.category, j.note];
  });
  if (jRows.length > 0) {
    journalSheet.getRange(2, 1, 1 + jRows.length, 7).setValues(jRows);
  }

  if (payload.exchangeRate != null) {
    gb_upsertSetting_(settingsSheet, 'exchangeRate', String(payload.exchangeRate));
  }
  if (payload.portalConfig) {
    var pc = payload.portalConfig;
    gb_upsertSetting_(settingsSheet, 'portalTitle', pc.title || '');
    gb_upsertSetting_(settingsSheet, 'portalIntro', pc.intro || '');
    gb_upsertSetting_(settingsSheet, 'portalWebsiteUrl', pc.websiteUrl || '');
    gb_upsertSetting_(settingsSheet, 'portalGroupUrl', pc.groupUrl || '');
    gb_upsertSetting_(settingsSheet, 'portalExtraNote', pc.extraNote || '');
    if (pc.lookupDesc != null) gb_upsertSetting_(settingsSheet, 'portalLookupDesc', pc.lookupDesc || '');
  }
  return { status: 'success' };
}

function gb_upsertSetting_(sheet, key, value) {
  var last = sheet.getLastRow();
  if (last < 2) {
    sheet.appendRow([key, value]);
    return;
  }
  var range = sheet.getRange(2, 1, last, 2).getValues();
  for (var i = 0; i < range.length; i++) {
    if (String(range[i][0]) === String(key)) {
      sheet.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}


/* --- next: --- */

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


/* --- next: --- */

/**

 * Ledger smoke test for Apps Script.

 * 用來快速驗證「記帳」資料層是否正常（建行程 -> 寫分錄 -> 讀回）。

 *

 * 執行方式（Apps Script 編輯器）：

 * 1) 確認專案已「綁定」試算表，或已設定 Script Property：HEINA_SPREADSHEET_ID

 * 2) 選函式 `runLedgerSmokeTest`

 * 3) 按「執行」並完成授權

 * 4) 到 Execution log 看 JSON；通過時試算表「行程」「記帳明細」會各多一列

 */

function runLedgerSmokeTest() {

  var result = ld_selfTest_('ledger-smoke');

  Logger.log(JSON.stringify(result, null, 2));

  try {

    var ss = ld_ss_();

    Logger.log('試算表：' + ss.getName() + ' | ' + ss.getUrl());

  } catch (e) {

    Logger.log('試算表：無法取得（' + String(e && e.message ? e.message : e) + '）');

  }

  return result;

}



/**

 * 內部測試：回傳可供前端或手動檢查的摘要。

 * @param {string} clientId

 * @return {{ok:boolean, message:string, detail:Object}}

 */

function ld_selfTest_(clientId) {

  var cid = String(clientId || 'ledger-smoke');

  var detail = { clientId: cid, steps: [] };

  function step(name, ok, extra) {

    var row = { step: name, ok: !!ok };

    if (extra) {

      for (var k in extra) {

        if (Object.prototype.hasOwnProperty.call(extra, k)) row[k] = extra[k];

      }

    }

    detail.steps.push(row);

    return !!ok;

  }



  try {

    var ss;

    try {

      ss = ld_ss_();

      step('resolveSpreadsheet', true, {

        spreadsheetId: ss.getId(),

        spreadsheetName: ss.getName(),

        spreadsheetUrl: ss.getUrl()

      });

    } catch (e0) {

      step('resolveSpreadsheet', false, { error: String(e0 && e0.message ? e0.message : e0) });

      return {

        ok: false,

        message: '無法連到試算表（請綁定試算表或設定 HEINA_SPREADSHEET_ID）',

        detail: detail

      };

    }



    ld_ensureSheets_();

    step('ensureSheets', true, {});



    var txSh = ss.getSheetByName('記帳明細');

    var rowsBefore = txSh ? Math.max(0, txSh.getLastRow() - 1) : 0;



    var trip = ld_createTrip_(cid, 'Smoke Test ' + new Date().toISOString());

    step('createTrip', !!(trip && trip.id), { tripId: trip && trip.id });



    var tx = ld_addTransaction_(cid, {

      tripId: trip.id,

      amount: 123,

      type: 'business',

      category: '代購成本',

      date: new Date().toISOString().slice(0, 10),

      note: 'smoke-test',

      payMethod: '現金',

      currency: 'JPY'

    });

    step('addTransaction', !!(tx && tx.id), { txId: tx && tx.id });



    var rowsAfter = txSh ? Math.max(0, txSh.getLastRow() - 1) : 0;

    var rowIncreased = rowsAfter > rowsBefore;

    step('sheetRowAppended', rowIncreased, { rowsBefore: rowsBefore, rowsAfter: rowsAfter });



    if (!rowIncreased) {

      return {

        ok: false,

        message: '寫入試算表失敗：記帳明細列數未增加（可能被保護或無編輯權）',

        detail: Object.assign(detail, { tripId: trip.id, txId: tx.id })

      };

    }



    var init = ld_getInitData_(cid);

    var txList = Array.isArray(init.transactions) ? init.transactions : [];

    var found = txList.some(function (x) {

      return String(x.id) === String(tx.id);

    });

    step('readBackInit', found, { txCount: txList.length });



    if (!found) {

      return {

        ok: false,

        message: '讀回失敗：分錄已寫入試算表，但 getInitData 找不到（請檢查表頭／裝置ID 欄）',

        detail: Object.assign(detail, { tripId: trip.id, txId: tx.id, txCount: txList.length })

      };

    }



    return {

      ok: true,

      message: 'ledger smoke test passed',

      detail: Object.assign(detail, {

        tripId: trip.id,

        txId: tx.id,

        txCount: txList.length,

        currentTripId: init.currentTripId || ''

      })

    };

  } catch (e) {

    step('exception', false, { error: String(e && e.message ? e.message : e) });

    return {

      ok: false,

      message: 'ledger smoke test exception',

      detail: detail

    };

  }

}




/* --- next: --- */

/** Preorder — normalized Groups / Orders / Items on the active spreadsheet */

var PO_SHEET_GROUPS = 'Groups';
var PO_SHEET_ORDERS = 'Orders';
var PO_SHEET_ITEMS = 'Items';

function po_getOrCreateSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function po_ensureSheets_(ss) {
  var g = po_getOrCreateSheet_(ss, PO_SHEET_GROUPS);
  var o = po_getOrCreateSheet_(ss, PO_SHEET_ORDERS);
  var i = po_getOrCreateSheet_(ss, PO_SHEET_ITEMS);

  var groupsHeaders = [
    'groupId', 'name', 'status', 'closingDate', 'saleEndDate', 'purchaseDate',
    'purchasePlace', 'officialShipDate',
    'jpyAmount', 'creditCard', 'orderId', 'logisticsId', 'purchaseLink',
    'createdAt', 'updatedAt'
  ];
  var ordersHeaders = [
    'orderId', 'groupId', 'customerName', 'paymentStatus', 'paymentInfo',
    'deposit', 'domesticShip', 'intlShip', 'totalTwd', 'balance',
    'createdAt', 'updatedAt'
  ];
  var itemsHeaders = [
    'itemId', 'orderId', 'name', 'qty', 'jpy', 'twd',
    'createdAt', 'updatedAt'
  ];

  po_setHeaderIfEmpty_(g, groupsHeaders);
  po_setHeaderIfEmpty_(o, ordersHeaders);
  po_setHeaderIfEmpty_(i, itemsHeaders);
}

function po_setHeaderIfEmpty_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return;
  }
  var cur = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var empty = true;
  for (var c = 0; c < headers.length; c++) {
    if (String(cur[c] || '').trim() !== '') { empty = false; break; }
  }
  if (empty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function po_clearData_(sheet) {
  var lr = sheet.getLastRow();
  var lc = sheet.getLastColumn();
  if (lr > 1) sheet.getRange(2, 1, lr, lc).clearContent();
}

function po_safeStr_(v) {
  if (v === undefined || v === null) return '';
  return String(v);
}

function po_safeNum_(v) {
  if (v === undefined || v === null || v === '') return 0;
  var n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function po_safeId_(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function po_writeAllData_(groups) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  po_ensureSheets_(ss);
  var shG = ss.getSheetByName(PO_SHEET_GROUPS);
  var shO = ss.getSheetByName(PO_SHEET_ORDERS);
  var shI = ss.getSheetByName(PO_SHEET_ITEMS);
  po_clearData_(shG);
  po_clearData_(shO);
  po_clearData_(shI);

  var now = new Date();
  var groupRows = [];
  var orderRows = [];
  var itemRows = [];

  for (var gi = 0; gi < groups.length; gi++) {
    var g = groups[gi];
    if (!g) continue;
    var groupId = po_safeId_(g.id);
    groupRows.push([
      groupId,
      po_safeStr_(g.name),
      po_safeStr_(g.status),
      po_safeStr_(g.closingDate),
      po_safeStr_(g.saleEndDate),
      po_safeStr_(g.purchaseDate),
      po_safeStr_(g.purchasePlace),
      po_safeStr_(g.officialShipDate),
      po_safeNum_(g.jpyAmount),
      po_safeStr_(g.creditCard),
      po_safeStr_(g.orderId),
      po_safeStr_(g.logisticsId),
      po_safeStr_(g.purchaseLink),
      now, now
    ]);

    var orders = Array.isArray(g.orders) ? g.orders : [];
    for (var oi = 0; oi < orders.length; oi++) {
      var o = orders[oi];
      if (!o) continue;
      var orderId = po_safeId_(o.id);
      orderRows.push([
        orderId,
        groupId,
        po_safeStr_(o.customerName),
        po_safeStr_(o.paymentStatus),
        po_safeStr_(o.paymentInfo),
        po_safeNum_(o.deposit),
        po_safeNum_(o.domesticShip),
        po_safeNum_(o.intlShip),
        po_safeNum_(o.totalTwd),
        po_safeNum_(o.balance),
        now, now
      ]);

      var items = Array.isArray(o.items) ? o.items : [];
      for (var ii = 0; ii < items.length; ii++) {
        var it = items[ii];
        if (!it) continue;
        itemRows.push([
          po_safeId_(it.id),
          orderId,
          po_safeStr_(it.name),
          po_safeNum_(it.qty),
          po_safeNum_(it.jpy),
          po_safeNum_(it.twd),
          now, now
        ]);
      }
    }
  }

  if (groupRows.length > 0) shG.getRange(2, 1, groupRows.length, groupRows[0].length).setValues(groupRows);
  if (orderRows.length > 0) shO.getRange(2, 1, orderRows.length, orderRows[0].length).setValues(orderRows);
  if (itemRows.length > 0) shI.getRange(2, 1, itemRows.length, itemRows[0].length).setValues(itemRows);

  return { ok: true, spreadsheetUrl: ss.getUrl(), stats: { groups: groupRows.length, orders: orderRows.length, items: itemRows.length } };
}

function po_readSheetAsObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(String);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var blank = true;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] != null) { blank = false; break; }
    }
    if (blank) continue;
    var obj = {};
    for (var c2 = 0; c2 < headers.length; c2++) {
      obj[headers[c2]] = row[c2];
    }
    out.push(obj);
  }
  return out;
}

function po_readAllData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  po_ensureSheets_(ss);
  var shG = ss.getSheetByName(PO_SHEET_GROUPS);
  var shO = ss.getSheetByName(PO_SHEET_ORDERS);
  var shI = ss.getSheetByName(PO_SHEET_ITEMS);

  var groups = po_readSheetAsObjects_(shG);
  var orders = po_readSheetAsObjects_(shO);
  var items = po_readSheetAsObjects_(shI);

  var itemsByOrder = {};
  for (var ii = 0; ii < items.length; ii++) {
    var it = items[ii];
    var oid = po_safeId_(it.orderId);
    if (!oid) continue;
    if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
    itemsByOrder[oid].push({
      id: po_safeId_(it.itemId),
      name: po_safeStr_(it.name),
      qty: Number(it.qty || 0),
      jpy: Number(it.jpy || 0),
      twd: Number(it.twd || 0)
    });
  }

  var ordersByGroup = {};
  for (var oi = 0; oi < orders.length; oi++) {
    var o = orders[oi];
    var gid = po_safeId_(o.groupId);
    var oid2 = po_safeId_(o.orderId);
    if (!gid || !oid2) continue;
    if (!ordersByGroup[gid]) ordersByGroup[gid] = [];
    ordersByGroup[gid].push({
      id: oid2,
      customerName: po_safeStr_(o.customerName),
      paymentStatus: po_safeStr_(o.paymentStatus) || '未付款',
      paymentInfo: po_safeStr_(o.paymentInfo),
      deposit: Number(o.deposit || 0),
      domesticShip: Number(o.domesticShip || 0),
      intlShip: Number(o.intlShip || 0),
      totalTwd: Number(o.totalTwd || 0),
      balance: Number(o.balance || 0),
      items: itemsByOrder[oid2] || []
    });
  }

  var out = [];
  for (var gi = 0; gi < groups.length; gi++) {
    var g = groups[gi];
    var gid3 = po_safeId_(g.groupId);
    if (!gid3) continue;
    out.push({
      id: gid3,
      name: po_safeStr_(g.name),
      status: po_safeStr_(g.status) || '待處理',
      closingDate: po_safeStr_(g.closingDate),
      saleEndDate: po_safeStr_(g.saleEndDate),
      purchaseDate: po_safeStr_(g.purchaseDate),
      purchasePlace: po_safeStr_(g.purchasePlace),
      officialShipDate: po_safeStr_(g.officialShipDate),
      jpyAmount: po_safeStr_(g.jpyAmount),
      creditCard: po_safeStr_(g.creditCard),
      orderId: po_safeStr_(g.orderId),
      logisticsId: po_safeStr_(g.logisticsId),
      purchaseLink: po_safeStr_(g.purchaseLink),
      orders: ordersByGroup[gid3] || []
    });
  }
  out.sort(function (a, b) { return String(b.id).localeCompare(String(a.id)); });
  return out;
}

/**
 * 顧客預購查單：暱稱與下單時完全一致；Portal 文案與開團查詢共用系統設定。
 * @param {{customerName:string}} pl
 */
function po_customerLookup_(pl) {
  var name = pl && pl.customerName ? String(pl.customerName).trim() : '';
  var all = gb_fetchAllData_();
  var pc = all.portalConfig || {};
  var portalConfig = {
    title: String(pc.title || pc.brandName || '訂單自助查詢'),
    intro: String(pc.intro || pc.subtitle || '輸入社群暱稱即可查詢訂單狀態與付款資訊。'),
    websiteUrl: String(pc.websiteUrl || ''),
    groupUrl: String(pc.groupUrl || ''),
    extraNote: String(pc.extraNote || ''),
    lookupDesc: String(pc.lookupDesc || '')
  };
  var matches = [];
  if (!name) {
    return { portalConfig: portalConfig, matches: matches };
  }
  var groups = po_readAllData_();
  for (var gi = 0; gi < groups.length; gi++) {
    var g = groups[gi];
    var orders = g.orders || [];
    for (var oi = 0; oi < orders.length; oi++) {
      var o = orders[oi];
      if (String(o.customerName || '').trim() === name) {
        matches.push({
          groupId: g.id,
          groupName: g.name,
          groupStatus: g.status,
          closingDate: g.closingDate,
          saleEndDate: g.saleEndDate,
          purchaseDate: g.purchaseDate,
          officialShipDate: g.officialShipDate,
          purchaseLink: g.purchaseLink || '',
          groupOrderId: String(g.orderId || ''),
          logisticsId: String(g.logisticsId || ''),
          order: {
            id: o.id,
            customerName: o.customerName,
            paymentStatus: o.paymentStatus,
            paymentInfo: o.paymentInfo,
            deposit: o.deposit,
            domesticShip: o.domesticShip,
            intlShip: o.intlShip,
            totalTwd: o.totalTwd,
            balance: o.balance,
            items: o.items || []
          }
        });
      }
    }
  }
  return { portalConfig: portalConfig, matches: matches };
}


/* --- next: --- */

/** 試算表開啟時：建立選單（可手動執行初始化） */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Heina Suite')
    .addItem('初始化分頁（團購／記帳／預購）', 'heinaSuiteSetupSheets')
    .addItem('記帳 Smoke Test（寫入試算表）', 'runLedgerSmokeTestFromMenu_')
    .addToUi();
}

function heinaSuiteSetupSheets() {
  gb_initSheets_();
  ld_ensureSheets_();
  po_ensureSheets_(SpreadsheetApp.getActiveSpreadsheet());
  shub_ensureSheets_();
  SpreadsheetApp.getUi().alert('已檢查並建立缺少的分頁與表頭（若已存在則保留）。');
}

/** 從試算表選單執行記帳 smoke test（會實際寫入一筆測試資料） */
function runLedgerSmokeTestFromMenu_() {
  var result = runLedgerSmokeTest();
  var msg = result.ok
    ? '通過：已寫入測試行程與分錄。\n' + JSON.stringify(result.detail, null, 2)
    : '失敗：' + result.message + '\n' + JSON.stringify(result.detail, null, 2);
  SpreadsheetApp.getUi().alert(msg.slice(0, 1800));
}



/* --- next: --- */

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


/* --- next: --- */

/**
 * 官網現貨商城：目錄存於「系統設定」JSON，公開 API 不回傳倉位等內部欄位。
 */

var SF_CATALOG_KEY = 'publicSpotCatalogJson';

function sf_getSettingsSheet_() {
  gb_initSheets_();
  return SpreadsheetApp.getActive().getSheetByName(GB_SHEET_SETTINGS);
}

function sf_readSetting_(key) {
  var sheet = sf_getSettingsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return '';
  var rows = sheet.getRange(2, 1, last, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(key)) return String(rows[i][1] || '');
  }
  return '';
}

function sf_sanitizeProduct_(p) {
  return {
    id: String(p.id || ''),
    name: String(p.name || ''),
    imageUrl: String(p.imageUrl || ''),
    sku: String(p.sku || ''),
    category: String(p.category || ''),
    twdPrice: Number(p.twdPrice) || 0,
    stockQty: Math.max(0, Number(p.stockQty) || 0),
    status: String(p.status || 'on_sale'),
    notes: String(p.notes || ''),
  };
}

/**
 * 顧客官網讀取上架現貨（不需登入）。
 */
function sf_getCatalog_() {
  var raw = sf_readSetting_(SF_CATALOG_KEY);
  var list = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      list = [];
    }
  }
  var products = [];
  for (var i = 0; i < list.length; i++) {
    var p = sf_sanitizeProduct_(list[i]);
    if (p.status === 'on_sale' && p.stockQty > 0 && p.name) {
      products.push(p);
    }
  }
  return { products: products, updatedAt: new Date().toISOString() };
}

/**
 * 後台發布現貨至官網（寫入試算表設定）。
 * @param {Object} payload { products: Array }
 */
function sf_publishCatalog_(payload) {
  payload = payload || {};
  var src = payload.products || [];
  var out = [];
  for (var i = 0; i < src.length; i++) {
    out.push(sf_sanitizeProduct_(src[i]));
  }
  var sheet = sf_getSettingsSheet_();
  gb_upsertSetting_(sheet, SF_CATALOG_KEY, JSON.stringify(out));
  return { ok: true, count: out.length };
}


/* --- next: --- */

/**
 * Web entry — bound to container spreadsheet.
 * 優先載入 Html 檔名 index（建置產物 deploy/apps-script-bundle/index.html 全文貼上）；
 * 若專案內尚為舊檔名 UI，會自動改載 UI。
 */
function doGet() {
  return heinaHtmlOutputFromFile_();
}

/**
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function heinaHtmlOutputFromFile_() {
  var names = ['index', 'UI'];
  var lastMsg = '';
  for (var i = 0; i < names.length; i++) {
    try {
      return HtmlService.createHtmlOutputFromFile(names[i])
        .setTitle('Heina Suite')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    } catch (e) {
      lastMsg = e && e.message ? String(e.message) : String(e);
    }
  }
  var body =
    '<div style="font-family:system-ui,Segoe UI,Roboto,Noto Sans TC,sans-serif;padding:20px;max-width:42rem;line-height:1.55;color:#111">' +
    '<h1 style="font-size:1.15rem;margin:0 0 12px">找不到前端 HTML（index 或 UI）</h1>' +
    '<ol style="margin:0 0 14px;padding-left:1.25rem">' +
    '<li>在本機 <code>heina-suite</code> 執行 <code>npm run build:gas</code></li>' +
    '<li>開啟 <code>deploy/apps-script-bundle/index.html</code>，全選複製</li>' +
    '<li>Apps Script → ＋ → <b>HTML</b> → 檔名設為 <b>index</b>（編輯器顯示 index.html）→ 貼上並儲存</li>' +
    '<li>重新部署「網路應用程式」後再開網址</li>' +
    '</ol>' +
    '<p style="margin:0;font-size:13px;color:#555">若沿用舊專案，Html 檔名也可為 <b>UI</b>（本程式會自動嘗試）。</p>' +
    '<p style="margin:14px 0 0;font-size:12px;color:#888">Apps Script 訊息：' +
    heinaEscapeHtml_(lastMsg) +
    '</p>' +
    '</div>';
  return HtmlService.createHtmlOutput(body).setTitle('Heina Suite — 設定提示');
}

function heinaEscapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Single RPC for the unified SPA.
 * @param {string} json JSON.stringify({ module, action, payload })
 * @return {*} depends on action
 */
function unifiedApi(json) {
  var req = JSON.parse(json);
  var mod = req.module;
  var act = req.action;
  var pl = req.payload;

  if (mod === 'groupbuy') {
    if (act === 'getAppData') return gb_fetchAllData_();
    if (act === 'saveAppData') return gb_performSave_(pl);
    if (act === 'customerLookup') return gb_customerLookup_(pl);
  }
  if (mod === 'ledger') {
    if (act === 'getInitData') return ld_getInitData_(pl.clientId);
    if (act === 'createTrip') return ld_createTrip_(pl.clientId, pl.name);
    if (act === 'setCurrentTrip') return ld_setCurrentTrip_(pl.clientId, pl.tripId);
    if (act === 'addTransaction') return ld_addTransaction_(pl.clientId, pl.payload);
    if (act === 'deleteTransaction') return ld_deleteTransaction_(pl.clientId, pl.txId);
    if (act === 'createItemsBatch') return ld_createItemsBatch_(pl.clientId, pl.rawText);
    if (act === 'deleteItem') return ld_deleteItem_(pl.clientId, pl.itemId);
    if (act === 'deleteTrip') return ld_deleteTrip_(pl.clientId, pl.tripId);
    if (act === 'duplicateTrip') return ld_duplicateTrip_(pl.clientId, pl.sourceTripId, pl.newTripName || '');
    if (act === 'overwriteTrip') return ld_overwriteTrip_(pl.clientId, pl.sourceTripId, pl.targetTripId);
    if (act === 'saveSettings') return ld_saveSettings_(pl.clientId, pl.settingsObj);
    if (act === 'resetSheetsForClient') return ld_resetSheetsForClient_(pl.clientId);
  }
  if (mod === 'preorder') {
    if (act === 'export') return po_readAllData_();
    if (act === 'save') return po_writeAllData_(pl);
    if (act === 'customerLookup') return po_customerLookup_(pl);
  }
  if (mod === 'systemhub') {
    if (act === 'ensureSheets') {
      shub_ensureSheets_();
      return { ok: true };
    }
    if (act === 'put') return shub_put_(pl.category, pl.key, pl.value, pl.note);
    if (act === 'get') return shub_get_(pl.category, pl.key);
    if (act === 'list') return shub_list_(pl.category || '');
    if (act === 'delete') return shub_delete_(pl.category, pl.key);
    if (act === 'appendLog') return shub_log_(pl.category, pl.action, pl.key, pl.json, pl.note);
  }
  if (mod === 'storefront') {
    if (act === 'getCatalog') return sf_getCatalog_();
    if (act === 'publishCatalog') return sf_publishCatalog_(pl);
  }
  throw new Error('Unknown module/action: ' + mod + '/' + act);
}


/**
 * =============================================================================
 * <<< GAS-APPS-SCRIPT-COPY-END（.gs）
 * =============================================================================
 */
