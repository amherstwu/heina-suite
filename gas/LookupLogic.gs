/**
 * Pure lookup and sheet-range helpers. No SpreadsheetApp / CacheService / LockService.
 * Apps Script Sheet.getRange(row, column, numRows, numColumns) takes a row COUNT
 * in the third argument. Passing the end row (1 + data.length, or the row index
 * itself) makes setValues throw because the range is taller than the values.
 */

var GB_LOOKUP_MAX_FAILS = 8;

function gb_normalizeLookupKey_(s) {
  var t = String(s || '').trim();
  if (!t) return '';
  try {
    if (typeof t.normalize === 'function') t = t.normalize('NFKC');
  } catch (e) {}
  return t.replace(/\s+/g, '').toLowerCase();
}

function gb_normalizePin_(pin) {
  var s = String(pin == null ? '' : pin);
  try {
    if (typeof s.normalize === 'function') s = s.normalize('NFKC');
  } catch (e) {}
  return s.replace(/\D/g, '').slice(0, 4);
}

function gb_isPin_(pin) {
  return /^\d{4}$/.test(pin);
}

/**
 * One subject per normalized name. A portal row links its name and LINE display
 * name so either query can see that customer's orders. Order ids are exact only.
 */
function gb_collectLookupSubjects_(groups, portalCustomers) {
  var subjects = [];
  var byKey = {};

  function ensure(label) {
    var key = gb_normalizeLookupKey_(label);
    if (!key) return null;
    if (!byKey[key]) {
      var rec = { key: key, label: String(label).trim(), orderIds: [], pin: '', linked: {} };
      rec.linked[key] = true;
      byKey[key] = rec;
      subjects.push(rec);
    }
    return byKey[key];
  }

  var gi, oi, g, orders, o, pi, c, pin, labels, recs, i, j, rec;
  for (gi = 0; gi < (groups || []).length; gi++) {
    g = groups[gi];
    orders = g && g.orders ? g.orders : [];
    for (oi = 0; oi < orders.length; oi++) {
      o = orders[oi];
      rec = ensure(o && o.customerName);
      if (!rec) continue;
      var oid = String((o && o.id) || '').trim();
      if (oid) rec.orderIds.push(oid);
    }
  }

  for (pi = 0; pi < (portalCustomers || []).length; pi++) {
    c = portalCustomers[pi];
    if (!c) continue;
    pin = gb_normalizePin_(c.lookupPin);
    if (!gb_isPin_(pin)) pin = '';
    labels = [];
    if (c.name) labels.push(c.name);
    if (c.lineDisplayName) labels.push(c.lineDisplayName);
    recs = [];
    for (i = 0; i < labels.length; i++) {
      rec = ensure(labels[i]);
      if (rec) recs.push(rec);
    }
    for (i = 0; i < recs.length; i++) {
      if (pin && !recs[i].pin) recs[i].pin = pin;
      for (j = 0; j < recs.length; j++) recs[i].linked[recs[j].key] = true;
    }
  }

  return subjects;
}

/**
 * Authorize a lookup. There is no shared default PIN: a customer with no
 * stored 4-digit PIN does not match any password.
 * Name match is normalized equality (NFKC, no whitespace, case-insensitive).
 * Substring names are not candidates. An order id must match in full.
 */
function gb_authorizeLookup_(query, pin, groups, portalCustomers) {
  var qRaw = String(query || '').trim();
  var qKey = gb_normalizeLookupKey_(qRaw);
  var qId = qRaw.toLowerCase();
  var normalizedPin = gb_normalizePin_(pin);
  if (!qRaw) return { ok: false, message: '請輸入查詢名稱', authorizedKeys: [] };
  if (!gb_isPin_(normalizedPin)) return { ok: false, message: '請輸入 4 位數查單密碼', authorizedKeys: [] };

  var subjects = gb_collectLookupSubjects_(groups, portalCustomers);
  var matched = [];
  var i, s, j;
  for (i = 0; i < subjects.length; i++) {
    s = subjects[i];
    if (qKey && s.key === qKey) {
      matched.push(s);
      continue;
    }
    if (!qId) continue;
    for (j = 0; j < s.orderIds.length; j++) {
      if (String(s.orderIds[j]).trim().toLowerCase() === qId) {
        matched.push(s);
        break;
      }
    }
  }

  if (!matched.length) {
    return { ok: false, message: '查無符合的客人，請輸入完整暱稱或訂單編號', authorizedKeys: [] };
  }

  var authorized = {};
  var sawMissing = false;
  var sawWrong = false;
  for (i = 0; i < matched.length; i++) {
    s = matched[i];
    if (!gb_isPin_(s.pin)) {
      sawMissing = true;
      continue;
    }
    if (s.pin !== normalizedPin) {
      sawWrong = true;
      continue;
    }
    for (var k in s.linked) {
      if (Object.prototype.hasOwnProperty.call(s.linked, k)) authorized[k] = true;
    }
  }

  var keys = [];
  for (var ak in authorized) {
    if (Object.prototype.hasOwnProperty.call(authorized, ak)) keys.push(ak);
  }
  if (!keys.length) {
    return {
      ok: false,
      message: sawMissing && !sawWrong
        ? '查單密碼尚未設定，請聯絡團主為你設定專屬查單密碼'
        : '查單密碼錯誤',
      authorizedKeys: []
    };
  }
  return { ok: true, message: '', authorizedKeys: keys };
}

