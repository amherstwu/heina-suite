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
