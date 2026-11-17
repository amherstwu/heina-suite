# Heina Suite

整合 **團購訂單**、**記帳**、**預購** 的前端 SPA，以及可佈署至同一本 Google 試算表綁定專案的 **Google Apps Script** 後端（`unifiedApi` 單一入口）。

## 正式網站（GitHub Pages）

前端改由 GitHub Pages 提供，預期網址：

**https://amherstwu.github.io/heina-suite/**

Apps Script Web App（網址結尾 `/exec`）只當資料 API。瀏覽器以 `Content-Type: text/plain` POST JSON（避免 CORS 預檢）；若 POST 被瀏覽器擋住，較小的要求會改走 JSONP GET。

1. 倉庫 Settings → Pages → Source 選 **GitHub Actions**。私人倉庫的 Pages 需要付費方案，否則把倉庫改成公開。
2. 部署 Web App：執行身分「我」、誰可以存取「任何人」。複製 `/exec` 網址。
3. GitHub → Settings → Secrets and variables → Actions → **Variables** → `VITE_GAS_URL` = 該網址。推上 `master`（或 `main`）會建置並部署。改網址後要重跑 workflow。
4. Apps Script → 專案設定 → **指令碼屬性**（不要寫進 Git）：
   - `HEINA_ADMIN_PASSWORD` 後台登入
   - `HEINA_LOOKUP_PIN` 四位數查單預設密碼（客人沒有個別密碼時）
   - `HEINA_BANK_PASSWORD` 匯款帳號查詢密碼
5. 把 `deploy/apps-script-bundle/Code.gs`（由目前 `gas/*.gs` 合併）貼上或 `clasp push`，然後**重新部署** Web App。

路由使用 hash（`#/lookup`、`#/shop`、`#/login`）。`public/404.html` 會把沒有 hash 的深連結轉回 hash，避免 GitHub Pages 的 404。

未設定 `VITE_GAS_URL` 時，網站只使用這台瀏覽器的預覽資料，畫面上會有提示。

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

- 嵌在 Apps Script 頁面裡、且 `window.google.script.run` 存在時，走 `google.script.run.unifiedApi`。
- GitHub Pages 設定了 `VITE_GAS_URL` 時，對 `/exec` 送 `text/plain` POST；失敗再試 JSONP。
- 兩者都沒有時使用本機 Mock（`localStorage`）。

管理 API 需要 `auth/login` 換到的 token。查單、開團目錄、商城目錄、付款回報、銀行帳號驗證維持公開。密碼不在前端原始碼裡。

## 上架 Ready：資料線與碼倉線

兩條線分開，不要混用：

| 線 | 用途 | 怎麼做 |
|----|------|--------|
| **正式站／資料庫** | 客人查單、匯款查詢、團務對帳 | Apps Script Web App＋本試算表（`npm run deploy`） |
| **整理／備份** | 離線用 Excel 整理後匯回 | 後台 `#/integrations` →「上架 Ready：Sheets／Excel 資料包」 |
| **程式碼倉／顧客網站** | 版本、以及 GitHub Pages 正式前台 | 推上 `master` 後由 Actions 部署 |

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
5. 之後：改碼 → Commit → Push。客人開 GitHub Pages；試算表仍是 Apps Script Web App。

## 專案結構（摘要）

- `src/` — React + Router + 三模組頁面
- `src/adapters/mock.ts` — 本地 Mock
- `src/adapters/gas.ts` — `google.script.run` 橋接
- `src/daigou/heinaDataPack.ts` — Sheets／Excel 資料包編解碼
- `gas/*.gs` — 合併後端邏輯與 `unifiedApi` 分派
