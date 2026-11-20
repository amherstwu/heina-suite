/**
 * Web App entry.
 * The React app is hosted on GitHub Pages. This deployment is the data API.
 *
 * Apps Script cannot set CORS headers. Browsers on another origin must:
 *   - POST the JSON body with Content-Type text/plain;charset=utf-8 (no preflight), or
 *   - GET ?callback=NAME&payload=... (JSONP) for smaller requests.
 * Deploy the Web App as Execute as: Me, Who has access: Anyone.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.payload || p.callback) {
    return heinaApiOutput_(p.payload || '', p.callback || '');
  }
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Heina Suite')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return heinaPublicLanding_();
  }
}

function doPost(e) {
  var body = '';
  if (e && e.postData && e.postData.contents) body = String(e.postData.contents);
  else if (e && e.parameter && e.parameter.payload) body = String(e.parameter.payload);
  return heinaApiOutput_(body, '');
}

/**
 * @param {string} json
 * @param {string} callback JSONP callback name, or empty for JSON
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function heinaApiOutput_(json, callback) {
  var out;
  try {
    if (!json) throw new Error('缺少請求內容');
    out = { ok: true, result: unifiedApi(String(json)) };
  } catch (err) {
    out = { ok: false, error: err && err.message ? String(err.message) : String(err) };
  }
  var text = JSON.stringify(out);
  var cb = String(callback || '');
  if (cb) {
    if (!/^[A-Za-z_$][\w$]{0,63}$/.test(cb)) {
      text = JSON.stringify({ ok: false, error: 'invalid callback' });
      return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(cb + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function heinaPublicLanding_() {
  var url = heinaPagesUrl_();
  var safe = heinaEscapeHtml_(url);
  var body =
    '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Heina Suite</title></head>' +
    '<body style="font-family:system-ui,Segoe UI,Roboto,Noto Sans TC,sans-serif;margin:0;padding:24px;line-height:1.55;color:#111">' +
    '<h1 style="font-size:1.25rem;margin:0 0 12px">Heina 網站已改由 GitHub Pages 提供</h1>' +
    '<p style="margin:0 0 12px"><a href="' + safe + '">開啟顧客專區</a></p>' +
    '<p style="margin:0;color:#555;font-size:14px">這支 Web App 網址（結尾 /exec）是資料 API。請在網站設定 VITE_GAS_URL 指向它，並把管理密碼、查單預設密碼、銀行查詢密碼放在指令碼屬性，不要寫進程式。</p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(body)
    .setTitle('Heina Suite')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function heinaEscapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Actions a signed-out browser may call. Everything else needs an admin token. */
function heinaIsPublicAction_(mod, act) {
  if (mod === 'auth' && act === 'login') return true;
  if (mod === 'groupbuy') {
    if (act === 'customerLookup') return true;
    if (act === 'changeLookupPin') return true;
    if (act === 'submitPaymentReport') return true;
    if (act === 'listPublicGroups') return true;
    if (act === 'verifyBankViewerAccess') return true;
    if (act === 'publicBootstrap') return true;
    if (act === 'customerBalanceMemos') return true;
  }
  if (mod === 'preorder' && act === 'customerLookup') return true;
  if (mod === 'storefront' && act === 'getCatalog') return true;
  return false;
}

/**
 * Single RPC for the SPA.
 * @param {string} json JSON.stringify({ module, action, payload, adminToken? })
 * @return {*}
 */
function unifiedApi(json) {
  var req = JSON.parse(json);
  var mod = req.module;
  var act = req.action;
  var pl = req.payload;

  if (!heinaIsPublicAction_(mod, act)) {
    if (!heinaAdminTokenValid_(req.adminToken)) {
      throw new Error('需要管理員登入');
    }
  }

  if (mod === 'auth') {
    if (act === 'login') return heinaAdminLogin_(pl);
    if (act === 'changePassword') return heinaAdminChangePassword_(pl);
    if (act === 'session') return { ok: heinaAdminTokenValid_(req.adminToken) };
  }
  if (mod === 'groupbuy') {
    if (act === 'getAppData') return gb_fetchAllData_();
    if (act === 'saveAppData') return gb_performSave_(pl);
    if (act === 'saveBankJournal') return gb_saveBankJournal_(pl);
    if (act === 'syncPortalLookupCustomers') return gb_syncPortalLookupCustomers_(pl);
    if (act === 'changeLookupPin') return gb_changeLookupPin_(pl);
    if (act === 'customerLookup') return gb_customerLookup_(pl);
    if (act === 'submitPaymentReport') return gb_submitPaymentReport_(pl);
    if (act === 'confirmPaymentReport') return gb_confirmPaymentReport_(pl);
    if (act === 'deletePaymentReport') return gb_deletePaymentReport_(pl);
    if (act === 'revertPaymentReport') return gb_revertPaymentReport_(pl);
    if (act === 'updatePaymentReportLineFlags') return gb_updatePaymentReportLineFlags_(pl);
    if (act === 'supplementPaymentReport') return gb_supplementPaymentReport_(pl);
    if (act === 'listPublicGroups') return gb_publicGroupCatalog_();
    if (act === 'publicBootstrap') return gb_publicBootstrap_();
    if (act === 'customerBalanceMemos') return gb_customerBalanceMemos_(pl);
    if (act === 'getBankViewerAdmin') return gb_getBankViewerAdmin_();
    if (act === 'saveBankViewer') return gb_saveBankViewer_(pl);
    if (act === 'verifyBankViewerAccess') return gb_verifyBankViewerAccess_(pl);
    if (act === 'exportDataPack') return gb_exportDataPack_();
    if (act === 'importDataPack') return gb_importDataPack_(pl);
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
