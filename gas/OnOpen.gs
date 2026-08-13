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

