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


