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
