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
      status: po_safeStr_(g.status) || '已登記',
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
  var rawQ = pl && pl.customerName ? String(pl.customerName).trim() : '';
  var lookupPin = pl && pl.lookupPin != null ? String(pl.lookupPin) : '';
  var all = gb_fetchAllData_();
  var portalConfig = all.portalConfig || gb_buildPortalConfigFromSettings_({});
  var matches = [];
  if (!rawQ) {
    return { portalConfig: portalConfig, matches: matches };
  }

  var groups = po_readAllData_();
  var portalCustomers = all.portalLookupCustomers || [];
  var qLower = rawQ.toLowerCase();
  var candidateMap = {};

  function addCandidate(n) {
    var key = String(n || '').trim();
    if (key) candidateMap[key] = true;
  }

  var gi, oi, g, o, orders, namePool = {}, i;
  for (gi = 0; gi < groups.length; gi++) {
    g = groups[gi];
    orders = g.orders || [];
    for (oi = 0; oi < orders.length; oi++) {
      o = orders[oi];
      var cn = String(o.customerName || '').trim();
      if (cn) namePool[cn] = true;
      if (String(o.id || '').trim().toLowerCase() === qLower) addCandidate(cn);
    }
  }
  for (var pi = 0; pi < portalCustomers.length; pi++) {
    var pc = portalCustomers[pi];
    if (pc && pc.name) namePool[String(pc.name).trim()] = true;
    if (pc && pc.lineDisplayName) namePool[String(pc.lineDisplayName).trim()] = true;
  }

  var poolKeys = Object.keys(namePool);
  for (i = 0; i < poolKeys.length; i++) {
    if (poolKeys[i].toLowerCase() === qLower) addCandidate(poolKeys[i]);
  }
  if (Object.keys(candidateMap).length === 0) {
    for (i = 0; i < poolKeys.length; i++) {
      if (poolKeys[i].toLowerCase().indexOf(qLower) >= 0) addCandidate(poolKeys[i]);
    }
  }
  if (Object.keys(candidateMap).length === 0) addCandidate(rawQ);

  var authorized = {};
  var candKeys = Object.keys(candidateMap);
  var authOkAny = false;
  var lastAuthMsg = '查單密碼錯誤';
  for (i = 0; i < candKeys.length; i++) {
    var auth = gb_verifyLookupPin_(candKeys[i], lookupPin, portalCustomers);
    if (auth.ok) {
      authorized[candKeys[i].toLowerCase()] = true;
      authOkAny = true;
    } else if (auth.message) {
      lastAuthMsg = auth.message;
    }
  }
  if (!authOkAny) {
    return { portalConfig: portalConfig, matches: matches, lookupError: lastAuthMsg };
  }

  for (gi = 0; gi < groups.length; gi++) {
    g = groups[gi];
    orders = g.orders || [];
    for (oi = 0; oi < orders.length; oi++) {
      o = orders[oi];
      var on = String(o.customerName || '').trim();
      if (!authorized[on.toLowerCase()]) continue;
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
  return { portalConfig: portalConfig, matches: matches };
}