function gb_orderVisibleToLookup_(customerName, authorizedKeys) {
  var key = gb_normalizeLookupKey_(customerName);
  if (!key) return false;
  for (var i = 0; i < (authorizedKeys || []).length; i++) {
    if (authorizedKeys[i] === key) return true;
  }
  return false;
}

/**
 * Public PIN change. Requires an existing portal row whose own PIN matches
 * currentPin. Does not accept a shared default, and does not create a row.
 */
function gb_evaluateChangeLookupPin_(name, currentPin, newPin, confirmPin, portalCustomers) {
  var q = String(name || '').trim();
  if (!q) return { ok: false, message: '請輸入查詢名稱' };
  var cur = gb_normalizePin_(currentPin);
  var next = gb_normalizePin_(newPin);
  var confirm = gb_normalizePin_(confirmPin);
  if (!gb_isPin_(cur)) return { ok: false, message: '請輸入目前的 4 位數密碼' };
  if (!gb_isPin_(next)) return { ok: false, message: '新密碼須為 4 位數字' };
  if (next !== confirm) return { ok: false, message: '兩次新密碼不一致' };
  if (next === cur) return { ok: false, message: '新密碼不可與目前密碼相同' };

  var qKey = gb_normalizeLookupKey_(q);
  var found = null;
  for (var i = 0; i < (portalCustomers || []).length; i++) {
    var c = portalCustomers[i];
    if (!c) continue;
    if (gb_normalizeLookupKey_(c.name) === qKey || gb_normalizeLookupKey_(c.lineDisplayName) === qKey) {
      found = c;
      break;
    }
  }
  if (!found) return { ok: false, message: '查無此客人或尚未設定專屬密碼，請聯絡團主' };
  var stored = gb_normalizePin_(found.lookupPin);
  if (!gb_isPin_(stored)) return { ok: false, message: '查單密碼尚未設定，請聯絡團主' };
  if (stored !== cur) return { ok: false, message: '目前密碼錯誤' };
  return { ok: true, message: '查單密碼已更新', lookupPin: next };
}

/**
 * Admin roster wins for names and for any PIN it actually sends.
 * A blank incoming PIN keeps the PIN already stored for that person, so a
 * customer who set their own password is not erased by a roster row that
 * has no password yet.
 */
function gb_mergePortalLookupCustomers_(existing, incoming) {
  var pinByKey = {};
  function remember(c) {
    if (!c) return;
    var pin = gb_normalizePin_(c.lookupPin);
    if (!gb_isPin_(pin)) return;
    var keys = [gb_normalizeLookupKey_(c.name), gb_normalizeLookupKey_(c.lineDisplayName)];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] && !pinByKey[keys[i]]) pinByKey[keys[i]] = pin;
    }
  }
  var i;
  for (i = 0; i < (existing || []).length; i++) remember(existing[i]);

  var next = [];
  var seen = {};
  for (i = 0; i < (incoming || []).length; i++) {
    var c = incoming[i] || {};
    var name = String(c.name || '').trim();
    var line = String(c.lineDisplayName || name).trim();
    var key = gb_normalizeLookupKey_(name) || gb_normalizeLookupKey_(line);
    if (!key || seen[key]) continue;
    seen[key] = true;
    var pin = gb_normalizePin_(c.lookupPin);
    if (!gb_isPin_(pin)) {
      pin = pinByKey[gb_normalizeLookupKey_(name)] || pinByKey[gb_normalizeLookupKey_(line)] || '';
    }
    next.push({
      name: name || line,
      lineDisplayName: line || name,
      lookupPin: gb_isPin_(pin) ? pin : ''
    });
  }
  return next;
}

function gb_lookupRateDecision_(failCount) {
  var n = Number(failCount);
  if (!isFinite(n) || n < 0) n = 0;
  if (n >= GB_LOOKUP_MAX_FAILS) {
    return { locked: true, fails: n, message: '嘗試次數過多，請約 15 分鐘後再試' };
  }
  return { locked: false, fails: n, message: '' };
}

function gb_nextLookupFailCount_(failCount) {
  var n = Number(failCount);
  if (!isFinite(n) || n < 0) n = 0;
  return n + 1;
}

/** numRows for Sheet.getRange when writing `values` under a header. */
function gb_numRowsForValues_(values) {
  return values && values.length ? values.length : 0;
}

/**
 * One-row, three-column patch (value, timestamp, note) starting at column 3.
 * getRange(row, 3, row, 5) is wrong: the third argument would be numRows = row.
 */
function gb_singleRowPatchShape_() {
  return { numRows: 1, numColumns: 3 };
}
