# Heina Suite

整合 **團購訂單**、**記帳**、**預購** 的前端 SPA，以及可佈署至同一本 Google 試算表綁定專案的 **Google Apps Script** 後端（`unifiedApi` 單一入口）。

## 本地開發

```bash
cd heina-suite
npm install
npm run dev
```

瀏覽器開啟終端機顯示的網址。未嵌入 GAS 時，資料寫入 `localStorage`（Mock 實作與後端 JSON 契約一致）。

## 正式建置（本機預覽 dist）

```bash
npm run build
npm run preview
```

## 部署給 Google Apps Script（推薦一鍵）

Apps Script 無法掛載 `dist/assets/*.js`，須使用**內嵌 JS/CSS 的單一 HTML** + 後端 `.gs`：

```bash
npm run deploy
```

會依序執行：`npm run build` → 路由／進貨／seed 檢查 → `build:gas`，產物寫入 **`deploy/apps-script-bundle/`**。

Windows 也可雙擊 **`deploy-gas.cmd`**。

僅重建 GAS 檔（略過全站 `tsc`，開發中慎用）：

```bash
npm run build:gas
```

產物：

- **`gas-web/index.html`** — 本機預覽用（`preview:ui`）。
- **`deploy/apps-script-bundle/index.html`** + **`Code.gs`** — 貼入 Apps Script 的兩個檔。
- **`deploy/apps-script-bundle/複製到AppsScript.txt`** — 逐步說明（含 `#/procurement` 等路由）。
- **`deploy/apps-script-bundle/deploy-manifest.json`** — 建置時間與檔案校驗（`npm run deploy` 產生）。

### 用 index.html 預覽（不接 GAS）

```bash
npm run build:gas
```

- **直接開檔**：用檔案總管雙擊 `gas-web/index.html`，或以瀏覽器開啟該路徑（與正式 Web App 相同為 Mock／localStorage）。
- **本機網址**：`npm run preview:ui`（先建置再啟動靜態伺服器），瀏覽器開 **http://localhost:4175/**（或 `/index.html`）。

開發中若要熱重載仍請使用 `npm run dev`（入口為根目錄的 `index.html`）。

### 部署步驟（clasp）

1. 安裝 [clasp](https://github.com/google/clasp) 並登入：`npm i -g clasp && clasp login`
2. 在試算表：**擴充功能 → Apps Script**，建立綁定該試算表的專案。
3. 在本機 `heina-suite/gas/` 內（或複製到別路徑）執行 `clasp clone <scriptId>` 取得 `.clasp.json`，或手動建立 `.clasp.json` 指向該 script。
4. 將 `gas/` 內所有 `.gs` 與 `appsscript.json` 同步到專案（`clasp push`）。
5. 執行 **`npm run deploy`**（或 `npm run build:gas`）後，將 **`deploy/apps-script-bundle/index.html`** 與 **`Code.gs`** 貼入 Apps Script：HTML 檔名 **`index`**，指令碼檔名自訂（`doGet` 見 `gas/Web.gs`）。亦可改用 `gas/*.gs` 以 clasp 同步，但仍須手動更新 HTML。
6. 部署：**部署 →新增部署作業→網頁應用程式**，存取身分建議「我」，執行身分「我」。
7. 重新開啟試算表後，使用選單 **Heina Suite → 初始化分頁** 建立缺少的工作表（見 `gas/OnOpen.gs`）。

### 試算表分頁

後端會依序建立／使用（若不存在則插入）：

| 分頁 | 用途 |
|------|------|
| `訂單明細` | 團購 24 欄扁平列 |
| `銀行日記帳` | 團購日記帳 |
| `系統設定` | Key-Value（匯率、Portal 文案與連結） |
| `行程` / `記帳明細` / `預設品項` / `設定` | 記帳模組 |
| `Groups` / `Orders` / `Items` | 預購正規化表 |

預購資料**只會**寫入上述三表，不會清除團購分頁。

## 顧客前台 + 現貨商城（同一 GAS 部署）

**預設入口仍是 `#/lookup` 顧客專區**（`#/` 會自動導向），查訂單／物流／行銷區塊與整合前相同。

| Hash 路由 | 用途 |
|-----------|------|
| `#/` → `#/lookup` | 完整顧客專區（主前台） |
| `#/portal` | 簡易訂單查詢（保留） |
| `#/shop` | 現貨商城（新增） |
| `#/home` | 活動／精選頁（選用） |
| `#/login` → `#/dashboard` | HelpMeBuy Pro 後台 |
| `#/procurement` 等 | 進貨（供應商、採購單、到貨、應付、退貨、對帳） |
| `#/integrations` | 試算表／開團 xlsx 匯入 |

後台 **現貨商城** → **發布至官網** 寫入試算表 `publicSpotCatalogJson`，`#/shop` 讀取同一目錄。

## 前端如何呼叫 GAS

在 Web App 內開啟時，`window.google.script.run` 存在，會自動改走 `unifiedApi(JSON.stringify({ module, action, payload }))`。

## 上架 Ready：資料線與碼倉線

兩條線分開，不要混用：

| 線 | 用途 | 怎麼做 |
|----|------|--------|
| **正式站／資料庫** | 客人查單、匯款查詢、團務對帳 | Apps Script Web App＋本試算表（`npm run deploy`） |
| **整理／備份** | 離線用 Excel 整理後匯回 | 後台 `#/integrations` →「上架 Ready：Sheets／Excel 資料包」 |
| **程式碼倉** | 版本與備份，**不當正式站** | GitHub Desktop → private repo |

### 資料包（HeinaDataPack）

下載／上傳的 `.xlsx` 對齊試算表分頁：

- `_meta`、`使用說明`
- `訂單明細`（與 `GB_HEADER` 一致）
- `銀行日記帳`
- `系統設定`（Key／Value；可能含敏感設定，勿外傳）
- `團務摘要`（閱讀用；匯入以訂單明細為準）

匯入模式：

- **merge**：以團 ID／日記帳 ID／設定 Key 合併
- **replace**：指定分頁整段覆寫（需二次確認）

API：`groupbuy/exportDataPack`、`groupbuy/importDataPack`。

### GitHub Desktop 上傳本機庫

倉庫根目錄請用 **`heina-suite`**（本資料夾），不要選上層「動漫情報系統」。

1. 本機已 `git init` 並有 `.gitignore`（略過 `node_modules/`、`dist/` 等）。
2. 開啟 **GitHub Desktop** → File → **Add local repository**
3. 選路徑：`…\動漫情報系統\heina-suite`
4. **Publish repository** → 勾選 **Keep this code private** → Publish
5. 之後：改碼 → Commit → Push；給客人仍用 Apps Script 部署

## 專案結構（摘要）

- `src/` — React + Router + 三模組頁面
- `src/adapters/mock.ts` — 本地 Mock
- `src/adapters/gas.ts` — `google.script.run` 橋接
- `src/daigou/heinaDataPack.ts` — Sheets／Excel 資料包編解碼
- `gas/*.gs` — 合併後端邏輯與 `unifiedApi` 分派
