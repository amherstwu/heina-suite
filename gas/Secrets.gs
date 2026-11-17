/**
 * Secrets live in Apps Script → Project Settings → Script properties.
 * Do not put passwords or PINs in source. This file only names the keys.
 *
 *   HEINA_ADMIN_PASSWORD   organizer login (required before admin API calls)
 *   HEINA_LOOKUP_PIN       retired shared lookup PIN. Do not use it to open
 *                          customer orders. Replace or delete the old value.
 *                          Each customer needs their own 4-digit lookupPin.
 *   HEINA_BANK_PASSWORD    shared bank-account lookup password
 *   HEINA_PAGES_URL        optional public site URL (defaults to the GitHub Pages project URL)
 *   HEINA_ADMIN_SESSIONS   managed automatically (token → expiry). Do not edit by hand.
 */
var HEINA_PROP_ADMIN_PASSWORD = 'HEINA_ADMIN_PASSWORD';
var HEINA_PROP_LOOKUP_PIN = 'HEINA_LOOKUP_PIN';
var HEINA_PROP_BANK_PASSWORD = 'HEINA_BANK_PASSWORD';
var HEINA_PROP_PAGES_URL = 'HEINA_PAGES_URL';
var HEINA_PROP_ADMIN_SESSIONS = 'HEINA_ADMIN_SESSIONS';
var HEINA_DEFAULT_PAGES_URL = 'https://amherstwu.github.io/heina-suite/';

function heinaScriptProp_(key) {
  try {
    var v = PropertiesService.getScriptProperties().getProperty(key);
    return v == null ? '' : String(v);
  } catch (e) {
    return '';
  }
}

function heinaSetScriptProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function heinaAdminPassword_() {
  return heinaScriptProp_(HEINA_PROP_ADMIN_PASSWORD);
}

/**
 * Kept so a rotated HEINA_LOOKUP_PIN can still be read. Customer lookup must
 * not fall back to this value — a shared PIN used to open every customer who
 * had no personal PIN.
 */
function heinaLookupPin_() {
  var pin = heinaScriptProp_(HEINA_PROP_LOOKUP_PIN).replace(/\D/g, '').slice(0, 4);
  return /^\d{4}$/.test(pin) ? pin : '';
}

function heinaBankPassword_() {
  return String(heinaScriptProp_(HEINA_PROP_BANK_PASSWORD) || '').trim();
}

function heinaPagesUrl_() {
  var fromProp = String(heinaScriptProp_(HEINA_PROP_PAGES_URL) || '').trim();
  return fromProp || HEINA_DEFAULT_PAGES_URL;
}

function heinaSafeEqual_(a, b) {
  a = String(a == null ? '' : a);
  b = String(b == null ? '' : b);
  var diff = a.length ^ b.length;
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

function heinaAdminSessions_() {
  try {
    var raw = heinaScriptProp_(HEINA_PROP_ADMIN_SESSIONS);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function heinaSaveAdminSessions_(map) {
  heinaSetScriptProp_(HEINA_PROP_ADMIN_SESSIONS, JSON.stringify(map || {}));
}

function heinaAdminTokenValid_(token) {
  var key = String(token || '');
  if (!key) return false;
  var map = heinaAdminSessions_();
  var exp = Number(map[key] || 0);
  return exp > Date.now();
}

function heinaIssueAdminToken_(hours) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var h = Math.max(1, Math.min(168, Number(hours) || 12));
  var exp = Date.now() + h * 3600000;
  var map = heinaAdminSessions_();
  var now = Date.now();
  var pruned = {};
  var n = 0;
  for (var k in map) {
    if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
    if (Number(map[k]) > now && n < 24) {
      pruned[k] = map[k];
      n++;
    }
  }
  pruned[token] = exp;
  heinaSaveAdminSessions_(pruned);
  return { token: token, expiresAt: exp, sessionHours: h };
}

function heinaClearAdminSessions_() {
  heinaSaveAdminSessions_({});
}

function heinaAdminFailCount_() {
  var n = Number(CacheService.getScriptCache().get('heina_admin_fail') || '0');
  return Number.isFinite(n) ? n : 0;
}

function heinaAdminLocked_() {
  return heinaAdminFailCount_() >= 5;
}

function heinaNoteAdminFail_() {
  var n = heinaAdminFailCount_() + 1;
  CacheService.getScriptCache().put('heina_admin_fail', String(n), 900);
  return n;
}

function heinaClearAdminFail_() {
  CacheService.getScriptCache().remove('heina_admin_fail');
}

function heinaAdminLogin_(pl) {
  if (heinaAdminLocked_()) {
    return { ok: false, message: '嘗試次數過多，請約 15 分鐘後再試' };
  }
  var expected = heinaAdminPassword_();
  if (!String(expected).trim()) {
    return {
      ok: false,
      needsSetup: true,
      message: '尚未設定管理密碼。請到 Apps Script → 專案設定 → 指令碼屬性，新增 HEINA_ADMIN_PASSWORD 後重新部署 Web App。'
    };
  }
  var given = pl && pl.password != null ? String(pl.password) : '';
  if (!given || !heinaSafeEqual_(given, expected)) {
    var n = heinaNoteAdminFail_();
    var left = Math.max(0, 5 - n);
    return {
      ok: false,
      message: left ? '密碼錯誤（尚可嘗試 ' + left + ' 次）' : '密碼錯誤次數過多，已鎖定約 15 分鐘'
    };
  }
  heinaClearAdminFail_();
  var issued = heinaIssueAdminToken_(12);
  return {
    ok: true,
    token: issued.token,
    expiresAt: issued.expiresAt,
    sessionHours: issued.sessionHours
  };
}

function heinaAdminChangePassword_(pl) {
  var current = pl && pl.currentPassword != null ? String(pl.currentPassword) : '';
  var next = pl && pl.newPassword != null ? String(pl.newPassword) : '';
  var expected = heinaAdminPassword_();
  if (!String(expected).trim()) {
    return { ok: false, needsSetup: true, message: '尚未設定管理密碼' };
  }
  if (!heinaSafeEqual_(current, expected)) {
    return { ok: false, message: '目前密碼不正確' };
  }
  if (String(next).length < 6) return { ok: false, message: '新密碼至少 6 字元' };
  if (heinaSafeEqual_(next, expected)) return { ok: false, message: '新密碼不可與目前密碼相同' };
  heinaSetScriptProp_(HEINA_PROP_ADMIN_PASSWORD, next);
  heinaClearAdminSessions_();
  heinaClearAdminFail_();
  return { ok: true, message: '已更新管理密碼，請重新登入' };
}

/**
 * Exclusive lock around Web App handlers so a save cannot clear a sheet while
 * another request reads or writes it. Apps Script locks are not re-entrant;
 * helpers must not call this again.
 */
function heinaWithScriptLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('系統忙碌中，請稍後再試');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
